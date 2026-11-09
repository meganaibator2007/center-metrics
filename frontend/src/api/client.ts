// Единственное место, откуда клиент ходит на сервер. Компоненты вызывают
// функции из src/api/*.ts, а не fetch напрямую (техсоглашения, раздел 3.4).

import { ApiError } from './errors'
import type { ProblemDetail } from './types'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const useMock = import.meta.env.VITE_API_MOCK === 'true'

// Spring Security кладёт CSRF-токен в cookie XSRF-TOKEN
// и ждёт его обратно в заголовке X-XSRF-TOKEN.
const CSRF_COOKIE = 'XSRF-TOKEN'
const CSRF_HEADER = 'X-XSRF-TOKEN'

function readCookie(name: string): string | null {
  const pair = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null
}

async function csrfToken(): Promise<string | null> {
  if (!readCookie(CSRF_COOKIE)) {
    await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  }
  return readCookie(CSRF_COOKIE)
}

// Сессия истекла посреди работы (сервер перезапустился, вышли в другой вкладке):
// AuthProvider подписывается и сбрасывает пользователя, RequireRole отправляет на вход.
type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/** Запросы, где 401 — обычный ответ, а не «сессия истекла» */
const AUTH_PATHS = ['/auth/me', '/auth/login']

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  try {
    return await send<T>(method, path, body)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !AUTH_PATHS.includes(path)) {
      unauthorizedListeners.forEach((listener) => listener())
    }
    throw error
  }
}

async function send<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (useMock) {
    // Заглушки грузятся отдельным файлом только в режиме разработки и в сборку не попадают
    const { mockRequest } = await import('./mock')
    return mockRequest<T>(method, path, body)
  }

  const isForm = body instanceof FormData
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json'
  }
  if (method !== 'GET') {
    const token = await csrfToken()
    if (token) headers[CSRF_HEADER] = token
  }

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    // Сеть недоступна или nginx не достучался до сервера
    throw new ApiError(0, { title: 'Сервер недоступен' })
  }

  if (!response.ok) {
    let problem: ProblemDetail = {}
    try {
      problem = (await response.json()) as ProblemDetail
    } catch {
      // У ответа нет тела в формате JSON — оставляем пустую ошибку
    }
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/** Адрес файла для скачивания (XLSX, вложения): браузер сам отправит cookie сессии */
export function fileUrl(path: string): string {
  return `/api${path}`
}
