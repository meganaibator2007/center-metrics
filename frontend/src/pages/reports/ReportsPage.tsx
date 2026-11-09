import { Link, useSearchParams } from 'react-router'
import { listAchievements } from '../../api/achievements'
import { fileUrl, useMock } from '../../api/client'
import { listIndicators } from '../../api/indicators'
import { listEmployees, query } from '../../api/org'
import { directorDashboard, userScores } from '../../api/scores'
import { hasRole } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { AchievementTable } from '../../components/AchievementTable'
import { PageHead } from '../../components/PageHead'
import { PeriodFilter } from '../../components/PeriodFilter'
import { usePeriodId } from '../../lib/usePeriodId'
import { ErrorAlert, Loading, StatCard, Tabs } from '../../components/ui'
import { fmt } from '../../lib/format'
import { ACCRUAL_LABEL, CATEGORY_FULL, STATUS } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'
import { TargetsTable } from '../home/DirectorDashboard'

/**
 * Стандартные отчёты первого этапа (ТЗ 9.1): на экране и выгрузкой в XLSX.
 * XLSX формирует сервер по тем же параметрам, что в адресе страницы.
 */
export function ReportsPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const manager = hasRole(user, 'DIRECTOR', 'ADMIN', 'REVIEWER')
  const type = manager ? (params.get('type') ?? 'individual') : 'individual'

  return (
    <>
      <PageHead
        title="Отчёты"
        lead="Период, показатели, факты, начисления и доли, статусы и даты решений."
      />
      {manager && (
        <Tabs
          param="type"
          tabs={[
            { value: '', label: 'Сотрудник' },
            { value: 'category', label: 'Свод по категории' },
            { value: 'program', label: 'Свод по программе' },
            { value: 'indicator', label: 'По показателю' },
            { value: 'approval', label: 'Состояние согласования' },
          ]}
        />
      )}
      {type === 'individual' && <IndividualReport />}
      {type === 'category' && <CategoryReport />}
      {type === 'program' && <ProgramReport />}
      {type === 'indicator' && <IndicatorReport />}
      {type === 'approval' && <ApprovalReport />}
    </>
  )
}

/**
 * Выгрузка в XLSX с теми параметрами, по которым построен отчёт на экране,
 * а не с тем, что случайно лежит в адресе (значения по умолчанию в адресе не хранятся)
 */
function XlsxLink({ type, params }: { type: string; params: Record<string, string | number | undefined | null> }) {
  if (useMock) return <p className="muted">XLSX формирует сервер: в режиме заглушек выгрузки нет.</p>
  return (
    <a className="btn btn--outline" href={fileUrl(`/reports/${type}.xlsx${query(params)}`)} download>
      Скачать XLSX
    </a>
  )
}

function useParam(name: string): [string, (value: string) => void] {
  const [params, setParams] = useSearchParams()
  return [
    params.get(name) ?? '',
    (value) => {
      const next = new URLSearchParams(params)
      if (value) next.set(name, value)
      else next.delete(name)
      setParams(next, { replace: true })
    },
  ]
}

