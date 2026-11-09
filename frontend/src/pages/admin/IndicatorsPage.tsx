import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { createIndicator, getIndicator, indicatorVersions, listIndicators, toggleArchive, updateIndicator } from '../../api/indicators'
import type { AccrualMethod, AchievementType, Category, IndicatorDto, IndicatorRequest, TargetDirection } from '../../api/types'
import { PageHead } from '../../components/PageHead'
import { Alert, Badge, Breadcrumbs, ErrorAlert, Field, Loading, Tabs } from '../../components/ui'
import { fieldErrors } from '../../lib/errors'
import { fmt, fmtDate } from '../../lib/format'
import { ACCRUAL_LABEL, ACHIEVEMENT_TYPE_LABEL, CATEGORY_FULL, CATEGORY_LABEL } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

/** Справочник показателей (ФР-02): правила хранятся как данные, изменение создаёт новую редакцию */
export function IndicatorsPage() {
  const [params] = useSearchParams()
  const category = (params.get('category') as Category | null) ?? 'PPS'
  const { data, error, loading, reload } = useLoad(() => listIndicators({ category }), `ind-${category}`)
  const [actionError, setActionError] = useState<unknown>(null)

  async function archive(i: IndicatorDto) {
    setActionError(null)
    try {
      await toggleArchive(i.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <>
      <PageHead
        title="Справочник показателей"
        lead="Из «Порядка начисления баллов». Утверждённые результаты считаются по своей редакции и не меняются."
        actions={
          <Link className="btn btn--primary" to="/admin/indicators/new">
            Добавить показатель
          </Link>
        }
      />
      <Tabs param="category" tabs={(['PPS', 'AUP', 'ROP'] as const).map((c) => ({ value: c === 'PPS' ? '' : c, label: CATEGORY_LABEL[c] }))} />
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Код</th>
                <th scope="col">Показатель</th>
                <th scope="col">{category === 'ROP' ? 'Цель' : 'Начисление'}</th>
                <th scope="col" className="num">
                  {category === 'ROP' ? 'План' : 'Балл B'}
                </th>
                <th scope="col" className="num">
                  Ред.
                </th>
                <th scope="col">Статус</th>
                <th scope="col">
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.code}</strong>
                  </td>
                  <td>
                    {i.name}
                    <div className="cell-sub">{i.evidence}</div>
                  </td>
                  <td>{i.evaluationType === 'TARGET' ? (i.direction === 'AT_MOST' ? 'не более' : 'не менее') : ACCRUAL_LABEL[i.accrualMethod ?? 'INDIVIDUAL']}</td>
                  <td className="num">
                    {i.evaluationType === 'TARGET' ? `${fmt(i.targetValue)} ${i.unit}` : fmt(i.basePoints)}
                    {i.maxPoints !== null && <div className="cell-sub">макс. {fmt(i.maxPoints)}</div>}
                  </td>
                  <td className="num">{i.version}</td>
                  <td>{i.archived ? <Badge kind="closed">В архиве</Badge> : <Badge kind="open">Действует</Badge>}</td>
                  <td>
                    <div className="cell-actions">
                      <Link className="btn btn--small btn--outline" to={`/admin/indicators/${i.id}`}>
                        Изменить
                      </Link>
                      <button type="button" className="btn btn--small btn--outline" onClick={() => archive(i)}>
                        {i.archived ? 'Вернуть' : 'В архив'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export function IndicatorFormPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const existing = useLoad<IndicatorDto | null>(() => (editId ? getIndicator(editId) : Promise.resolve(null)), `indicator-${editId}`)
  if (existing.loading) return <Loading />
  if (existing.error) return <ErrorAlert error={existing.error} />
  return <IndicatorForm key={editId ?? 'new'} initial={existing.data} />
}

function IndicatorForm({ initial }: { initial: IndicatorDto | null }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<IndicatorRequest>({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    category: initial?.category ?? 'PPS',
    evaluationType: initial?.evaluationType ?? 'POINTS',
    unit: initial?.unit ?? 'шт.',
    basePoints: initial?.basePoints ?? null,
    accrualMethod: initial?.accrualMethod ?? 'INDIVIDUAL',
    achievementType: initial?.achievementType ?? null,
    targetValue: initial?.targetValue ?? null,
    percent: initial?.percent ?? false,
    direction: initial?.direction ?? 'AT_LEAST',
    coefficient: initial?.coefficient ?? 1,
    maxPoints: initial?.maxPoints ?? null,
    maxRepeats: initial?.maxRepeats ?? null,
    requiresProgram: initial?.requiresProgram ?? false,
    evidence: initial?.evidence ?? '',
    methodology: initial?.methodology ?? null,
    required: initial?.required ?? false,
    evidenceRequired: initial?.evidenceRequired ?? true,
    validFrom: null,
  })
  const [error, setError] = useState<unknown>(null)
  const errors = fieldErrors(error)
  // Тип оценки следует из категории: ППС и АУП — баллы, РОП — целевые значения (ТЗ 1.3, п. 5)
  const points = form.category !== 'ROP'
  const num = (v: string) => (v === '' ? null : Number(v.replace(',', '.')))

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // Поля другого типа очищаем: сервер проверяет это ограничением ind_indicator_version_fields_ck
    const body: IndicatorRequest = points
      ? { ...form, evaluationType: 'POINTS', targetValue: null, direction: null, percent: false }
      : { ...form, evaluationType: 'TARGET', basePoints: null, accrualMethod: null, achievementType: null }
    try {
      if (initial) await updateIndicator(initial.id, body)
      else await createIndicator(body)
      navigate(`/admin/indicators${form.category === 'PPS' ? '' : `?category=${form.category}`}`)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ to: '/admin/indicators', label: 'Справочник показателей' }, { label: initial ? initial.code : 'Новый показатель' }]} />
      <PageHead
        title={initial ? `${initial.code}: изменение` : 'Новый показатель'}
        lead={initial ? `Сохранение создаст редакцию ${initial.version + 1}; утверждённые результаты останутся по прежней.` : undefined}
      />
      {error && !Object.keys(errors).length ? <ErrorAlert error={error} /> : null}
      <form className="form" onSubmit={save} noValidate>
        <div className="form-row form-row--3">
          <Field id="code" label="Код" required error={errors.code}>
            <input id="code" className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field id="category" label="Категория оценки" required error={errors.evaluationType} hint={points ? 'Тип оценки: баллы' : 'Тип оценки: целевое значение'}>
            <select id="category" className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              {(['PPS', 'AUP', 'ROP'] as const).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_FULL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="unit" label="Единица измерения">
            <input id="unit" className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
        </div>
        <Field id="name" label="Полное наименование" required error={errors.name}>
          <textarea id="name" className="textarea" rows={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        {points ? (
          <>
            <div className="form-row form-row--3">
              <Field id="basePoints" label="Базовый балл B" required error={errors.basePoints}>
                <input id="basePoints" type="number" step="any" className="input" value={form.basePoints ?? ''} onChange={(e) => setForm({ ...form, basePoints: num(e.target.value) })} />
              </Field>
              <Field id="accrual" label="Порядок начисления" required>
                <select id="accrual" className="select" value={form.accrualMethod ?? 'INDIVIDUAL'} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value as AccrualMethod })}>
                  <option value="INDIVIDUAL">Индивидуально</option>
                  <option value="SHARED">На всех авторов</option>
                </select>
              </Field>
              <Field id="achievementType" label="Вид достижения" required error={errors.achievementType} hint="По нему ищутся повторы">
                <select
                  id="achievementType"
                  className="select"
                  value={form.achievementType ?? ''}
                  onChange={(e) => setForm({ ...form, achievementType: (e.target.value || null) as AchievementType | null })}
                >
                  <option value="">Выберите вид</option>
                  {(Object.keys(ACHIEVEMENT_TYPE_LABEL) as AchievementType[]).map((t) => (
                    <option key={t} value={t}>
                      {ACHIEVEMENT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row form-row--3">
              <Field id="coefficient" label="Коэффициент c" error={errors.coefficient} hint="По умолчанию 1 (ТЗ 6.2)">
                <input id="coefficient" type="number" step="any" className="input" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: Number(e.target.value) })} />
              </Field>
              <Field id="maxPoints" label="Максимум за период" hint="Пусто — без ограничения">
                <input id="maxPoints" type="number" step="any" className="input" value={form.maxPoints ?? ''} onChange={(e) => setForm({ ...form, maxPoints: num(e.target.value) })} />
              </Field>
              <Field id="maxRepeats" label="Допустимое число повторений" hint="Пусто — без ограничения">
                <input id="maxRepeats" type="number" min={1} className="input" value={form.maxRepeats ?? ''} onChange={(e) => setForm({ ...form, maxRepeats: num(e.target.value) })} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <div className="form-row form-row--3">
              <Field id="targetValue" label="Целевое значение T" required error={errors.targetValue}>
                <input id="targetValue" type="number" step="any" className="input" value={form.targetValue ?? ''} onChange={(e) => setForm({ ...form, targetValue: num(e.target.value) })} />
              </Field>
              <Field id="direction" label="Сравнение">
                <select id="direction" className="select" value={form.direction ?? 'AT_LEAST'} onChange={(e) => setForm({ ...form, direction: e.target.value as TargetDirection })}>
                  <option value="AT_LEAST">Не менее</option>
                  <option value="AT_MOST">Не более</option>
                </select>
              </Field>
              <label className="check">
                <input type="checkbox" checked={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.checked })} />
                Процент: числитель / знаменатель
              </label>
            </div>
            <Field id="methodology" label="Методика" hint="Что в числителе и знаменателе, шкала, источник данных">
              <textarea id="methodology" className="textarea" rows={2} value={form.methodology ?? ''} onChange={(e) => setForm({ ...form, methodology: e.target.value || null })} />
            </Field>
          </>
        )}
        <Field id="evidence" label="Подтверждающие документы">
          <textarea id="evidence" className="textarea" rows={2} value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} />
        </Field>
        <div className="check-group">
          <label className="check">
            <input type="checkbox" checked={form.requiresProgram} onChange={(e) => setForm({ ...form, requiresProgram: e.target.checked })} />
            Только дисциплины учебного плана ОП топ-ИТ
          </label>
          <label className="check">
            <input type="checkbox" checked={form.evidenceRequired} onChange={(e) => setForm({ ...form, evidenceRequired: e.target.checked })} />
            Без документа не отправить на проверку
          </label>
          <label className="check">
            <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
            Обязательный показатель
          </label>
        </div>
        {initial && (
          <Field id="validFrom" label="Новая редакция действует с" hint="Пусто — с сегодняшнего дня">
            <input id="validFrom" type="date" className="input" value={form.validFrom ?? ''} onChange={(e) => setForm({ ...form, validFrom: e.target.value || null })} />
          </Field>
        )}
        {Object.keys(errors).length > 0 && <Alert kind="error" title="Проверьте поля формы" />}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Сохранить
          </button>
          <Link className="btn btn--outline" to="/admin/indicators">
            Отмена
          </Link>
        </div>
      </form>
      {initial && <Versions id={initial.id} />}
    </>
  )
}

/** История редакций (ТЗ 3.2): утверждённые результаты считаются по своей редакции */
function Versions({ id }: { id: number }) {
  const { data } = useLoad(() => indicatorVersions(id), `versions-${id}`)
  if (!data) return null
  return (
    <section className="section">
      <h2>Редакции</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" className="num">
                Ред.
              </th>
              <th scope="col">Действует</th>
              <th scope="col" className="num">
                B или T
              </th>
              <th scope="col">Наименование</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.version}>
                <td className="num">{v.version}</td>
                <td className="nowrap">
                  с {fmtDate(v.validFrom)}
                  {v.validTo ? ` по ${fmtDate(v.validTo)}` : ''}
                </td>
                <td className="num">{fmt(v.basePoints ?? v.targetValue)}</td>
                <td>{v.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
