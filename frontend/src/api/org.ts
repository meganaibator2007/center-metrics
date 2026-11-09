import { request } from './client'
import type { DepartmentDto, Page, PersonShort, ProgramDto, UserDto, UserRequest } from './types'

export const listDepartments = () => request<DepartmentDto[]>('GET', '/departments')
export const listPrograms = () => request<ProgramDto[]>('GET', '/programs')
/** Активные сотрудники: для выбора соавторов */
export const listEmployees = () => request<PersonShort[]>('GET', '/employees')

export interface UserFilter {
  q?: string
  role?: string
  category?: string
  active?: string
  page?: number
  size?: number
}

export function listUsers(filter: UserFilter): Promise<Page<UserDto>> {
  return request<Page<UserDto>>('GET', `/users${query(filter)}`)
}
export const getUser = (id: number) => request<UserDto>('GET', `/users/${id}`)
export const createUser = (data: UserRequest) => request<UserDto>('POST', '/users', data)
export const updateUser = (id: number, data: UserRequest) => request<UserDto>('PUT', `/users/${id}`, data)
export const setUserActive = (id: number, active: boolean) => request<UserDto>('PATCH', `/users/${id}/active`, { active })

/** Параметры адреса из объекта: пустые значения пропускаются */
export function query(params: object): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
