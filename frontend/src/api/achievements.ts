import { request } from './client'
import { query } from './org'
import type { AchievementDto, AchievementRequest, Category, DuplicateDto, EvidenceDto, ResultStatus } from './types'

/** my — свои и где соавтор; review — очередь РОП; approval — очередь директора; registry — всё доступное */
export type AchievementScope = 'my' | 'review' | 'approval' | 'registry'

export interface AchievementFilter {
  scope: AchievementScope
  status?: ResultStatus | string
  periodId?: number
  category?: Category
  indicatorId?: number
  userId?: number
  q?: string
}

export const listAchievements = (filter: AchievementFilter) => request<AchievementDto[]>('GET', `/achievements${query(filter)}`)
export const getAchievement = (id: number) => request<AchievementDto>('GET', `/achievements/${id}`)
export const createAchievement = (data: AchievementRequest) => request<AchievementDto>('POST', '/achievements', data)
export const updateAchievement = (id: number, data: AchievementRequest) => request<AchievementDto>('PUT', `/achievements/${id}`, data)
export const deleteAchievement = (id: number) => request<void>('DELETE', `/achievements/${id}`)

export interface DuplicateQuery {
  indicatorId: number
  identifier: string | null
  title: string
  eventDate: string
  excludeId: number | null
}

/** Поиск повторов до сохранения (ТЗ 5.2): STRICT — тот же идентификатор, SIMILAR — похожие */
export const checkDuplicates = (data: DuplicateQuery) => request<DuplicateDto[]>('POST', '/achievements/check-duplicates', data)
/** Присоединиться к уже зарегистрированному достижению как соавтор (ТЗ 5.4) */
export const joinAchievement = (id: number) => request<AchievementDto>('POST', `/achievements/${id}/join`)

export function uploadEvidence(id: number, file: File, docType: string): Promise<EvidenceDto> {
  const form = new FormData()
  form.set('file', file)
  form.set('docType', docType)
  return request<EvidenceDto>('POST', `/achievements/${id}/evidence`, form)
}
export const addEvidenceLink = (id: number, docType: string, url: string) =>
  request<EvidenceDto>('POST', `/achievements/${id}/evidence`, { docType, url })
export const removeEvidence = (id: number, evidenceId: number) => request<void>('DELETE', `/achievements/${id}/evidence/${evidenceId}`)

// Маршрут согласования (ТЗ 4.1)
export const submitAchievement = (id: number) => request<AchievementDto>('POST', `/achievements/${id}/submit`)
export const reviewAchievement = (id: number, comment: string | null) => request<AchievementDto>('POST', `/achievements/${id}/review`, { comment })
export const returnAchievement = (id: number, comment: string) => request<AchievementDto>('POST', `/achievements/${id}/return`, { comment })
export const rejectAchievement = (id: number, comment: string) => request<AchievementDto>('POST', `/achievements/${id}/reject`, { comment })
export const approveAchievement = (id: number, comment: string | null) => request<AchievementDto>('POST', `/achievements/${id}/approve`, { comment })
export const sendToRevision = (id: number, comment: string) => request<AchievementDto>('POST', `/achievements/${id}/revision`, { comment })
