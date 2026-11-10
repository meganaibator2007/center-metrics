import { ApiError } from '../api/errors'

/**
 * Адреса API, которого на сервере ещё нет: Spring отвечает 404 с текстом
 * «No static resource api/…» (NoResourceFoundException). Так бывает, пока бэкенд
 * реализует контракт по частям, — показываем «раздел в разработке», а не английскую строку.
 */
export function isNotImplemented(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && /^No static resource/i.test(error.problem.detail ?? '')
}

/** Текст ошибки сервера для человека */
export function errorText(error: unknown): string {
  if (isNotImplemented(error)) return 'Эта функция на сервере ещё в разработке и появится в следующих обновлениях.'
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
