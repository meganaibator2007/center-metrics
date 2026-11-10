import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  checkDuplicates,
  createAchievement,
  getAchievement,
  joinAchievement,
  updateAchievement,
} from '../../api/achievements'
import { listIndicators } from '../../api/indicators'
import { listEmployees, listPrograms } from '../../api/org'
import { currentPeriod, listPeriods } from '../../api/periods'
import type {
  AchievementDto,
  AchievementRequest,
  DuplicateDto,
  IdentifierType,
  IndicatorDto,
  ParticipantRequest,
  PeriodDto,
  PersonShort,
  ProgramDto,
} from '../../api/types'
import { hasRole } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { Alert, Breadcrumbs, ErrorAlert, Field, Loading, Req } from '../../components/ui'
import { fieldErrors } from '../../lib/errors'
import { splitPoints } from '../../lib/calc'
import { fmt, fmtDate } from '../../lib/format'
import { ACCRUAL_LABEL, CATEGORY_FULL, IDENTIFIER_LABEL, STATUS } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

interface Coauthor extends ParticipantRequest {
  /** Ключ строки в списке, чтобы React не путал строки при удалении */
  key: number
}

interface FormState {
  ownerId: number | null
  basis: string
  indicatorId: string
  periodId: string
  title: string
  eventDate: string
  identifierType: IdentifierType | ''
  identifier: string
  programId: string
  discipline: string
  description: string
  coauthors: Coauthor[]
}

const EMPTY: FormState = {
  ownerId: null,
  basis: '',
  indicatorId: '',
  periodId: '',
  title: '',
  eventDate: '',
  identifierType: '',
  identifier: '',
  programId: '',
  discipline: '',
  description: '',
  coauthors: [],
}

let rowKey = 1

function fromDto(a: AchievementDto): FormState {
  return {
    // ownerId заполняется только при вводе за другого, иначе сервер потребует основание
    ownerId: a.enteredBy ? a.owner.id : null,
    basis: a.basis ?? '',
    indicatorId: String(a.indicatorId),
    periodId: String(a.periodId),
    title: a.title,
    eventDate: a.eventDate,
    identifierType: a.identifierType ?? '',
    identifier: a.identifier ?? '',
    programId: a.programId ? String(a.programId) : '',
    discipline: a.discipline ?? '',
    description: a.description ?? '',
    coauthors: a.participants
      .filter((p) => p.userId !== a.owner.id)
      .map((p) => ({ key: rowKey++, userId: p.userId, fullName: p.external ? p.fullName : null, weight: p.weight })),
  }
}

/** Регистрация и правка достижения (ФР-03): показатель, период, реквизиты, соавторы, проверка дублей */
/** Регистрация и правка достижения (ФР-03): показатель, период, реквизиты, соавторы, проверка дублей */
export function AchievementFormPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const indicators = useLoad(() => listIndicators({ evaluationType: 'POINTS', archived: false }), 'indicators-points')
  const periods = useLoad(listPeriods, 'periods')
  const programs = useLoad(listPrograms, 'programs')
  const employees = useLoad(listEmployees, 'employees')
  const existing = useLoad<AchievementDto | null>(() => (editId ? getAchievement(editId) : Promise.resolve(null)), `a-${editId}`)
  const current = useLoad(() => (editId ? Promise.resolve(null) : currentPeriod().catch(() => null)), `current-${editId}`)

  const loadError = indicators.error ?? periods.error ?? existing.error
  if (loadError) {
    return (
      <>
        <Breadcrumbs items={[{ to: '/my/achievements', label: 'Мои достижения' }, { label: editId ? 'Изменение' : 'Новое достижение' }]} />
        <PageHead title={editId ? 'Изменение достижения' : 'Новое достижение'} />
        <ErrorAlert error={loadError} />
      </>
    )
  }
  if (!indicators.data || !periods.data || existing.loading || current.loading) return <Loading />
  if (existing.data && !['DRAFT', 'RETURNED', 'REVISION'].includes(existing.data.status)) {
    return (
      <Alert kind="error" title="Достижение нельзя изменить">
        Статус «{STATUS[existing.data.status].label}»: карточка заблокирована. <Link to={`/achievements/${editId}`}>Вернуться к карточке</Link>
      </Alert>
    )
  }
  return (
    <AchievementForm
      key={editId ?? 'new'}
      editId={editId}
      existing={existing.data}
      initial={existing.data ? fromDto(existing.data) : { ...EMPTY, periodId: current.data ? String(current.data.id) : '' }}
      indicators={indicators.data}
      periods={periods.data}
      programs={programs.data ?? []}
      employees={employees.data ?? []}
    />
  )
}

