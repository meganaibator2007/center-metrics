import type { ReactNode } from 'react'

interface PageHeadProps {
  title: string
  lead?: ReactNode
  /** Кнопки справа от заголовка */
  actions?: ReactNode
}

/** Заголовок страницы с подзаголовком и кнопками */
export function PageHead({ title, lead, actions }: PageHeadProps) {
  return (
    <div className="page-head">
      <title>{`${title} — Показатели эффективности`}</title>
      <div>
        <h1>{title}</h1>
        {lead && <p className="page-head__lead">{lead}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  )
}
