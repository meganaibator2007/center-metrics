import { request } from './client'
import { query } from './org'
import type { AuditEventDto, DirectorDashboardDto, MeasurementDto, MeasurementRequest, MyScoresDto, Page } from './types'

export const myScores = (periodId?: number) => request<MyScoresDto>('GET', `/scores/my${query({ periodId })}`)
export const userScores = (userId: number, periodId?: number) => request<MyScoresDto>('GET', `/scores/users/${userId}${query({ periodId })}`)
export const directorDashboard = (periodId?: number) => request<DirectorDashboardDto>('GET', `/dashboard/director${query({ periodId })}`)

// Целевые показатели РОП (ТЗ 6.3)
export const listMeasurements = (periodId?: number, programId?: number) =>
  request<MeasurementDto[]>('GET', `/measurements${query({ periodId, programId })}`)
export const createMeasurement = (data: MeasurementRequest) => request<MeasurementDto>('POST', '/measurements', data)
export const updateMeasurement = (id: number, data: MeasurementRequest) => request<MeasurementDto>('PUT', `/measurements/${id}`, data)
export const submitMeasurement = (id: number) => request<MeasurementDto>('POST', `/measurements/${id}/submit`)
export const approveMeasurement = (id: number) => request<MeasurementDto>('POST', `/measurements/${id}/approve`)
export const returnMeasurement = (id: number, comment: string) => request<MeasurementDto>('POST', `/measurements/${id}/return`, { comment })

export const listAudit = (page = 0) => request<Page<AuditEventDto>>('GET', `/audit${query({ page, size: 50 })}`)
