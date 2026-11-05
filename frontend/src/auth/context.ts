import { createContext } from 'react'
import type { CurrentUser, Role } from '../api/types'

export interface AuthState {
  /** Текущий пользователь, null — не вошёл */
  user: CurrentUser | null
  /** true, пока узнаём у сервера, есть ли сессия */
  loading: boolean
  login: (login: string, password: string) => Promise<CurrentUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

/** Стартовая страница роли после входа */
export function homeFor(role: Role): string {
  return role === 'ADMIN' ? '/admin/control' : '/cabinet'
}