interface FormProps {
  editId: number | null
  existing: AchievementDto | null
  initial: FormState
  indicators: IndicatorDto[]
  periods: PeriodDto[]
  programs: ProgramDto[]
  employees: PersonShort[]
}

function AchievementForm({ editId, existing, initial, indicators, periods, programs, employees }: FormProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(initial)
  const [error, setError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateDto[]>([])

  // Ввод за другого: админ или полномочие ENTER_FOR_OTHERS (ТЗ 2.2)
  const canEnterForOthers = hasRole(user, 'ADMIN') || !!user?.permissions.includes('ENTER_FOR_OTHERS')
  const selfEmployee = hasRole(user, 'EMPLOYEE')

  const indicator = indicators.find((i) => String(i.id) === form.indicatorId)
  const period = periods.find((p) => String(p.id) === form.periodId)
  const errors = fieldErrors(error)
  const shared = indicator?.accrualMethod === 'SHARED'
  const ownerName =
    form.ownerId === null ? user?.fullName : employees.find((e) => e.id === form.ownerId)?.fullName ?? 'Сотрудник'

  // Индикаторы по категориям сотрудника; при вводе за другого — все балльные
  const available = useMemo(() => {
    const all = (indicators).filter((i) => i.evaluationType === 'POINTS')
    if (form.ownerId !== null || !user) return all
    // Свои результаты — только по своим категориям; АУП вносит уполномоченный, если нет права самостоятельного ввода (ТЗ 4.2)
    return all.filter(
      (i) => user.categories.includes(i.category) && (i.category !== 'AUP' || user.permissions.includes('AUP_SELF_ENTRY')),
    )
  }, [indicators, form.ownerId, user])

  // Предварительный расчёт долей: окончательный делает сервер при утверждении
  const preview = useMemo(() => {
    if (!indicator?.basePoints) return []
    const people = [
      { name: ownerName ?? '', external: false, weight: 1 },
      ...(shared
        ? form.coauthors.map((c) => ({
            name: c.userId !== null ? (employees.find((e) => e.id === c.userId)?.fullName ?? '—') : c.fullName || 'Внешний соавтор',
            external: c.userId === null,
            weight: c.weight > 0 ? c.weight : 1,
          }))
        : []),
    ]
    const split = splitPoints(indicator.basePoints, indicator.coefficient, people.map((p) => p.weight))
    return people.map((p, i) => ({ ...p, ...split[i] }))
  }, [indicator, shared, form.coauthors, ownerName, employees])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    // Реквизиты поменялись — прежний результат проверки дублей больше не верен
    if (['indicatorId', 'title', 'eventDate', 'identifierType', 'identifier'].includes(key)) setDuplicates([])
  }

  function setCoauthor(key: number, patch: Partial<Coauthor>) {
    setForm((f) => ({ ...f, coauthors: f.coauthors.map((c) => (c.key === key ? { ...c, ...patch } : c)) }))
  }

  async function findDuplicates() {
    const identifier = form.identifierType ? form.identifier.trim() || null : null
    if (!form.indicatorId || (!identifier && !form.title.trim())) return
    try {
      const found = await checkDuplicates({
        indicatorId: Number(form.indicatorId),
        identifierType: identifier ? form.identifierType || null : null,
        identifier,
        title: form.title,
        eventDate: form.eventDate,
        excludeId: editId,
      })
      setDuplicates(found)
    } catch {
      // Проверка дублей — подсказка; при сохранении сервер всё равно проверит
    }
  }

  async function join(achievementId: number) {
    setError(null)
    try {
      await joinAchievement(achievementId)
      navigate(`/achievements/${achievementId}`, { state: { message: 'Вы добавлены в соавторы. Доли участников пересчитаны.' } })
    } catch (err) {
      setError(err)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    const body: AchievementRequest = {
      indicatorId: Number(form.indicatorId),
      periodId: Number(form.periodId),
      title: form.title,
      eventDate: form.eventDate,
      identifierType: form.identifierType || null,
      identifier: form.identifierType ? form.identifier : null,
      programId: indicator?.requiresProgram && form.programId ? Number(form.programId) : null,
      discipline: indicator?.requiresProgram ? form.discipline : null,
      description: form.description || null,
      coauthors: shared ? form.coauthors.map(({ userId, fullName, weight }) => ({ userId, fullName, weight })) : [],
      ownerId: form.ownerId,
      basis: form.ownerId !== null ? form.basis : null,
    }
    try {
      const saved = editId ? await updateAchievement(editId, body) : await createAchievement(body)
      navigate(`/achievements/${saved.id}`, {
        state: { message: editId ? 'Изменения сохранены.' : 'Черновик сохранён. Приложите подтверждающие документы и отправьте на проверку.' },
      })
    } catch (err) {
      setError(err)
      setSaving(false)
    }
  }

  const strict = duplicates.filter((d) => d.match === 'STRICT')
  const similar = duplicates.filter((d) => d.match === 'SIMILAR')
  // При пересмотре достижение может быть в закрытом периоде: показываем его, чтобы не подменить молча
  const openPeriods = periods.filter((p) => !p.closed || String(p.id) === form.periodId)

  return (
    <>
      <Breadcrumbs
        items={[
          { to: '/my/achievements', label: 'Мои достижения' },
          ...(editId ? [{ to: `/achievements/${editId}`, label: existing?.title ?? 'Достижение' }] : []),
          { label: editId ? 'Изменение' : 'Новое достижение' },
        ]}
      />
      <PageHead
        title={editId ? 'Изменение достижения' : 'Новое достижение'}
        lead="Сначала сохраните черновик, затем приложите документы и отправьте на проверку РОП."
      />

      {existing?.lastComment && (
        <Alert kind="error" title="Замечание проверяющего">
          {existing.lastComment}
        </Alert>
      )}
      {error && !Object.keys(errors).length ? <ErrorAlert error={error} /> : null}
      {Object.keys(errors).length > 0 && <Alert kind="error" title="Проверьте поля формы" />}

      <div className="grid grid--sidebar">
        <form className="form" onSubmit={handleSubmit} noValidate>
          {((canEnterForOthers && !editId) || form.ownerId !== null) && (
            <fieldset className="fieldset">
              <legend>Административный ввод</legend>
              <Field id="ownerId" label="Чей результат" hint="ТЗ 2.2: ввод за сотрудника фиксирует инициатора и основание">
                <select
                  id="ownerId"
                  className="select"
                  value={form.ownerId ?? ''}
                  disabled={!!editId}
                  onChange={(e) => set('ownerId', e.target.value ? Number(e.target.value) : null)}
                >
                  {selfEmployee && <option value="">Мой собственный</option>}
                  {!selfEmployee && <option value="">Выберите сотрудника</option>}
                  {(employees)
                    .filter((e) => e.id !== user?.id)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName}
                      </option>
                    ))}
                </select>
              </Field>
              {form.ownerId !== null && (
                <Field id="basis" label="Основание" required error={errors.basis} hint="Например: служебная записка РОП от 02.11.2026">
                  <input id="basis" className="input" value={form.basis} onChange={(e) => set('basis', e.target.value)} />
                </Field>
              )}
            </fieldset>
          )}

          <Field id="indicatorId" label="Показатель" required error={errors.indicatorId}>
            <select
              id="indicatorId"
              className="select"
              value={form.indicatorId}
              onChange={(e) => set('indicatorId', e.target.value)}
              aria-invalid={!!errors.indicatorId}
            >
              <option value="">Выберите показатель</option>
              {(['PPS', 'AUP'] as const).map((category) => {
                const items = available.filter((i) => i.category === category)
                return items.length === 0 ? null : (
                  <optgroup key={category} label={CATEGORY_FULL[category]}>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.code} · {i.name} — {fmt(i.basePoints)} б.
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </Field>
          {available.length === 0 && (
            <p className="field__hint">
              Для ваших категорий нет показателей, которые вы вносите сами. Результаты АУП вносит уполномоченный пользователь по данным
              РОП.
            </p>
          )}
          {indicator && (
            <p className="field__hint">
              Начисление: <strong>{ACCRUAL_LABEL[indicator.accrualMethod ?? 'INDIVIDUAL']}</strong>. Подтверждение: {indicator.evidence}
            </p>
          )}

          <div className="form-row">
            <Field id="periodId" label="Отчётный период" required error={errors.periodId}>
              <select id="periodId" className="select" value={form.periodId} onChange={(e) => set('periodId', e.target.value)}>
                {!form.periodId && <option value="">Выберите период</option>}
                {openPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.closed ? ' (закрыт)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="eventDate"
              label="Дата события"
              required
              error={errors.eventDate}
              hint={period ? `С ${fmtDate(period.startDate)} по ${fmtDate(period.endDate)}` : undefined}
            >
              <input
                id="eventDate"
                type="date"
                className="input"
                value={form.eventDate}
                min={period?.startDate}
                max={period?.endDate}
                onChange={(e) => set('eventDate', e.target.value)}
                onBlur={findDuplicates}
              />
            </Field>
          </div>

          <Field id="title" label="Наименование" required error={errors.title} hint="Название статьи, документа, мероприятия или договора">
            <input id="title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} onBlur={findDuplicates} />
          </Field>

          <div className="form-row">
            <Field id="identifierType" label="Идентификатор" hint="По нему система ищет повторы">
              <select
                id="identifierType"
                className="select"
                value={form.identifierType}
                onChange={(e) => set('identifierType', e.target.value as IdentifierType | '')}
              >
                <option value="">Нет</option>
                {(Object.keys(IDENTIFIER_LABEL) as IdentifierType[]).map((t) => (
                  <option key={t} value={t}>
                    {IDENTIFIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            {form.identifierType && (
              <Field id="identifier" label={IDENTIFIER_LABEL[form.identifierType]} required error={errors.identifier}>
                <input
                  id="identifier"
                  className="input"
                  value={form.identifier}
                  onChange={(e) => set('identifier', e.target.value)}
                  onBlur={findDuplicates}
                  placeholder={form.identifierType === 'DOI' ? '10.1145/…' : form.identifierType === 'URL' ? 'https://…' : 'Приказ № …'}
                />
              </Field>
            )}
          </div>

          {strict.length > 0 && (
            <Alert kind="error" title="Такое достижение уже зарегистрировано">
              <p>Повторная регистрация запрещена (ТЗ 5.2). Если вы соавтор — присоединитесь к существующей записи, доли пересчитаются.</p>
              <DuplicateList items={strict} onJoin={join} />
            </Alert>
          )}
          {similar.length > 0 && (
            <Alert title="Похожие записи в реестре">
              <p>Проверьте, не то же ли это достижение. Если да — присоединитесь к нему вместо создания нового.</p>
              <DuplicateList items={similar} onJoin={join} />
            </Alert>
          )}

          {indicator?.requiresProgram && (
            <div className="form-row">
              <Field id="programId" label="Образовательная программа" required error={errors.programId} hint="Только ОП топ-ИТ">
                <select id="programId" className="select" value={form.programId} onChange={(e) => set('programId', e.target.value)}>
                  <option value="">Выберите программу</option>
                  {(programs)
                    .filter((p) => p.topIt)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field id="discipline" label="Дисциплина учебного плана" required error={errors.discipline}>
                <input id="discipline" className="input" value={form.discipline} onChange={(e) => set('discipline', e.target.value)} />
              </Field>
            </div>
          )}

          <Field id="description" label="Описание">
            <textarea id="description" className="textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>

          {shared && (
            <fieldset className="fieldset">
              <legend>Соавторы</legend>
              <p className="field__hint">
                Укажите всех авторов, включая внешних: балл делится на всех, доли внешних никому не передаются. Вес участия меняйте,
                только если доли согласованы неравными.
              </p>
              {errors.coauthors && <p className="field__error">{errors.coauthors}</p>}
              {form.coauthors.map((c, index) => (
                <div className="form-row form-row--3" key={c.key}>
                  {c.userId !== null || c.fullName === null ? (
                    <Field id={`co-${c.key}`} label={`Соавтор ${index + 1}: сотрудник`}>
                      <select
                        id={`co-${c.key}`}
                        className="select"
                        value={c.userId ?? ''}
                        onChange={(e) => setCoauthor(c.key, { userId: e.target.value ? Number(e.target.value) : null, fullName: null })}
                      >
                        <option value="">Выберите сотрудника</option>
                        {(employees)
                          .filter((e) => e.id !== (form.ownerId ?? user?.id))
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.fullName}
                            </option>
                          ))}
                      </select>
                    </Field>
                  ) : (
                    <Field id={`co-${c.key}`} label={`Соавтор ${index + 1}: внешний`}>
                      <input
                        id={`co-${c.key}`}
                        className="input"
                        value={c.fullName}
                        placeholder="ФИО и организация"
                        onChange={(e) => setCoauthor(c.key, { fullName: e.target.value })}
                      />
                    </Field>
                  )}
                  <Field id={`w-${c.key}`} label="Вес участия">
                    <input
                      id={`w-${c.key}`}
                      type="number"
                      min={0.1}
                      step={0.1}
                      className="input"
                      value={c.weight}
                      onChange={(e) => setCoauthor(c.key, { weight: Number(e.target.value) })}
                    />
                  </Field>
                  <div className="field">
                    <span className="field__label" aria-hidden="true">
                      &nbsp;
                    </span>
                    <button
                      type="button"
                      className="btn btn--outline btn--small"
                      onClick={() => setForm((f) => ({ ...f, coauthors: f.coauthors.filter((x) => x.key !== c.key) }))}
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ))}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn--outline btn--small"
                  onClick={() => set('coauthors', [...form.coauthors, { key: rowKey++, userId: null, fullName: null, weight: 1 }])}
                >
                  + Сотрудник
                </button>
                <button
                  type="button"
                  className="btn btn--outline btn--small"
                  onClick={() => set('coauthors', [...form.coauthors, { key: rowKey++, userId: null, fullName: '', weight: 1 }])}
                >
                  + Внешний соавтор
                </button>
              </div>
            </fieldset>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving || strict.length > 0}>
              {saving ? 'Сохраняем…' : 'Сохранить черновик'}
            </button>
            <Link className="btn btn--outline" to={editId ? `/achievements/${editId}` : '/my/achievements'}>
              Отмена
            </Link>
          </div>
        </form>

        <aside className="card">
          <p className="card__title">Предварительный расчёт</p>
          {!indicator && <p className="muted">Выберите показатель — здесь появятся доли участников.</p>}
          {indicator && (
            <>
              <p className="muted">
                B = {fmt(indicator.basePoints)}, c = {fmt(indicator.coefficient)}, авторов N = {preview.length}
              </p>
              <dl className="kv">
                {preview.map((p, i) => (
                  <Fragment key={i}>
                    <dt>
                      {p.name}
                      {p.external ? ' (внешний)' : ''}
                    </dt>
                    <dd>{fmt(p.points)}</dd>
                  </Fragment>
                ))}
              </dl>
              <p className="field__hint">
                Bᵢ = B × c × wᵢ / Σw, округление методом наибольших остатков. Официальный балл — после утверждения директором.
              </p>
            </>
          )}
          <p className="field__hint">
            <Req /> — обязательное поле
          </p>
        </aside>
      </div>
    </>
  )
}

function DuplicateList({ items, onJoin }: { items: DuplicateDto[]; onJoin: (id: number) => void }) {
  return (
    <ul className="list-plain">
      {items.map((d) => (
        <li key={d.achievementId}>
          <Link to={`/achievements/${d.achievementId}`}>
            {d.indicatorCode} · {d.title}
          </Link>{' '}
          — {fmtDate(d.eventDate)}, {d.participants.join(', ')}, «{STATUS[d.status].label}».{' '}
          <button type="button" className="btn btn--small btn--secondary" onClick={() => onJoin(d.achievementId)}>
            Присоединиться как соавтор
          </button>
        </li>
      ))}
    </ul>
  )
}
