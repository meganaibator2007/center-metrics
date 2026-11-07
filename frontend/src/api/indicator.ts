import { request } from './client'
import type { CategoryDto, IndicatorDto } from './types'

export function listCategories(): Promise<CategoryDto[]> {
  return request<CategoryDto[]>('GET', '/categories')
}

export function listIndicators(): Promise<IndicatorDto[]> {
  return request<IndicatorDto[]>('GET', '/indicators')
}
