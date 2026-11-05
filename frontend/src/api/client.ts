// Единственное место, откуда клиент ходит на сервер. Компоненты вызывают
// функции из src/api/*.ts, а не fetch напрямую (техсоглашения, раздел 3.4).

import { ApiError } from './errors'
import { mockRequest } from './mock'
import type { ProblemDetail } from './types'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const useMock = import.meta.env.VITE_API_MOCK === 'true'

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

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (useMock) {
    return mockRequest<T>(method, path, body)
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  if (method !== 'GET') {
    const token = await csrfToken()
    if (token) headers[CSRF_HEADER] = token
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })

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
