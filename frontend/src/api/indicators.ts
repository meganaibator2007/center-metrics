import { request } from './client'
import { query } from './org'
import type { Category, EvaluationType, IndicatorDto, IndicatorRequest } from './types'

export interface IndicatorFilter {
  category?: Category
  evaluationType?: EvaluationType
  archived?: boolean
}

export const listIndicators = (filter: IndicatorFilter = {}) => request<IndicatorDto[]>('GET', `/indicators${query(filter)}`)
export const getIndicator = (id: number) => request<IndicatorDto>('GET', `/indicators/${id}`)
export const createIndicator = (data: IndicatorRequest) => request<IndicatorDto>('POST', '/indicators', data)
/** Изменение создаёт новую редакцию: утверждённые результаты считаются по прежней */
export const updateIndicator = (id: number, data: IndicatorRequest) => request<IndicatorDto>('PUT', `/indicators/${id}`, data)
/** В архив и обратно */
export const toggleArchive = (id: number) => request<IndicatorDto>('POST', `/indicators/${id}/archive`)
