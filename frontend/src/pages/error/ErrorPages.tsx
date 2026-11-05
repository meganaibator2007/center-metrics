import { Link, useParams } from 'react-router'

// TODO(Харламова Е., до 08.11): оформить страницы по прототипу:
// prototype/templates/error/403.html, 404.html, 500.html и prototype/templates/common/stub.html.

export function NotFoundPage() {
  return (
    <section className="state">
      <p className="state__code">404</p>
      <h1 className="state__title">Страница не найдена</h1>
      <Link to="/">На главную</Link>
    </section>
  )
}

export function ForbiddenPage() {
  return (
    <section className="state">
      <p className="state__code">403</p>
      <h1 className="state__title">Доступ запрещён</h1>
      <Link to="/">На главную</Link>
    </section>
  )
}

export function SoonPage() {
  const { feature } = useParams()
  return (
    <section className="state">
      <h1 className="state__title">Функция в разработке</h1>
      <p className="muted">Раздел «{feature}» появится после защиты.</p>
    </section>
  )
}
