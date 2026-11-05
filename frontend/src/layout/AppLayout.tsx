import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { NAV, ROLE_LABEL } from './nav'

const LOGO_ALT = 'Финансовый университет при Правительстве Российской Федерации'

/** Общий каркас страниц: сервисная строка, шапка с меню роли, подвал (брендбук, с. 43–44) */
export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = user ? NAV[user.role] : []

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="topbar">
        <div className="container">
          <span className="topbar__product">
            Финансовый университет · Система учёта показателей деятельности центра
          </span>
          {user && (
            <div className="topbar__user">
              <span className="badge badge--role badge--plain">{ROLE_LABEL[user.role]}</span>
              <span>{user.fullName}</span>
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
              деятельности центра
            </span>
          </Link>
          {items.length > 0 && (
            <nav className="nav" aria-label="Основное меню">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                  {item.soon && <span className="soon">скоро</span>}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="page">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div>
            <img className="footer__logo" src="/img/logo-white.svg" alt={LOGO_ALT} width={190} height={61} />
            <p className="footer__text">
              Система учёта показателей деятельности центра: ввод данных преподавателями, автоматический
              расчёт баллов, отчёты для руководства
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
