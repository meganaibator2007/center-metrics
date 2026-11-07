// Формы данных, которыми обмениваются клиент и сервер.
// Имена и поля повторяют схемы из app/src/main/resources/static/openapi.yaml
// (контракт Готовца В., docs/api.md). Меняется контракт — правим и этот файл.
// Сюда перенесено всё, что нужно для MVP; методы «после защиты» не описаны.

// ---------- Общее ----------

/** Ошибка сервера в формате ProblemDetail (RFC 9457) */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string | null
  instance?: string
  /** Ошибки по полям формы, только для 400: имя поля → текст */
  errors?: Record<string, string>
}

/** Страница списка: сейчас постранично отдаётся только GET /api/users */
export interface PageMeta {
  size: number
  /** Номер страницы с нуля */
  number: number
  totalElements: number
  totalPages: number
}

export interface Page<T> {
  content: T[]
  page: PageMeta
}

// ---------- Вход и пользователи (пакет user) ----------

export type Role = 'TEACHER' | 'ADMIN'

export interface LoginRequest {
  login: string
  password: string
}

/** Пользователь. Его же возвращают POST /api/auth/login и GET /api/auth/me */
export interface UserDto {
  id: number
  login: string
  /** Фамилия, имя и отчество через пробел */
  fullName: string
  lastName: string
  firstName: string
  middleName: string | null
  role: Role
  /** Кафедра строкой, без отдельного справочника */
  department: string | null
  position: string | null
  /** false — пользователь заблокирован */
  active: boolean
}

export interface UserRequest {
  lastName: string
  firstName: string
  middleName: string | null
  /** Латинские буквы, цифры, точка, дефис: ^[a-z0-9.-]{3,50}$ */
  login: string
  position: string | null
  role: Role
  department: string
  /** Временный пароль, не короче 8 символов. Обязателен при создании, при изменении игнорируется */
  password: string | null
}

export interface UserActiveRequest {
  active: boolean
}

// ---------- Категории и показатели (пакет indicator) ----------

export interface CategoryDto {
  id: number
  name: string
}

export interface CategoryRequest {
  name: string
}

/** Поле формы ввода показателя. Редактор полей — после защиты, до него список пустой */
export interface IndicatorField {
  /** Имя поля в EntryDto.fields */
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'URL'
  required: boolean
}

export interface IndicatorDto {
  id: number
  categoryId: number
  categoryName: string
  name: string
  unit: string
  coefficient: number
  maxScore: number
  /** Без обязательного показателя отчёт не отправить */
  required: boolean
  archived: boolean
  /** Пояснение для преподавателей */
  description: string | null
  fields: IndicatorField[]
}

export interface IndicatorRequest {
  categoryId: number
  name: string
  unit: string
  coefficient: number
  maxScore: number
  required: boolean
  description: string | null
}

// ---------- Отчётные периоды (пакет period) ----------

export type PeriodType = 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR'

export interface PeriodDto {
  id: number
  name: string
  type: PeriodType
  /** Дата в формате ГГГГ-ММ-ДД */
  startDate: string
  endDate: string
  closed: boolean
}

export interface PeriodRequest {
  name: string
  type: PeriodType
  startDate: string
  endDate: string
}

// ---------- Записи и файлы (пакет entry) ----------

export interface AttachmentDto {
  id: number
  fileName: string
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png'
  /** Размер в байтах, не больше 10 МБ */
  size: number
  /** Дата и время в ISO 8601 */
  uploadedAt: string
}

/** Запись преподавателя. Баллов здесь нет: их показывает кабинет */
export interface EntryDto {
  id: number
  indicatorId: number
  periodId: number
  /** Количество в единицах показателя */
  value: number
  /** Значения полей формы показателя, ключ — IndicatorField.key */
  fields: Record<string, unknown>
  comment: string | null
  attachments: AttachmentDto[]
  createdAt: string
  updatedAt: string
}

export interface EntryRequest {
  indicatorId: number
  periodId: number
  value: number
  fields?: Record<string, unknown>
  comment: string | null
}

// ---------- Кабинет и отчёты (пакет report) ----------

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

/** GET /api/cabinet. Без periodId — текущий открытый период, 404 — открытого периода нет */
export interface Cabinet {
  period: PeriodDto
  reportStatus: ReportStatus
  totalScore: number
  maxTotal: number
  filledCount: number
  indicatorCount: number
  requiredFilled: number
  requiredCount: number
  rows: CabinetRow[]
}

export interface TeacherShort {
  id: number
  fullName: string
  department: string | null
  position: string | null
}

/** Отчёт преподавателя: свой (GET /api/reports/my) или для админа (GET /api/reports/teachers/{id}) */
export interface ReportDto {
  /** null — отчёт ещё не создан */
  id: number | null
  teacher: TeacherShort
  period: PeriodDto
  status: ReportStatus
  submittedAt: string | null
  returnComment: string | null
  totalScore: number
  maxTotal: number
  rows: CabinetRow[]
}

export interface CategoryScore {
  categoryId: number
  categoryName: string
  score: number
}

export interface SummaryRow {
  place: number
  teacherId: number
  fullName: string
  department: string | null
  categoryScores: CategoryScore[]
  totalScore: number
  status: ReportStatus
}

/** GET /api/reports/summary: сводный отчёт и рейтинг */
export interface SummaryDto {
  period: PeriodDto
  categories: CategoryDto[]
  rows: SummaryRow[]
}

export interface ControlRow {
  teacherId: number
  fullName: string
  department: string | null
  filledCount: number
  indicatorCount: number
  requiredFilled: number
  requiredCount: number
  totalScore: number
  /** null — преподаватель ещё ничего не вносил */
  status: ReportStatus | null
  updatedAt: string | null
}

/** GET /api/reports/control: контроль сдачи */
export interface ControlDto {
  period: PeriodDto
  teacherCount: number
  submittedCount: number
  inProgressCount: number
  notStartedCount: number
  rows: ControlRow[]
}
