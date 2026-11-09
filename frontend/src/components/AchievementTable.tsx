import { Link } from 'react-router'
import type { AchievementDto } from '../api/types'
import { fmt, fmtDate } from '../lib/format'
import { EmptyRow, StatusBadge } from './ui'

/** Таблица достижений: мои, очередь проверки, реестр. myId — чью долю показывать в колонке «Мой балл» */
export function AchievementTable({ items, myId, empty }: { items: AchievementDto[]; myId?: number; empty: string }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Достижение</th>
            <th scope="col">Показатель</th>
            <th scope="col">Дата</th>
            <th scope="col">Участники</th>
            <th scope="col" className="num">
              {myId ? 'Мой балл' : 'Балл B'}
            </th>
            <th scope="col">Статус</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && <EmptyRow colSpan={6}>{empty}</EmptyRow>}
          {items.map((a) => {
            const mine = myId ? a.participants.find((p) => p.userId === myId) : undefined
            const external = a.participants.filter((p) => p.external).length
            return (
              <tr key={a.id} className={a.status === 'RETURNED' ? 'row--warning' : undefined}>
                <td>
                  <Link to={`/achievements/${a.id}`}>{a.title}</Link>
                  <div className="cell-sub">
                    Заявитель: {a.owner.fullName}
                    {a.enteredBy ? ` · ввёл ${a.enteredBy}` : ''}
                  </div>
                </td>
                <td>
                  <strong>{a.indicatorCode}</strong>
                  <div className="cell-sub">{a.periodName}</div>
                </td>
                <td className="nowrap">{fmtDate(a.eventDate)}</td>
                <td>
                  {a.participants.length}
                  {external > 0 && <div className="cell-sub">из них внешних: {external}</div>}
                </td>
                <td className="num">
                  <strong>{mine ? fmt(mine.points) : fmt(a.basePoints)}</strong>
                  {mine && a.participants.length > 1 && <div className="cell-sub">из {fmt(a.basePoints)}</div>}
                </td>
                <td>
                  <StatusBadge status={a.status} reviewer={a.reviewer} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
