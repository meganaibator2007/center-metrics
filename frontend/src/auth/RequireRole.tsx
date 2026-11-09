import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { Alert, Loading } from '../components/ui'
import { hasRole } from './context'
import { useAuth } from './useAuth'

/**
 * Пускает на вложенные маршруты, если у пользователя есть хотя бы одна из ролей
 * (без roles — любого вошедшего). Это удобство интерфейса, а не защита: права проверяет сервер (403).
 */
export function RequireRole({ roles }: { roles?: Role[] }) {
  const { user, loading, unavailable, signedOut, retry } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />
  if (unavailable && !user) {
    return (
      <Alert kind="error" title="Сервер недоступен">
        <p>Не удалось проверить вход. Попробуйте через минуту.</p>
        <p>
          <button type="button" className="btn btn--small btn--outline" onClick={retry}>
            Повторить
          </button>
        </p>
      </Alert>
    )
  }
  if (!user) {
    // После ручного выхода не запоминаем страницу: следующий пользователь начнёт с главной
    const state = signedOut === 'manual' ? undefined : { from: location.pathname + location.search }
    return <Navigate to="/login" replace state={state} />
  }
  if (roles && !hasRole(user, ...roles)) return <Navigate to="/403" replace />
  return <Outlet />
}
