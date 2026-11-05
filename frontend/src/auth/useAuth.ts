import { useContext } from 'react'
import { AuthContext, type AuthState } from './context'

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) {
    throw new Error('useAuth вызван вне AuthProvider')
  }
  return state
}
