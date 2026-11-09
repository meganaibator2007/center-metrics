import { PageHead } from '../../components/PageHead'
import { DirectorHome } from '../home/HomePage'

/** Аналитика (раздел 10): срезы ППС, АУП, РОП, динамика и отклонения */
export function AnalyticsPage() {
  return (
    <>
      <PageHead title="Аналитика" lead="Утверждённые и предварительные значения показаны раздельно (ТЗ 8.3)." />
      <DirectorHome />
    </>
  )
}
