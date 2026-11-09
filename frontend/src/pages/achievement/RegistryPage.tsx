import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { listAchievements } from '../../api/achievements'
import type { Category } from '../../api/types'
import { AchievementTable } from '../../components/AchievementTable'
import { PageHead } from '../../components/PageHead'
import { PeriodFilter } from '../../components/PeriodFilter'
import { ErrorAlert, Loading } from '../../components/ui'
import { CATEGORY_LABEL, STATUS } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

/** Реестр результатов (ТЗ 5.1, раздел 10): единый поиск достижений и участников в пределах доступа */
export function RegistryPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const filter = {
    scope: 'registry' as const,
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    category: (params.get('category') as Category | null) ?? undefined,
    periodId: params.get('periodId') ? Number(params.get('periodId')) : undefined,
  }
  const { data, error, loading, reload } = useLoad(() => listAchievements(filter), JSON.stringify(filter))

  function set(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  function search(event: FormEvent) {
    event.preventDefault()
    set('q', q.trim())
  }

  return (
    <>
      <PageHead title="Реестр результатов" lead="Поиск по названию, DOI, номеру документа и ФИО участника." />
      <form className="filters" onSubmit={search} role="search">
        <div className="field field--grow">
          <label className="field__label" htmlFor="q">
            Поиск
          </label>
          <input id="q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="DOI, название, ФИО" />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="category">
            Категория
          </label>
          <select id="category" className="select" value={filter.category ?? ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">Все</option>
            {(['PPS', 'AUP'] as const).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="status">
            Статус
          </label>
          <select id="status" className="select" value={filter.status ?? ''} onChange={(e) => set('status', e.target.value)}>
            <option value="">Все</option>
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <PeriodFilter />
        <button type="submit" className="btn btn--primary">
          Найти
        </button>
      </form>
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && <AchievementTable items={data} empty="Ничего не найдено" />}
    </>
  )
}
