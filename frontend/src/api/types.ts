// Формы данных, которыми обмениваются клиент и сервер.
// Черновик: поля нужно согласовать с Готовцом В. и перенести в docs/api.md.

export type Role = 'TEACHER' | 'ADMIN'

export interface CurrentUser {
  id: number
  login: string
  fullName: string
  role: Role
  department: string | null
  position: string | null
}

export interface LoginRequest {
  login: string
  password: string
}

export interface Category {
  id: number
  name: string
}

export interface Indicator {
  id: number
  categoryId: number
  categoryName: string
  name: string
  unit: string
  coefficient: number
  maxScore: number
  required: boolean
  archived: boolean
}

export type PeriodType = 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR'

export interface Period {
  id: number
  name: string
  type: PeriodType
  /** Дата в формате ГГГГ-ММ-ДД */
  startDate: string
  endDate: string
  closed: boolean
}

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'RETURNED'

/** Строка кабинета: один показатель и то, что по нему внесено за период */
export interface CabinetRow {
  indicatorId: number
  indicatorName: string
  categoryName: string
  unit: string
  coefficient: number
  maxScore: number
  required: boolean
  /** Сумма значений записей, null — записей нет */
  value: number | null
  /** Балл по показателю, уже ограниченный максимальным баллом */
  score: number
}

export interface Cabinet {
  period: Period
  reportStatus: ReportStatus
  totalScore: number
  maxTotal: number
  filledCount: number
  indicatorCount: number
  requiredFilled: number
  requiredCount: number
  rows: CabinetRow[]
}

/** Ошибка сервера в формате ProblemDetail (RFC 9457) */
export interface ProblemDetail {
  status?: number
  title?: string
  detail?: string
  /** Ошибки по полям формы: имя поля → текст */
  errors?: Record<string, string>
}
