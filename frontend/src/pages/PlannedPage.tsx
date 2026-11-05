import { PageHead } from '../components/PageHead'

interface PlannedPageProps {
  title: string
  /** Задачи, в которых делается экран */
  task: string
  /** Срок по плану до защиты */
  due: string
}

/** Временный экран: маршрут уже есть, сам экран переносится из прототипа */
export function PlannedPage({ title, task, due }: PlannedPageProps) {
  return (
    <>
      <PageHead title={title} lead="Экран переносится из статического прототипа." />
      <div className="alert">
        <p className="alert__title">В работе: {task}</p>
        <p>Срок по плану: {due}. Как экран должен выглядеть, видно в prototype/index.html.</p>
      </div>
    </>
  )
}
