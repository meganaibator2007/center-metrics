import { useSearchParams } from 'react-router'
import { listAudit } from '../../api/scores'
import { PageHead } from '../../components/PageHead'
import { EmptyRow, ErrorAlert, Loading } from '../../components/ui'
import { fmtDateTime } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'

/** Журнал аудита (ТЗ 1.3, п. 6; раздел 12): кто, когда, что изменил и на каком основании */
export function AuditPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 0)
  const { data, error, loading, reload } = useLoad(() => listAudit(page), `audit-${page}`)
  return (
    <>
      <PageHead title="Журнал аудита" lead="Решения, изменения справочников и периодов, административный ввод." />
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Когда</th>
                  <th scope="col">Кто</th>
                  <th scope="col">Действие</th>
                  <th scope="col">Объект</th>
                  <th scope="col">Основание</th>
                </tr>
              </thead>
              <tbody>
                {data.content.length === 0 && <EmptyRow colSpan={5}>Записей пока нет: здесь появятся действия пользователей</EmptyRow>}
                {data.content.map((e) => (
                  <tr key={e.id}>
                    <td className="nowrap">{fmtDateTime(e.at)}</td>
                    <td>{e.actor}</td>
                    <td>{e.action}</td>
                    <td>{e.object}</td>
                    <td>{e.comment ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.page.totalPages > 1 && (
            <div className="form-actions">
              <button type="button" className="btn btn--small btn--outline" disabled={page === 0} onClick={() => setParams({ page: String(page - 1) })}>
                Назад
              </button>
              <span className="muted">
                {page + 1} из {data.page.totalPages}
              </span>
              <button type="button" className="btn btn--small btn--outline" disabled={page + 1 >= data.page.totalPages} onClick={() => setParams({ page: String(page + 1) })}>
                Дальше
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
