import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { Alert } from '../components/ui'
import { errorText } from '../lib/errors'
import { useAuth } from '../auth/useAuth'
import { ROLE_LABEL } from '../lib/labels'
import { navFor } from './nav'

const LOGO_ALT = 'Финансовый университет при Правительстве Российской Федерации'

/** Общий каркас страниц: сервисная строка, шапка с меню роли, подвал (брендбук, с. 43–44) */
export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = user ? navFor(user) : []
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLogoutError(null)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(errorText(error))
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span className="topbar__product">
            Финансовый университет · Система учёта показателей эффективности
          </span>
          {user && (
            <div className="topbar__user">
              {user.roles.map((role) => (
                <span key={role} className="badge badge--role badge--plain">
                  {ROLE_LABEL[role]}
                </span>
              ))}
              <Link to="/password" className="topbar__logout">
                {user.fullName}
              </Link>
              <button type="button" className="topbar__logout" onClick={handleLogout}>
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>

      <header className="header">
        <div className="container">
          <Link className="header__brand" to="/">
            <img className="header__logo" src="/img/logo-color.svg" alt={LOGO_ALT} width={159} height={52} />
            <span className="header__product">
              Показатели
              <br />
              эффективности
            </span>
          </Link>
          {items.length > 0 && (
            <nav className="nav" aria-label="Основное меню">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="page">
        <div className="container">
          {logoutError && (
            <Alert kind="error" title="Не удалось выйти">
              {logoutError}
            </Alert>
          )}
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div>
            <img className="footer__logo" src="/img/logo-white.svg" alt={LOGO_ALT} width={190} height={61} />
            <p className="footer__text">
              Система учёта показателей эффективности: единый реестр достижений, расчёт баллов ППС и АУП,
              целевые показатели РОП, согласование и утверждение результатов
            </p>
          </div>
          <div>
            <p className="footer__label">Помощь</p>
            <ul className="footer__links">
              <li>
                <Link to="/soon/help">Справка для пользователей</Link>
              </li>
              <li>
                <Link to="/soon/privacy">Обработка персональных данных (152-ФЗ)</Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="footer__label">О проекте</p>
            <p className="footer__text">
              Учебный командный проект группы ПИ25-1
              <br />
              Факультет информационных технологий и анализа больших данных
            </p>
          </div>
          <div className="footer__bottom">
            <span>© 2026 Команда «Учет»</span>
            <span>Демонстрационная версия</span>
          </div>
        </div>
      </footer>
    </>
  )
}
