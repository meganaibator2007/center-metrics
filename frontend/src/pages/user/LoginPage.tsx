import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useMock } from '../../api/client'
import { ApiError } from '../../api/errors'
import { useAuth } from '../../auth/useAuth'

const LOGO_ALT = 'Финансовый университет при Правительстве Российской Федерации'

const DEMO_USERS = [
  ['a.ivanova', 'сотрудник ППС'],
  ['p.sokolov', 'сотрудник ППС'],
  ['m.petrova', 'РОП «Программная инженерия» и ППС'],
  ['n.kozlova', 'РОП «Прикладная математика» и ППС'],
  ['d.orlov', 'директор'],
  ['k.volkova', 'сотрудник АУП'],
  ['e.smirnova', 'суперадминистратор'],
]

/** Вход в систему (T-26): форма из прототипа prototype/templates/user/login.html */
export function LoginPage() {
  const { user, login, signedOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Откуда пришли: после входа возвращаем туда же
  const from = (location.state as { from?: string } | null)?.from

  if (user) {
    return <Navigate to={from ?? '/'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(loginValue.trim(), password)
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError(err.problem.detail ?? 'Неверный логин или пароль')
      else if (err instanceof ApiError && err.status > 0) setError(err.problem.detail ?? `Ошибка ${err.status}. Обновите страницу и попробуйте снова.`)
      else setError('Сервер недоступен. Попробуйте ещё раз через минуту.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <section className="auth__brand">
        <img className="auth__logo" src="/img/logo-white.svg" alt={LOGO_ALT} width={240} height={77} />
        <div>
          <h1 className="auth__title">Учёт показателей эффективности</h1>
          <p className="auth__text">
            Единый реестр достижений ППС и АУП, целевые показатели РОП, проверка и утверждение результатов,
            дашборд директора.
          </p>
        </div>
        <p className="auth__foot">Учебный проект · Финансовый университет, 2026</p>
      </section>

      <section className="auth__main">
        <div className="auth__card">
          <h2>Вход в систему</h2>
          <p className="muted">Логин и пароль выдаёт администратор центра.</p>

          <form className="form" onSubmit={handleSubmit}>
            {signedOut === 'expired' && !error && (
              <div className="alert" role="status">
                <p>Сессия истекла — войдите снова.</p>
              </div>
            )}
            {error && (
              <div className="alert alert--error" role="alert">
                <p>{error}</p>
              </div>
            )}
            <div className="field">
              <label className="field__label" htmlFor="login">
                Логин
              </label>
              <input
                className="input"
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                required
                placeholder="например, a.ivanova"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="password">
                Пароль
              </label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
                {submitting ? 'Входим…' : 'Войти'}
              </button>
            </div>
          </form>

          {useMock && (
            <div className="demo-box">
              <p className="demo-box__title">Заглушки API: сервер не нужен</p>
              <p className="text-small">Пароль любой. Пользователи:</p>
              <ul className="list-plain text-small">
                {DEMO_USERS.map(([login, role]) => (
                  <li key={login}>
                    <button type="button" className="btn btn--small btn--outline" onClick={() => setLoginValue(login)}>
                      {login}
                    </button>{' '}
                    {role}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
