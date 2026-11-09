import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { DirectorDashboardDto, IndicatorSlice, MeasurementDto } from '../../api/types'
import { Badge, StatCard, StatusBadge } from '../../components/ui'
import { fmt, fmtDate } from '../../lib/format'

/**
 * Управленческий дашборд директора (ТЗ 8.1): ППС, АУП и РОП на одном экране,
 * утверждённые и предварительные значения всегда раздельно.
 */
export function DirectorDashboard({ data }: { data: DirectorDashboardDto }) {
  const { pps, aup, rop, signals } = data
  const maxDynamics = Math.max(1, ...pps.dynamics.map((d) => d.approved))
  return (
    <>
      <section className="section">
        <h2>Сигналы</h2>
        <div className="grid grid--4">
          <StatCard variant="accent" label="Ждут вашего решения" value={signals.awaitingApproval} note={<Link to="/approval">Очередь на утверждение</Link>} />
          <StatCard label="На проверке у РОП" value={signals.onReview} note="Ещё не дошли до директора" />
          <StatCard label="Цели РОП не достигнуты" value={signals.deviations} note="Красная зона в таблице ниже" />
          <StatCard label="Период закрывается" value={fmtDate(signals.periodEnd)} note={data.period.name} />
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>ППС — профессорско-преподавательский состав</h2>
        </div>
        <div className="grid grid--4">
          <StatCard variant="navy" label="Утверждено баллов" value={fmt(pps.approvedPoints)} note={`${pps.approvedResults} утверждённых результатов`} />
          <StatCard label="Предварительно" value={fmt(pps.pendingPoints)} note="На проверке и утверждении, в итог не входит" />
          <StatCard label="Сотрудников ППС" value={pps.employees} />
          <StatCard label="Доля в проверке" value={`${fmt(pps.onReviewShare)} %`} note="От отправленных результатов" />
        </div>
        <div className="grid grid--2 section">
          <SliceTable title="По показателям" rows={pps.byIndicator} />
          <div>
            <h3>По сотрудникам</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Сотрудник</th>
                    <th scope="col" className="num">Утверждено</th>
                    <th scope="col" className="num">Предварительно</th>
                  </tr>
                </thead>
                <tbody>
                  {pps.byEmployee.map((p) => (
                    <tr key={p.userId}>
                      <td>
                        <Link to={`/reports?type=individual&userId=${p.userId}&periodId=${data.period.id}`}>{p.fullName}</Link>
                        <div className="cell-sub">{p.departmentName}</div>
                      </td>
                      <td className="num">
                        <strong>{fmt(p.approved)}</strong>
                      </td>
                      <td className="num">{fmt(p.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="grid grid--2 section">
          <div>
            <h3>По образовательным программам</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Программа</th>
                    <th scope="col" className="num">Утверждено</th>
                  </tr>
                </thead>
                <tbody>
                  {pps.byProgram.map((p) => (
                    <tr key={p.programId}>
                      <td>{p.programName}</td>
                      <td className="num">{fmt(p.approved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3>Динамика утверждённых баллов</h3>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {pps.dynamics.map((d) => (
                    <tr key={d.periodName}>
                      <td>{d.periodName}</td>
                      <td>
                        <progress className="progress" value={d.approved} max={maxDynamics}>
                          {fmt(d.approved)}
                        </progress>
                      </td>
                      <td className="num">{fmt(d.approved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>АУП — административно-управленческий персонал</h2>
        <div className="grid grid--4">
          <StatCard variant="navy" label="Утверждено баллов" value={fmt(aup.approvedPoints)} />
          <StatCard label="Предварительно" value={fmt(aup.pendingPoints)} note="В итог не входит" />
          <StatCard label="Сотрудников АУП" value={aup.employees} />
          <StatCard label="Без утверждения" value={aup.unconfirmed} note="Результаты в работе" />
        </div>
        <div className="section">
          <SliceTable title="Выполнение показателей АУП" rows={aup.byIndicator} />
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>РОП — целевые показатели</h2>
          <Link className="link-arrow" to="/targets">
            Все цели РОП
          </Link>
        </div>
        <TargetsTable rows={rop} />
      </section>
    </>
  )
}

function SliceTable({ title, rows }: { title: string; rows: IndicatorSlice[] }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Показатель</th>
              <th scope="col" className="num">Утверждено</th>
              <th scope="col" className="num">Предварительно</th>
              <th scope="col" className="num">Результатов</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code}>
                <td>
                  <strong>{r.code}</strong>
                  <div className="cell-sub">{r.name}</div>
                </td>
                <td className="num">
                  <strong>{fmt(r.approved)}</strong>
                </td>
                <td className="num">{fmt(r.pending)}</td>
                <td className="num">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** План, факт, процент, отклонение; невыполненные цели — красная зона */
export function TargetsTable({ rows, actions }: { rows: MeasurementDto[]; actions?: (m: MeasurementDto) => ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Показатель</th>
            <th scope="col">Программа</th>
            <th scope="col" className="num">План</th>
            <th scope="col" className="num">Факт</th>
            <th scope="col" className="num">Выполнение</th>
            <th scope="col" className="num">Отклонение</th>
            <th scope="col">Цель</th>
            <th scope="col">Статус</th>
            {actions && (
              <th scope="col">
                <span className="visually-hidden">Действия</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={actions ? 9 : 8} className="muted">
                Значений за период пока нет
              </td>
            </tr>
          )}
          {rows.map((m) => (
            <tr key={m.id} className={m.achieved === false ? 'row--warning' : undefined}>
              <td>
                <strong>{m.indicatorCode}</strong>
                <div className="cell-sub">{m.indicatorName}</div>
              </td>
              <td>{m.programName}</td>
              <td className="num">
                {m.direction === 'AT_MOST' ? '≤ ' : '≥ '}
                {fmt(m.target)} {m.unit}
              </td>
              <td className="num">
                {m.value === null ? 'нет данных' : `${fmt(m.value)} ${m.unit}`}
                {m.percent && m.denominator !== null && (
                  <div className="cell-sub">
                    {fmt(m.numerator)} из {fmt(m.denominator)}
                  </div>
                )}
              </td>
              <td className="num">{m.achievementPercent === null ? '—' : `${fmt(m.achievementPercent)} %`}</td>
              <td className="num">{m.deviation === null ? '—' : `${m.deviation > 0 ? '+' : ''}${fmt(m.deviation)}`}</td>
              <td>
                {m.achieved === null ? (
                  <Badge kind="none">Недостаточно данных</Badge>
                ) : m.achieved ? (
                  <Badge kind="accepted">Достигнута</Badge>
                ) : (
                  <Badge kind="returned">Не достигнута</Badge>
                )}
              </td>
              <td>
                <StatusBadge status={m.status} />
              </td>
              {actions && <td>{actions(m)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
