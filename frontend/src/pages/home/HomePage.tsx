import { Link } from 'react-router'
import { listAchievements } from '../../api/achievements'
import { directorDashboard, myScores } from '../../api/scores'
import type { UserDto } from '../../api/types'
import { hasRole } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { PeriodFilter } from '../../components/PeriodFilter'
import { usePeriodId } from '../../lib/usePeriodId'
import { ErrorAlert, Loading, StatCard, StatusBadge } from '../../components/ui'
import { fmt, fmtDate, plural } from '../../lib/format'
import { CATEGORY_LABEL } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'
import { DirectorDashboard } from './DirectorDashboard'

/** Главная: персональная или управленческая сводка по ролям пользователя (ТЗ 8.1, 8.2, раздел 10) */
export function HomePage() {
  const { user } = useAuth()
  if (!user) return null
  const lead = [user.position, user.departmentName].filter(Boolean).join(' · ')
  return (
    <>
      <PageHead title={`Здравствуйте, ${user.firstName}${user.middleName ? ` ${user.middleName}` : ''}`} lead={lead} />
      {hasRole(user, 'DIRECTOR') && <DirectorHome />}
      {hasRole(user, 'REVIEWER') && <ReviewerHome />}
      {hasRole(user, 'EMPLOYEE') && <EmployeeHome user={user} />}
      {hasRole(user, 'ADMIN') && <AdminHome />}
    </>
  )
}

export function DirectorHome() {
  const periodId = usePeriodId()
  const { data, error, loading, reload } = useLoad(() => directorDashboard(periodId), `dash-${periodId}`)
  return (
    <>
      <div className="filters">
        <PeriodFilter current={data?.period} />
      </div>
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && <DirectorDashboard data={data} />}
    </>
  )
}

function ReviewerHome() {
  const queue = useLoad(() => listAchievements({ scope: 'review' }), 'review-queue')
  const count = queue.data?.length ?? 0
  return (
    <section className="section">
      <div className="section__head">
        <h2>Проверка результатов вашей программы</h2>
        <Link className="btn btn--primary btn--arrow" to="/review">
          Открыть очередь
        </Link>
      </div>
      {queue.error ? <ErrorAlert error={queue.error} onRetry={queue.reload} /> : null}
      <div className="grid grid--3">
        <StatCard variant="accent" label="Ждут вашей проверки" value={queue.loading ? '…' : count} note={`${plural(count, ['результат', 'результата', 'результатов'])} ППС и АУП`} />
        <StatCard label="Целевые показатели" value={<Link to="/targets">Внести факт</Link>} note="План, факт и процент по вашей ОП" />
        <StatCard label="Свои результаты" value="Директору" note="Ваши достижения проверяет и утверждает директор" />
      </div>
    </section>
  )
}

function EmployeeHome({ user }: { user: UserDto }) {
  const periodId = usePeriodId()
  const scores = useLoad(() => myScores(periodId), `scores-${periodId}`)
  const mine = useLoad(() => listAchievements({ scope: 'my' }), 'my-achievements')
  const todo = (mine.data ?? []).filter((a) => a.status === 'RETURNED' || a.status === 'DRAFT' || a.status === 'REVISION')
  const pointsCategories = user.categories.filter((c) => c !== 'ROP')

  return (
    <section className="section">
      <div className="section__head">
        <h2>Мои результаты{pointsCategories.length > 0 ? ` (${pointsCategories.map((c) => CATEGORY_LABEL[c]).join(', ')})` : ''}</h2>
        <Link className="btn btn--primary" to="/my/achievements/new">
          Добавить достижение
        </Link>
      </div>
      <div className="filters">
        <PeriodFilter current={scores.data?.period} />
      </div>
      {scores.error ? <ErrorAlert error={scores.error} onRetry={scores.reload} /> : null}
      {scores.data && (
        <div className="grid grid--3">
          <StatCard variant="accent" label="Утверждено баллов" value={fmt(scores.data.approvedTotal)} note="Официальный итог: только решения директора" />
          <StatCard label="На проверке и утверждении" value={fmt(scores.data.onReviewTotal)} note="Предварительно, в итог пока не входит" />
          <StatCard label="Введено, но не отправлено" value={fmt(scores.data.enteredTotal)} note="Черновики и возвращённые" />
        </div>
      )}

      <div className="section">
        <div className="section__head">
          <h3>Требуют вашего действия</h3>
          <Link className="link-arrow" to="/my/achievements">
            Все мои достижения
          </Link>
        </div>
        {mine.loading && !mine.data && <Loading />}
        {mine.data && todo.length === 0 && <p className="muted">Всё отправлено — ждём решения проверяющих.</p>}
        {todo.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Достижение</th>
                  <th scope="col">Дата</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Замечание</th>
                </tr>
              </thead>
              <tbody>
                {todo.map((a) => (
                  <tr key={a.id} className={a.status === 'RETURNED' ? 'row--warning' : undefined}>
                    <td>
                      <Link to={`/achievements/${a.id}`}>{a.title}</Link>
                      <div className="cell-sub">
                        {a.indicatorCode} · {a.periodName}
                      </div>
                    </td>
                    <td className="nowrap">{fmtDate(a.eventDate)}</td>
                    <td>
                      <StatusBadge status={a.status} reviewer={a.reviewer} />
                    </td>
                    <td>{a.lastComment ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function AdminHome() {
  const links = [
    { to: '/admin/users', title: 'Сотрудники и роли', text: 'Учётные записи, роли, категории оценки, программы' },
    { to: '/admin/indicators', title: 'Справочник показателей', text: 'ППС, АУП, РОП; редакции и архив' },
    { to: '/admin/periods', title: 'Отчётные периоды', text: 'Открытие, закрытие, санкционированное переоткрытие' },
    { to: '/my/achievements/new', title: 'Административный ввод', text: 'Результаты АУП по данным РОП, с основанием' },
    { to: '/admin/import', title: 'Импорт XLSX', text: 'Сотрудники, справочник, факты, достижения' },
    { to: '/admin/audit', title: 'Журнал аудита', text: 'Кто, когда и что изменил' },
  ]
  return (
    <section className="section">
      <h2>Администрирование</h2>
      <div className="grid grid--3">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="card card--outline">
            <p className="card__title">{l.title}</p>
            <p className="muted">{l.text}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
