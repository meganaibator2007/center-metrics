import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { useAuth } from './useAuth'

/**
 * Пускает на вложенные маршруты только пользователя с нужной ролью.
 * Это удобство для интерфейса, а не защита: права проверяет сервер (403).
 */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="muted">Загрузка…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (user.role !== role) {
    return <Navigate to="/403" replace />
  }
  return <Outlet />
}
