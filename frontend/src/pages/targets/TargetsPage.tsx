import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { listIndicators } from '../../api/indicators'
import { listPrograms } from '../../api/org'
import { listPeriods } from '../../api/periods'
import {
  approveMeasurement,
  createMeasurement,
  listMeasurements,
  rejectMeasurement,
  returnMeasurement,
  reviewMeasurement,
  revisionMeasurement,
  submitMeasurement,
  updateMeasurement,
} from '../../api/scores'
import type { MeasurementDto, MeasurementRequest } from '../../api/types'
import { hasRole } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { PeriodFilter } from '../../components/PeriodFilter'
import { Alert, ErrorAlert, Field, Loading } from '../../components/ui'
import { errorText, fieldErrors } from '../../lib/errors'
import { fmt } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'
import { TargetsTable } from '../home/DirectorDashboard'

const EDITABLE = ['DRAFT', 'RETURNED', 'REVISION']

/**
 * Целевые показатели РОП (ТЗ 6.3): план T, факт F (для процентов — числитель и знаменатель),
 * P = 100 × F / T, Δ = F − T. Значения РОП проверяет и утверждает директор (ТЗ 4.2).
 */
export function TargetsPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  // Цели РОП годовые: по умолчанию открытый год
  const periods = useLoad(listPeriods, 'periods')
  const years = (periods.data ?? []).filter((p) => p.type === 'YEAR' || p.type === 'ACADEMIC_YEAR')
  const year = years.find((p) => !p.closed) ?? years[0]
  const periodId = params.get('periodId') ? Number(params.get('periodId')) : year?.id
  const programId = params.get('programId') ? Number(params.get('programId')) : undefined
  const { data, error, loading, reload } = useLoad(
    () => (periodId ? listMeasurements(periodId, programId) : Promise.resolve([])),
    `m-${periodId}-${programId}`,
  )
  const [editing, setEditing] = useState<MeasurementDto | 'new' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const director = hasRole(user, 'DIRECTOR')
  const canEnter = hasRole(user, 'REVIEWER', 'ADMIN')

  async function act(action: () => Promise<unknown>, done: string) {
    setActionError(null)
    try {
      await action()
      setMessage(done)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  function ask(label: string, action: (comment: string) => Promise<unknown>, done: string) {
    const comment = window.prompt(label)
    if (comment?.trim()) void act(() => action(comment.trim()), done)
  }

  // Маршрут значения РОП (ТЗ 4.2): РОП отправляет → директор проверяет данные → директор утверждает
  function actions(m: MeasurementDto) {
    const mineProgram = hasRole(user, 'ADMIN') || (user?.reviewProgramIds.includes(m.programId) ?? false)
    return (
      <div className="cell-actions">
        {canEnter && mineProgram && EDITABLE.includes(m.status) && (
          <>
            <button type="button" className="btn btn--small btn--outline" onClick={() => setEditing(m)}>
              Изменить
            </button>
            <button type="button" className="btn btn--small btn--primary" onClick={() => act(() => submitMeasurement(m.id), 'Отправлено директору на проверку.')}>
              Директору
            </button>
          </>
        )}
        {director && m.status === 'ON_REVIEW' && (
          <button type="button" className="btn btn--small btn--primary" onClick={() => act(() => reviewMeasurement(m.id), 'Данные проверены, значение ждёт утверждения.')}>
            Проверено
          </button>
        )}
        {director && m.status === 'REVIEWED' && (
          <button type="button" className="btn btn--small btn--primary" onClick={() => act(() => approveMeasurement(m.id), 'Значение утверждено.')}>
            Утвердить
          </button>
        )}
        {director && (m.status === 'ON_REVIEW' || m.status === 'REVIEWED') && (
          <>
            <button type="button" className="btn btn--small btn--outline" onClick={() => ask('Причина возврата', (c) => returnMeasurement(m.id, c), 'Возвращено на доработку.')}>
              Вернуть
            </button>
            <button type="button" className="btn btn--small btn--danger" onClick={() => ask('Причина отклонения', (c) => rejectMeasurement(m.id, c), 'Отклонено.')}>
              Отклонить
            </button>
          </>
        )}
        {director && m.status === 'APPROVED' && (
          <button
            type="button"
            className="btn btn--small btn--outline"
            onClick={() => ask('Что исправить (новая версия значения)', (c) => revisionMeasurement(m.id, c), 'Значение открыто для исправления.')}
          >
            На исправление
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <PageHead
        title="Целевые показатели РОП"
        lead="План и факт по образовательным программам. Значения выше 100 % — перевыполнение; красная зона — цель не достигнута."
        actions={
          canEnter &&
          periodId && (
            <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
              Внести значение
            </button>
          )
        }
      />
      <div className="filters">
        <PeriodFilter current={year} filter={(p) => p.type === 'YEAR' || p.type === 'ACADEMIC_YEAR'} />
        <ProgramFilter />
      </div>
      {message && <Alert kind="success" title={message} />}
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {editing && periodId && (
        <MeasurementForm
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          periodId={periodId}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setMessage('Значение сохранено как черновик. Отправьте его директору на утверждение.')
            reload()
          }}
        />
      )}
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && <TargetsTable rows={data} actions={actions} />}
      <p className="field__hint">
        Для процентных показателей факт F = 100 × числитель / знаменатель; при знаменателе 0 — «недостаточно данных». Единый рейтинг
        трёх категорий не считается: у РОП нет баллов (ТЗ 6.3).
      </p>
    </>
  )
}

function ProgramFilter() {
  const [params, setParams] = useSearchParams()
  const { data } = useLoad(listPrograms, 'programs')
  return (
    <div className="field">
      <label className="field__label" htmlFor="programId">
        Программа
      </label>
      <select
        id="programId"
        className="select"
        value={params.get('programId') ?? ''}
        onChange={(e) => {
          const next = new URLSearchParams(params)
          if (e.target.value) next.set('programId', e.target.value)
          else next.delete('programId')
          setParams(next, { replace: true })
        }}
      >
        <option value="">Все доступные</option>
        {(data ?? [])
          .filter((p) => p.topIt)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} {p.name}
            </option>
          ))}
      </select>
    </div>
  )
}

