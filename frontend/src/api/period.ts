import { request } from './client'
import type { PeriodDto } from './types'

export function listPeriods(): Promise<PeriodDto[]> {
  return request<PeriodDto[]>('GET', '/periods')
}
