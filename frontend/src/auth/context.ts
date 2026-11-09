import { createContext } from 'react'
import type { Role, UserDto } from '../api/types'

export interface AuthState {
  /** Текущий пользователь, null — не вошёл */
  user: UserDto | null
  /** true, пока узнаём у сервера, есть ли сессия */
  loading: boolean
  /** Сервер не ответил при проверке сессии: это не то же самое, что «не вошёл» */
  unavailable: boolean
  /** Почему пользователя нет: сам вышел или сессия истекла */
  signedOut: 'manual' | 'expired' | null
  login: (login: string, password: string) => Promise<UserDto>
  logout: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function hasRole(user: UserDto | null, ...roles: Role[]): boolean {
  return !!user && roles.some((role) => user.roles.includes(role))
}