interface FormProps {
  initial: MeasurementDto | null
  periodId: number
  onCancel: () => void
  onSaved: () => void
}

function MeasurementForm({ initial, periodId, onCancel, onSaved }: FormProps) {
  const { user } = useAuth()
  const indicators = useLoad(() => listIndicators({ evaluationType: 'TARGET', archived: false }), 'targets')
  const programs = useLoad(listPrograms, 'programs')
  const [indicatorId, setIndicatorId] = useState(initial ? String(initial.indicatorId) : '')
  const [programId, setProgramId] = useState(initial ? String(initial.programId) : user?.reviewProgramIds.length === 1 ? String(user.reviewProgramIds[0]) : '')
  const [value, setValue] = useState(initial?.value !== null && initial && !initial.percent ? String(initial.value) : '')
  const [numerator, setNumerator] = useState(initial?.numerator !== null && initial ? String(initial.numerator) : '')
  const [denominator, setDenominator] = useState(initial?.denominator !== null && initial ? String(initial.denominator) : '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [scale, setScale] = useState(initial?.scale ?? '')
  const [documentBasis, setDocumentBasis] = useState(initial?.documentBasis ?? '')
  const [error, setError] = useState<unknown>(null)
  const errors = fieldErrors(error)
  const indicator = indicators.data?.find((i) => String(i.id) === indicatorId)
  const myPrograms = (programs.data ?? []).filter((p) => p.topIt && (hasRole(user, 'ADMIN') || user?.reviewProgramIds.includes(p.id)))

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const body: MeasurementRequest = {
      indicatorId: Number(indicatorId),
      periodId,
      programId: programId ? Number(programId) : 0,
      value: value === '' ? null : Number(value.replace(',', '.')),
      numerator: numerator === '' ? null : Number(numerator),
      denominator: denominator === '' ? null : Number(denominator),
      source: source || null,
      scale: scale || null,
      documentBasis: documentBasis || null,
    }
    try {
      if (initial) await updateMeasurement(initial.id, body)
      else await createMeasurement(body)
      onSaved()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form className="card form section" onSubmit={save} noValidate>
      <p className="card__title">{initial ? `Изменение: ${initial.indicatorCode}` : 'Новое значение целевого показателя'}</p>
      {error && !Object.keys(errors).length ? <Alert kind="error" title={errorText(error)} /> : null}
      <div className="form-row">
        <Field id="m-indicator" label="Показатель" required error={errors.indicatorId}>
          <select id="m-indicator" className="select" value={indicatorId} disabled={!!initial} onChange={(e) => setIndicatorId(e.target.value)}>
            <option value="">Выберите показатель</option>
            {(indicators.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} · {i.name} (цель {fmt(i.targetValue)} {i.unit})
              </option>
            ))}
          </select>
        </Field>
        <Field id="m-program" label="Образовательная программа" required error={errors.programId}>
          <select id="m-program" className="select" value={programId} disabled={!!initial} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">Выберите программу</option>
            {myPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {indicator?.percent ? (
        <div className="form-row">
          <Field id="m-num" label="Числитель A" required error={errors.numerator} hint="Например, сколько студентов прошли аттестацию">
            <input id="m-num" type="number" min={0} className="input" value={numerator} onChange={(e) => setNumerator(e.target.value)} />
          </Field>
          <Field id="m-den" label="Знаменатель D" required error={errors.denominator} hint="Например, сколько всего студентов">
            <input id="m-den" type="number" min={0} className="input" value={denominator} onChange={(e) => setDenominator(e.target.value)} />
          </Field>
        </div>
      ) : (
        <Field id="m-value" label={`Факт${indicator ? `, ${indicator.unit}` : ''}`} required error={errors.value}>
          <input id="m-value" type="number" min={0} step="any" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
      )}
      {indicator?.methodology && <p className="field__hint">Методика: {indicator.methodology}</p>}
      <div className="form-row form-row--3">
        <Field id="m-source" label="Источник данных" hint="Ведомость, анкетирование, отчёт">
          <input id="m-source" className="input" value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field id="m-basis" label="Документ-основание" hint="Номер и дата приказа или протокола">
          <input id="m-basis" className="input" value={documentBasis} onChange={(e) => setDocumentBasis(e.target.value)} />
        </Field>
        <Field id="m-scale" label="Шкала" hint="Для удовлетворённости: например, 1–5">
          <input id="m-scale" className="input" value={scale} onChange={(e) => setScale(e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn--primary">
          Сохранить
        </button>
        <button type="button" className="btn btn--outline" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  )
}
