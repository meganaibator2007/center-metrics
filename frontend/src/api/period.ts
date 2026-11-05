import { request } from './client'
import type { Period } from './types'

export function listPeriods(): Promise<Period[]> {
  return request<Period[]>('GET', '/periods')
}
