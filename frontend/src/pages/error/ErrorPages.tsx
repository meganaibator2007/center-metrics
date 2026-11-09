import { Link, useParams, useRouteError } from 'react-router'

// Оформление — по прототипу: prototype/templates/error/403.html, 404.html, 500.html

export function NotFoundPage() {
  return (
    <section className="state">
      <title>Страница не найдена — Показатели эффективности</title>
      <p className="state__code">404</p>
      <h1 className="state__title">Страница не найдена</h1>
      <p className="muted">Возможно, адрес устарел или в нём опечатка.</p>
      <div className="state__actions">
        <Link className="btn btn--primary" to="/">
          На главную
        </Link>
      </div>
    </section>
  )
}

export function ForbiddenPage() {
  return (
    <section className="state">
      <title>Доступ запрещён — Показатели эффективности</title>
      <p className="state__code">403</p>
      <h1 className="state__title">Доступ запрещён</h1>
      <p className="muted">Этот раздел недоступен вашей роли. Если нужен доступ, обратитесь к администратору.</p>
      <div className="state__actions">
        <Link className="btn btn--primary" to="/">
          На главную
        </Link>
      </div>
    </section>
  )
}

/** Ошибка при отрисовке экрана: вместо английского экрана React Router — страница 500 из прототипа */
export function ServerErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return (
    <main className="page">
      <div className="container">
        <section className="state">
          <title>Ошибка — Показатели эффективности</title>
          <p className="state__code">500</p>
          <h1 className="state__title">Что-то пошло не так</h1>
          <p className="muted">Обновите страницу. Если ошибка повторяется, сообщите администратору, что вы делали перед ней.</p>
          <div className="state__actions">
            <a className="btn btn--primary" href="/">
              На главную
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

export function SoonPage() {
  const { feature } = useParams()
  const titles: Record<string, string> = { help: 'Справка для пользователей', privacy: 'Обработка персональных данных' }
  return (
    <section className="state">
      <h1 className="state__title">{titles[feature ?? ''] ?? 'Раздел в разработке'}</h1>
      <p className="muted">Раздел появится в следующей версии.</p>
    </section>
  )
}
