import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { onUnauthorized } from '../api/client'
import type { UserDto } from '../api/types'
import { AuthContext, type AuthState } from './context'

/** Хранит текущего пользователя для всего приложения */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [signedOut, setSignedOut] = useState<AuthState['signedOut']>(null)
  const [attempt, setAttempt] = useState(0)

  // При открытии страницы спрашиваем сервер, есть ли уже сессия.
  // 401 — не вошёл; другая ошибка (502 при перезапуске) — сервер недоступен, сессия может быть жива.
  useEffect(() => {
    let cancelled = false
    authApi.me().then(
      (current) => {
        if (cancelled) return
        setUser(current)
        setUnavailable(false)
        setLoading(false)
      },
      () => {
        if (cancelled) return
        setUnavailable(true)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  // Любой запрос получил 401 посреди работы — сессия истекла
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null)
        setSignedOut('expired')
      }),
    [],
  )

  const retry = useCallback(() => {
    setLoading(true)
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      unavailable,
      signedOut,
      retry,
      login: async (login, password) => {
        const current = await authApi.login({ login, password })
        setUser(current)
        setSignedOut(null)
        return current
      },
      logout: async () => {
        await authApi.logout()
        setSignedOut('manual')
        setUser(null)
      },
    }),
    [user, loading, unavailable, signedOut, retry],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
