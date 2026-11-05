import { request } from './client'
import type { Cabinet } from './types'

export function getCabinet(periodId?: number): Promise<Cabinet> {
  const query = periodId === undefined ? '' : `?periodId=${periodId}`
  return request<Cabinet>('GET', `/cabinet${query}`)
}
