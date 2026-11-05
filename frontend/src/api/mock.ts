// Заглушки API на время, пока нет сервера. Данные взяты из прототипа и вымышлены.
// Включаются переменной VITE_API_MOCK=true (см. .env.development).

import { ApiError } from './errors'
import type { Cabinet, CabinetRow, Category, CurrentUser, Indicator, LoginRequest, Period } from './types'

const users: Record<string, CurrentUser> = {
  'a.ivanova': {
    id: 2,
    login: 'a.ivanova',
    fullName: 'Иванова Анна Петровна',
    role: 'TEACHER',
    department: 'Информационных технологий',
    position: 'Доцент',
  },
  'e.smirnova': {
    id: 1,
    login: 'e.smirnova',
    fullName: 'Смирнова Елена Викторовна',
    role: 'ADMIN',
    department: null,
    position: 'Руководитель центра',
  },
}

const categories: Category[] = [
  { id: 1, name: 'Учебная работа' },
  { id: 2, name: 'Научная работа' },
  { id: 3, name: 'Методическая работа' },
  { id: 4, name: 'Воспитательная работа' },
]

function indicator(
  id: number,
  categoryId: number,
  name: string,
  unit: string,
  coefficient: number,
  maxScore: number,
  required = false,
  archived = false,
): Indicator {
  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? ''
  return { id, categoryId, categoryName, name, unit, coefficient, maxScore, required, archived }
}

const indicators: Indicator[] = [
  indicator(1, 1, 'Разработка рабочей программы дисциплины', 'шт.', 6, 18),
  indicator(2, 1, 'Руководство выпускными квалификационными работами', 'чел.', 2, 20, true),
  indicator(3, 1, 'Проведение открытого занятия', 'шт.', 4, 8),
  indicator(4, 2, 'Статья в журнале из перечня ВАК', 'шт.', 10, 40, true),
  indicator(5, 2, 'Статья в журнале РИНЦ', 'шт.', 5, 20),
  indicator(6, 2, 'Доклад на научной конференции', 'шт.', 3, 15),
  indicator(7, 3, 'Учебное пособие', 'п. л.', 4, 32),
  indicator(8, 3, 'Повышение квалификации', 'ч', 0.1, 10, true),
  indicator(9, 4, 'Кураторство учебной группы', 'группа', 5, 10),
  indicator(10, 4, 'Подготовка студентов к олимпиадам и конкурсам', 'чел.', 3, 15),
  indicator(11, 2, 'Статья в журнале Scopus / Web of Science', 'шт.', 15, 45, false, true),
]

const periods: Period[] = [
  { id: 1, name: '1 семестр 2026/27', type: 'SEMESTER', startDate: '2026-09-01', endDate: '2027-01-31', closed: false },
  { id: 2, name: 'Октябрь 2026', type: 'MONTH', startDate: '2026-10-01', endDate: '2026-10-31', closed: false },
  { id: 3, name: 'Сентябрь 2026', type: 'MONTH', startDate: '2026-09-01', endDate: '2026-09-30', closed: true },
  { id: 4, name: '2 семестр 2025/26', type: 'SEMESTER', startDate: '2026-02-01', endDate: '2026-06-30', closed: true },
]

// Что Иванова внесла за 1 семестр: id показателя → сумма значений
const ivanovaValues: Record<number, number> = { 1: 2, 2: 6, 4: 5, 5: 2, 6: 3, 9: 1, 10: 2 }

function cabinet(): Cabinet {
  const active = indicators.filter((i) => !i.archived)
  const rows: CabinetRow[] = active.map((i) => {
    const value = ivanovaValues[i.id] ?? null
    // Балл = значение × коэффициент, но не больше максимального балла (BR-01, BR-02)
    const score = value === null ? 0 : Math.min(value * i.coefficient, i.maxScore)
    return {
      indicatorId: i.id,
      indicatorName: i.name,
      categoryName: i.categoryName,
      unit: i.unit,
      coefficient: i.coefficient,
      maxScore: i.maxScore,
      required: i.required,
      value,
      score,
    }
  })
  const required = rows.filter((r) => r.required)
  return {
    period: periods[0],
    reportStatus: 'DRAFT',
    totalScore: rows.reduce((sum, r) => sum + r.score, 0),
    maxTotal: rows.reduce((sum, r) => sum + r.maxScore, 0),
    filledCount: rows.filter((r) => r.value !== null).length,
    indicatorCount: rows.length,
    requiredFilled: required.filter((r) => r.value !== null).length,
    requiredCount: required.length,
    rows,
  }
}

// Вход «запоминается» до закрытия вкладки, как сессия на сервере
const SESSION_KEY = 'center-metrics-mock-login'

function sessionLogin(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

function setSessionLogin(login: string | null) {
  try {
    if (login) sessionStorage.setItem(SESSION_KEY, login)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Хранилище недоступно (приватный режим) — вход просто не запомнится
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function handle(method: string, path: string, body: unknown): unknown {
  const route = `${method} ${path.split('?')[0]}`
  switch (route) {
    case 'GET /auth/csrf':
      return undefined
    case 'POST /auth/login': {
      const { login, password } = body as LoginRequest
      const user = users[login]
      if (!user || !password) {
        throw new ApiError(401, { title: 'Неверный логин или пароль' })
      }
      setSessionLogin(login)
      return user
    }
    case 'POST /auth/logout':
      setSessionLogin(null)
      return undefined
    case 'GET /auth/me': {
      const login = sessionLogin()
      const user = login ? users[login] : undefined
      if (!user) throw new ApiError(401, { title: 'Нужно войти в систему' })
      return user
    }
    case 'GET /categories':
      return categories
    case 'GET /indicators':
      return indicators
    case 'GET /periods':
      return periods
    case 'GET /cabinet':
      return cabinet()
    default:
      throw new ApiError(404, { title: `Для ${route} заглушки пока нет` })
  }
}

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await delay(200)
  return handle(method, path, body) as T
}
