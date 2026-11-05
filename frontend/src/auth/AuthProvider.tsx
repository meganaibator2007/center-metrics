import { useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { CurrentUser } from '../api/types'
import { AuthContext, type AuthState } from './context'

/** Хранит текущего пользователя для всего приложения */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // При открытии страницы спрашиваем сервер, есть ли уже сессия
  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((current) => {
        if (!cancelled) setUser(current)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (login, password) => {
        const current = await authApi.login({ login, password })
        setUser(current)
        return current
      },
      logout: async () => {
        await authApi.logout()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
