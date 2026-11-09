import { useSearchParams } from 'react-router'
import { listPeriods } from '../api/periods'
import type { PeriodDto } from '../api/types'
import { useLoad } from '../lib/useLoad'

/** Выбор отчётного периода; значение хранится в адресе, чтобы ссылкой можно было поделиться */
export function PeriodFilter({ current, filter }: { current?: PeriodDto; filter?: (p: PeriodDto) => boolean }) {
  const [params, setParams] = useSearchParams()
  const { data } = useLoad(listPeriods, 'periods')
  const periods = (data ?? []).filter(filter ?? (() => true))
  const value = params.get('periodId') ?? (current ? String(current.id) : '')

  return (
    <div className="field">
      <label className="field__label" htmlFor="period">
        Отчётный период
      </label>
      <select
        id="period"
        className="select"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params)
          if (e.target.value) next.set('periodId', e.target.value)
          else next.delete('periodId')
          setParams(next, { replace: true })
        }}
      >
        {/* Без текущего периода фильтр не применён: честно показываем «Все периоды» */}
        {!current && <option value="">Все периоды</option>}
        {current && !periods.some((p) => p.id === current.id) && <option value={current.id}>{current.name}</option>}
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.closed ? ' (закрыт)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
