import { request } from './client'
import { ApiError } from './errors'
import type { CurrentUser, LoginRequest } from './types'

export function login(data: LoginRequest): Promise<CurrentUser> {
  return request<CurrentUser>('POST', '/auth/login', data)
}

export function logout(): Promise<void> {
  return request<void>('POST', '/auth/logout')
}

/** Текущий пользователь или null, если сессии нет */
export async function me(): Promise<CurrentUser | null> {
  try {
    return await request<CurrentUser>('GET', '/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
