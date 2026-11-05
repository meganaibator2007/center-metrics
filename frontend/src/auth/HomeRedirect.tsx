import { Navigate } from 'react-router'
import { homeFor } from './context'
import { useAuth } from './useAuth'

/** Адрес «/» ведёт на стартовую страницу роли или на вход */
export function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return <p className="muted">Загрузка…</p>
  }
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}
