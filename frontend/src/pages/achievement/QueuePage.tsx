import { listAchievements } from '../../api/achievements'
import { AchievementTable } from '../../components/AchievementTable'
import { PageHead } from '../../components/PageHead'
import { ErrorAlert, Loading } from '../../components/ui'
import { useLoad } from '../../lib/useLoad'

/**
 * Очереди маршрута ППС → РОП → директор (ТЗ 4.1):
 * review — «На проверке» у РОП, approval — «На утверждении» у директора.
 * Собственные результаты в очередь не попадают: самопроверка запрещена.
 */
export function QueuePage({ mode }: { mode: 'review' | 'approval' }) {
  const { data, error, loading, reload } = useLoad(() => listAchievements({ scope: mode }), mode)
  const review = mode === 'review'
  return (
    <>
      <PageHead
        title={review ? 'На проверке' : 'На утверждении'}
        lead={
          review
            ? 'Результаты сотрудников вашей образовательной программы и АУП: документы, дубли, авторство и расчёт доли.'
            : 'Проверенные РОП результаты и результаты самих РОП. В официальный итог входит только то, что вы утвердили.'
        }
      />
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && review && <AchievementTable items={data} empty="Очередь проверки пуста" />}
      {data && !review && (
        <>
          <section className="section">
            <h2>Утвердить</h2>
            <p className="muted">Проверка пройдена — нужно итоговое решение.</p>
            <AchievementTable items={data.filter((a) => a.status === 'REVIEWED')} empty="Нет проверенных результатов" />
          </section>
          <section className="section">
            <h2>Проверить результаты РОП</h2>
            <p className="muted">Заявитель сам РОП, поэтому данные проверяет директор. Утверждение — следующим отдельным решением.</p>
            <AchievementTable items={data.filter((a) => a.status === 'ON_REVIEW')} empty="Нет результатов РОП на проверке" />
          </section>
        </>
      )}
    </>
  )
}
