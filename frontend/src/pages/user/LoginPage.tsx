import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../../api/errors'
import { homeFor } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'

const LOGO_ALT = 'Финансовый университет при Правительстве Российской Федерации'
const useMock = import.meta.env.VITE_API_MOCK === 'true'

/** Вход в систему (T-26): форма из прототипа prototype/templates/user/login.html */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Откуда пришли: после входа возвращаем туда же
  const from = (location.state as { from?: string } | null)?.from

  if (user) {
    return <Navigate to={from ?? homeFor(user.role)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const current = await login(loginValue.trim(), password)
      navigate(from ?? homeFor(current.role), { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Неверный логин или пароль'
          : 'Сервер недоступен. Попробуйте ещё раз через минуту.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <section className="auth__brand">
        <img className="auth__logo" src="/img/logo-white.svg" alt={LOGO_ALT} width={240} height={77} />
        <div>
          <h1 className="auth__title">Учёт показателей деятельности центра</h1>
          <p className="auth__text">
            Вносите результаты работы за отчётный период — баллы посчитаются автоматически, а отчёт для
            руководства соберётся сам.
          </p>
        </div>
        <p className="auth__foot">Учебный проект · Финансовый университет, 2026</p>
      </section>

      <section className="auth__main">
        <div className="auth__card">
          <h2>Вход в систему</h2>
          <p className="muted">Логин и пароль выдаёт администратор центра.</p>

          <form className="form" onSubmit={handleSubmit}>
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
              <p className="text-small">
                Преподаватель — <code>a.ivanova</code>, администратор — <code>e.smirnova</code>, пароль любой.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
