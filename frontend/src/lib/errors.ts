import { ApiError } from '../api/errors'

/** Текст ошибки сервера для человека */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Сервер недоступен. Проверьте подключение и попробуйте ещё раз.'
    if (error.status === 403) return error.problem.detail ?? 'Недостаточно прав.'
    return error.problem.detail ?? error.problem.title ?? `Ошибка ${error.status}`
  }
  return 'Что-то пошло не так. Обновите страницу.'
}

/** Ошибки по полям из ответа 400 */
export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? (error.problem.errors ?? {}) : {}
}
