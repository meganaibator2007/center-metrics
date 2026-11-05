import { request } from './client'
import type { Category, Indicator } from './types'

export function listCategories(): Promise<Category[]> {
  return request<Category[]>('GET', '/categories')
}

export function listIndicators(): Promise<Indicator[]> {
  return request<Indicator[]>('GET', '/indicators')
}
