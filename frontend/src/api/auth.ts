import { request } from './client'
import { ApiError } from './errors'
import type { UserDto, LoginRequest } from './types'

export function login(data: LoginRequest): Promise<UserDto> {
  return request<UserDto>('POST', '/auth/login', data)
}

export function logout(): Promise<void> {
  return request<void>('POST', '/auth/logout')
}

/** Текущий пользователь или null, если сессии нет */
export async function me(): Promise<UserDto | null> {
  try {
    return await request<UserDto>('GET', '/auth/me')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
