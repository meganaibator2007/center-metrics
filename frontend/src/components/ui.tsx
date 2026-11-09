// Мелкие повторяющиеся куски интерфейса. Классы — из стилей прототипа (main.css).

import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { ResultStatus } from '../api/types'
import { errorText } from '../lib/errors'
import { STATUS } from '../lib/labels'

export function Badge({ kind, plain = false, children }: { kind?: string; plain?: boolean; children: ReactNode }) {
  const classes = ['badge', kind && `badge--${kind}`, plain && 'badge--plain'].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}

/** Статус результата; если заявитель — РОП, его проверяет директор (ТЗ 2.2) */
export function StatusBadge({ status, reviewer }: { status: ResultStatus; reviewer?: 'ROP' | 'DIRECTOR' }) {
  const label = status === 'ON_REVIEW' && reviewer === 'DIRECTOR' ? 'На проверке у директора' : STATUS[status].label
  return <Badge kind={STATUS[status].badge}>{label}</Badge>
}

/** Звёздочка обязательного поля */
export function Req() {
  return (
    <span className="req-mark" title="Обязательно">
      *
    </span>
  )
}

export function Alert({
  kind,
  title,
  children,
}: {
  kind?: 'error' | 'success'
  title?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className={['alert', kind && `alert--${kind}`].filter(Boolean).join(' ')} role={kind === 'error' ? 'alert' : 'status'}>
      {title && <p className="alert__title">{title}</p>}
      {children && <div>{children}</div>}
    </div>
  )
}

export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert kind="error" title="Не удалось выполнить запрос">
      <p>{errorText(error)}</p>
      {onRetry && (
        <p>
          <button type="button" className="btn btn--small btn--outline" onClick={onRetry}>
            Повторить
          </button>
        </p>
      )}
    </Alert>
  )
}

export function Loading() {
  return (
    <p className="muted" role="status">
      Загрузка…
    </p>
  )
}

interface FieldProps {
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string
  children: ReactNode
}

/** Поле формы: подпись, элемент ввода, подсказка и ошибка от сервера */
export function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label} {required && <Req />}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
      {error && (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  )
}

export function StatCard({
  label,
  value,
  of,
  note,
  variant,
}: {
  label: string
  value: ReactNode
  of?: ReactNode
  note?: ReactNode
  variant?: 'accent' | 'navy' | 'outline'
}) {
  return (
    <section className={variant ? `card card--${variant}` : 'card'}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">
        {value} {of !== undefined && <small>из {of}</small>}
      </p>
      {note && <p className="stat__note">{note}</p>}
    </section>
  )
}

export function Breadcrumbs({ items }: { items: Array<{ to?: string; label: string }> }) {
  return (
    <ol className="breadcrumbs" aria-label="Навигационная цепочка">
      {items.map((item) =>
        item.to ? (
          <li key={item.label}>
            <Link to={item.to}>{item.label}</Link>
          </li>
        ) : (
          <li key={item.label} aria-current="page">
            {item.label}
          </li>
        ),
      )}
    </ol>
  )
}

/** Вкладки-фильтр: выбор хранится в адресе (?status=APPROVED), ссылкой можно поделиться */
export function Tabs({ param, tabs }: { param: string; tabs: Array<{ value: string; label: string }> }) {
  const [searchParams] = useSearchParams()
  const current = searchParams.get(param) ?? ''
  return (
    <ul className="tabs">
      {tabs.map((tab) => {
        const next = new URLSearchParams(searchParams)
        if (tab.value) next.set(param, tab.value)
        else next.delete(param)
        return (
          <li key={tab.value}>
            <Link to={{ search: next.toString() }} aria-current={current === tab.value ? 'page' : undefined}>
              {tab.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="muted">
        {children}
      </td>
    </tr>
  )
}
