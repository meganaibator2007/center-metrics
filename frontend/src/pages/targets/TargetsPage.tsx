import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { listIndicators } from '../../api/indicators'
import { listPrograms } from '../../api/org'
import { listPeriods } from '../../api/periods'
import {
  approveMeasurement,
  createMeasurement,
  listMeasurements,
  returnMeasurement,
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

const EDITABLE = ['DRAFT', 'RETURNED']

/**
 * Целевые показатели РОП (ТЗ 6.3): план T, факт F (для процентов — числитель и знаменатель),
 * P = 100 × F / T, Δ = F − T. Значения РОП проверяет и утверждает директор (ТЗ 4.2).
 */
export function TargetsPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  // Цели РОП годовые: по умолчанию открытый год
  const periods = useLoad(listPeriods, 'periods')
  const years = (periods.data ?? []).filter((p) => p.type === 'YEAR')
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

  function actions(m: MeasurementDto) {
    const mineProgram = hasRole(user, 'ADMIN') || (user?.programIds.includes(m.programId) ?? false)
    return (
      <div className="cell-actions">
        {canEnter && mineProgram && EDITABLE.includes(m.status) && (
          <>
            <button type="button" className="btn btn--small btn--outline" onClick={() => setEditing(m)}>
              Изменить
            </button>
            <button type="button" className="btn btn--small btn--primary" onClick={() => act(() => submitMeasurement(m.id), 'Отправлено директору на утверждение.')}>
              На утверждение
            </button>
          </>
        )}
        {director && m.status === 'REVIEWED' && (
          <>
            <button type="button" className="btn btn--small btn--primary" onClick={() => act(() => approveMeasurement(m.id), 'Значение утверждено.')}>
              Утвердить
            </button>
            <button
              type="button"
              className="btn btn--small btn--outline"
              onClick={() => {
                const comment = window.prompt('Причина возврата')
                if (comment?.trim()) void act(() => returnMeasurement(m.id, comment.trim()), 'Возвращено на доработку.')
              }}
            >
              Вернуть
            </button>
          </>
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
        <PeriodFilter current={year} filter={(p) => p.type === 'YEAR'} />
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
  const [programId, setProgramId] = useState(initial ? String(initial.programId) : String(user?.programIds[0] ?? ''))
  const [value, setValue] = useState(initial?.value !== null && initial && !initial.percent ? String(initial.value) : '')
  const [numerator, setNumerator] = useState(initial?.numerator !== null && initial ? String(initial.numerator) : '')
  const [denominator, setDenominator] = useState(initial?.denominator !== null && initial ? String(initial.denominator) : '')
  const [source, setSource] = useState(initial?.source ?? '')
  const [error, setError] = useState<unknown>(null)
  const errors = fieldErrors(error)
  const indicator = indicators.data?.find((i) => String(i.id) === indicatorId)
  const myPrograms = (programs.data ?? []).filter((p) => p.topIt && (hasRole(user, 'ADMIN') || user?.programIds.includes(p.id)))

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const body: MeasurementRequest = {
      indicatorId: Number(indicatorId),
      periodId,
      programId: Number(programId),
      value: value === '' ? null : Number(value.replace(',', '.')),
      numerator: numerator === '' ? null : Number(numerator),
      denominator: denominator === '' ? null : Number(denominator),
      source: source || null,
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
        <Field id="m-program" label="Образовательная программа" required>
          <select id="m-program" className="select" value={programId} disabled={!!initial} onChange={(e) => setProgramId(e.target.value)}>
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
      <Field id="m-source" label="Источник данных" hint="Документ-основание: приказ, ведомость, отчёт">
        <input id="m-source" className="input" value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
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