function IndividualReport() {
  const { user } = useAuth()
  const manager = hasRole(user, 'DIRECTOR', 'ADMIN', 'REVIEWER')
  const [userParam, setUser] = useParam('userId')
  const employees = useLoad(() => (manager ? listEmployees() : Promise.resolve([])), 'employees')
  const userId = Number(userParam || (manager ? (employees.data?.[0]?.id ?? 0) : user?.id))
  const periodId = usePeriodId()
  const scores = useLoad(() => (userId ? userScores(userId, periodId) : Promise.resolve(null)), `us-${userId}-${periodId}`)
  const items = useLoad(() => (userId ? listAchievements({ scope: 'registry', userId, periodId }) : Promise.resolve([])), `ua-${userId}-${periodId}`)

  return (
    <>
      <div className="filters">
        {manager && (
          <div className="field">
            <label className="field__label" htmlFor="userId">
              Сотрудник
            </label>
            <select id="userId" className="select" value={userId || ''} onChange={(e) => setUser(e.target.value)}>
              {(employees.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
        <PeriodFilter current={scores.data?.period} />
        <XlsxLink type="individual" params={{ userId, periodId: scores.data?.period.id }} />
      </div>
      {scores.error ? <ErrorAlert error={scores.error} /> : null}
      {scores.loading && !scores.data && <Loading />}
      {scores.data && (
        <>
          <div className="grid grid--3">
            <StatCard variant="accent" label="Утверждено" value={fmt(scores.data.approvedTotal)} />
            <StatCard label="На проверке и утверждении" value={fmt(scores.data.onReviewTotal)} />
            <StatCard label="Введено, не отправлено" value={fmt(scores.data.enteredTotal)} />
          </div>
          <div className="table-wrap section">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Показатель</th>
                  <th scope="col">Начисление</th>
                  <th scope="col" className="num">
                    Утверждено
                  </th>
                  <th scope="col" className="num">
                    Предварительно
                  </th>
                  <th scope="col" className="num">
                    Результатов
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.data.rows
                  .filter((r) => r.count > 0)
                  .map((r) => (
                    <tr key={r.indicatorId}>
                      <td>
                        <strong>{r.indicatorCode}</strong>
                        <div className="cell-sub">{r.indicatorName}</div>
                      </td>
                      <td>{ACCRUAL_LABEL[r.accrualMethod]}</td>
                      <td className="num">{fmt(r.approved)}</td>
                      <td className="num">{fmt(r.onReview + r.entered)}</td>
                      <td className="num">{r.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {items.data && (
        <section className="section">
          <h2>Достижения за период</h2>
          <AchievementTable items={items.data} myId={userId} empty="Нет достижений за период" />
        </section>
      )}
    </>
  )
}

function CategoryReport() {
  const periodId = usePeriodId()
  const [category, setCategory] = useParam('category')
  const { data, error, loading } = useLoad(() => directorDashboard(periodId), `cat-${periodId}`)
  const current = (category || 'PPS') as 'PPS' | 'AUP' | 'ROP'
  return (
    <>
      <div className="filters">
        <div className="field">
          <label className="field__label" htmlFor="category">
            Категория
          </label>
          <select id="category" className="select" value={current} onChange={(e) => setCategory(e.target.value)}>
            {(['PPS', 'AUP', 'ROP'] as const).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_FULL[c]}
              </option>
            ))}
          </select>
        </div>
        <PeriodFilter current={data?.period} />
        <XlsxLink type="category" params={{ category: current, periodId: data?.period.id }} />
      </div>
      {error ? <ErrorAlert error={error} /> : null}
      {loading && !data && <Loading />}
      {data && current === 'ROP' && <TargetsTable rows={data.rop} />}
      {data && current !== 'ROP' && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Показатель</th>
                <th scope="col" className="num">
                  Утверждено
                </th>
                <th scope="col" className="num">
                  Предварительно
                </th>
                <th scope="col" className="num">
                  Утверждённых результатов
                </th>
              </tr>
            </thead>
            <tbody>
              {(current === 'PPS' ? data.pps.byIndicator : data.aup.byIndicator).map((r) => (
                <tr key={r.code}>
                  <td>
                    <Link to={`/reports?type=indicator&code=${r.code}&periodId=${data.period.id}`}>{r.code}</Link>
                    <div className="cell-sub">{r.name}</div>
                  </td>
                  <td className="num">{fmt(r.approved)}</td>
                  <td className="num">{fmt(r.pending)}</td>
                  <td className="num">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && current === 'PPS' && (
        <section className="section">
          <h2>Сотрудники ППС</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Сотрудник</th>
                  <th scope="col" className="num">
                    Утверждено
                  </th>
                  <th scope="col" className="num">
                    Предварительно
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pps.byEmployee.map((p) => (
                  <tr key={p.userId}>
                    <td>
                      <Link to={`/reports?userId=${p.userId}&periodId=${data.period.id}`}>{p.fullName}</Link>
                      <div className="cell-sub">{p.departmentName}</div>
                    </td>
                    <td className="num">{fmt(p.approved)}</td>
                    <td className="num">{fmt(p.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}

function ProgramReport() {
  const periodId = usePeriodId()
  const { data, error, loading } = useLoad(() => directorDashboard(periodId), `prog-${periodId}`)
  return (
    <>
      <div className="filters">
        <PeriodFilter current={data?.period} />
        <XlsxLink type="program" params={{ periodId: data?.period.id }} />
      </div>
      {error ? <ErrorAlert error={error} /> : null}
      {loading && !data && <Loading />}
      {data &&
        data.pps.byProgram.map((p) => (
          <section className="section" key={p.programId}>
            <h2>{p.programName}</h2>
            <p>
              Утверждено баллов ППС: <strong>{fmt(p.approved)}</strong>
            </p>
            <TargetsTable rows={data.rop.filter((m) => m.programId === p.programId)} />
          </section>
        ))}
    </>
  )
}

function IndicatorReport() {
  const periodId = usePeriodId()
  const [indicatorParam, setIndicator] = useParam('indicatorId')
  const [code] = useParam('code')
  const indicators = useLoad(() => listIndicators({ evaluationType: 'POINTS' }), 'ind-points')
  // indicatorId по контракту; code — из ссылок свода по категории
  const indicator =
    indicators.data?.find((i) => String(i.id) === indicatorParam) ?? indicators.data?.find((i) => i.code === code) ?? indicators.data?.[0]
  const items = useLoad(
    () => (indicator ? listAchievements({ scope: 'registry', indicatorId: indicator.id, periodId }) : Promise.resolve([])),
    `ind-${indicator?.id}-${periodId}`,
  )
  return (
    <>
      <div className="filters">
        <div className="field field--grow">
          <label className="field__label" htmlFor="code">
            Показатель
          </label>
          <select id="code" className="select" value={indicator?.id ?? ''} onChange={(e) => setIndicator(e.target.value)}>
            {(indicators.data ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.code} · {i.name}
              </option>
            ))}
          </select>
        </div>
        <PeriodFilter />
        <XlsxLink type="indicator" params={{ indicatorId: indicator?.id, periodId }} />
      </div>
      {items.error ? <ErrorAlert error={items.error} /> : null}
      {items.data && <AchievementTable items={items.data} empty="По показателю нет результатов" />}
    </>
  )
}

function ApprovalReport() {
  const periodId = usePeriodId()
  const { data, error, loading } = useLoad(() => listAchievements({ scope: 'registry', periodId }), `appr-${periodId}`)
  const counts = Object.entries(STATUS).map(([status, s]) => ({ status, label: s.label, n: (data ?? []).filter((a) => a.status === status).length }))
  return (
    <>
      <div className="filters">
        <PeriodFilter />
        <XlsxLink type="approval" params={{ periodId }} />
      </div>
      {error ? <ErrorAlert error={error} /> : null}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="grid grid--4">
            {counts
              .filter((c) => c.n > 0)
              .map((c) => (
                <StatCard key={c.status} label={c.label} value={c.n} />
              ))}
          </div>
          <section className="section">
            <AchievementTable items={data} empty="Нет результатов" />
          </section>
        </>
      )}
    </>
  )
}
