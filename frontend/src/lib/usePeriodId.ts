import { useSearchParams } from 'react-router'

/** Выбранный период из адреса (?periodId=3); undefined — текущий, его выбирает сервер */
export function usePeriodId(): number | undefined {
  const [params] = useSearchParams()
  const value = params.get('periodId')
  return value ? Number(value) : undefined
}
