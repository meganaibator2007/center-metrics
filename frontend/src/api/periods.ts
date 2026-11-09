import { request } from './client'
import type { PeriodDto, PeriodRequest } from './types'

export const listPeriods = () => request<PeriodDto[]>('GET', '/periods')
/** Открытый период, в который попадает сегодняшняя дата */
export const currentPeriod = () => request<PeriodDto>('GET', '/periods/current')
export const createPeriod = (data: PeriodRequest) => request<PeriodDto>('POST', '/periods', data)
/** Закрытие формирует снимок официальных итогов */
export const closePeriod = (id: number) => request<PeriodDto>('POST', `/periods/${id}/close`)
/** Санкционированное переоткрытие: основание обязательно */
export const reopenPeriod = (id: number, comment: string) => request<PeriodDto>('POST', `/periods/${id}/reopen`, { comment })
