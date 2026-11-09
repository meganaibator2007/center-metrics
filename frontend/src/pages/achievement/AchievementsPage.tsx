import { Link, useSearchParams } from 'react-router'
import { listAchievements } from '../../api/achievements'
import { useAuth } from '../../auth/useAuth'
import { AchievementTable } from '../../components/AchievementTable'
import { PageHead } from '../../components/PageHead'
import { ErrorAlert, Loading, Tabs } from '../../components/ui'
import { useLoad } from '../../lib/useLoad'

/** Мои достижения (ТЗ, раздел 10): свои заявки и те, где я соавтор */
export function AchievementsPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const status = params.get('status') ?? ''
  const { data, error, loading, reload } = useLoad(() => listAchievements({ scope: 'my' }), 'my')
  const all = data ?? []
  const count = (s: string) => all.filter((a) => s.split(',').includes(a.status)).length
  const shown = status ? all.filter((a) => status.split(',').includes(a.status)) : all
  const admin = user && !user.roles.includes('EMPLOYEE')

  return (
    <>
      <PageHead
        title={admin ? 'Ввод результатов' : 'Мои достижения'}
        lead={
          admin
            ? 'Результаты, внесённые вами за сотрудников: административный ввод с основанием.'
            : 'Одно достижение регистрируется один раз и связывается со всеми соавторами.'
        }
        actions={
          <Link className="btn btn--primary" to="/my/achievements/new">
            Добавить достижение
          </Link>
        }
      />
      <Tabs
        param="status"
        tabs={[
          { value: '', label: `Все · ${all.length}` },
          { value: 'DRAFT,RETURNED,REVISION', label: `Нужно действие · ${count('DRAFT,RETURNED,REVISION')}` },
          { value: 'ON_REVIEW,REVIEWED', label: `На проверке · ${count('ON_REVIEW,REVIEWED')}` },
          { value: 'APPROVED', label: `Утверждено · ${count('APPROVED')}` },
          { value: 'REJECTED', label: `Отклонено · ${count('REJECTED')}` },
        ]}
      />
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && <AchievementTable items={shown} myId={admin ? undefined : user?.id} empty="Достижений пока нет" />}
    </>
  )
}
