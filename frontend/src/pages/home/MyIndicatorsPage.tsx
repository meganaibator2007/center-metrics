import { Link } from 'react-router'
import { myScores } from '../../api/scores'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { PeriodFilter } from '../../components/PeriodFilter'
import { usePeriodId } from '../../lib/usePeriodId'
import { EmptyRow, ErrorAlert, Loading, StatCard } from '../../components/ui'
import { fmt } from '../../lib/format'
import { ACCRUAL_LABEL, CATEGORY_FULL } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

/** Мои показатели (ТЗ 8.2): применимые показатели, утверждённые и ожидающие баллы */
export function MyIndicatorsPage() {
  const { user } = useAuth()
  const periodId = usePeriodId()
  const { data, error, loading, reload } = useLoad(() => myScores(periodId), `scores-${periodId}`)
  const categories = [...new Set((data?.rows ?? []).map((r) => r.category))]

  return (
    <>
      <PageHead
        title="Мои показатели"
        lead="Балл за коллективный результат делится поровну на всех авторов, включая внешних (ТЗ 6.1)."
        actions={
          <Link className="btn btn--primary" to="/my/achievements/new">
            Добавить достижение
          </Link>
        }
      />
      <div className="filters">
        <PeriodFilter current={data?.period} />
      </div>
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && (
        <>
          <div className="grid grid--3">
            <StatCard variant="accent" label="Утверждено" value={fmt(data.approvedTotal)} note="Официальный итог периода" />
            <StatCard label="На проверке и утверждении" value={fmt(data.onReviewTotal)} note="Предварительно" />
            <StatCard label="Введено, но не отправлено" value={fmt(data.enteredTotal)} />
          </div>
          {categories.map((category) => (
            <section className="section" key={category}>
              <h2>{CATEGORY_FULL[category]}</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Показатель</th>
                      <th scope="col">Начисление</th>
                      <th scope="col" className="num">
                        Балл B
                      </th>
                      <th scope="col" className="num">
                        Утверждено
                      </th>
                      <th scope="col" className="num">
                        На проверке
                      </th>
                      <th scope="col" className="num">
                        Черновики
                      </th>
                      <th scope="col" className="num">
                        Результатов
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows
                      .filter((r) => r.category === category)
                      .map((r) => (
                        <tr key={r.indicatorId}>
                          <td>
                            <strong>{r.indicatorCode}</strong>
                            <div className="cell-sub">{r.indicatorName}</div>
                          </td>
                          <td>{ACCRUAL_LABEL[r.accrualMethod]}</td>
                          <td className="num">{fmt(r.basePoints)}</td>
                          <td className="num">
                            <strong>{fmt(r.approved)}</strong>
                            {r.maxPoints !== null && <div className="cell-sub">макс. {fmt(r.maxPoints)}</div>}
                          </td>
                          <td className="num">{fmt(r.onReview)}</td>
                          <td className="num">{fmt(r.entered)}</td>
                          <td className="num">{r.count}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Итого</td>
                      <td className="num">{fmt(sum(data.rows.filter((r) => r.category === category).map((r) => r.approved)))}</td>
                      <td className="num">{fmt(sum(data.rows.filter((r) => r.category === category).map((r) => r.onReview)))}</td>
                      <td className="num">{fmt(sum(data.rows.filter((r) => r.category === category).map((r) => r.entered)))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ))}
          {data.rows.length === 0 && (
            <table className="table">
              <tbody>
                <EmptyRow colSpan={1}>Для ваших категорий оценки нет балльных показателей.</EmptyRow>
              </tbody>
            </table>
          )}
          {user?.categories.includes('ROP') && (
            <p>
              Целевые показатели РОП — на странице <Link to="/targets">«Цели РОП»</Link>.
            </p>
          )}
        </>
      )}
    </>
  )
}

function sum(values: number[]) {
  return Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100
}
