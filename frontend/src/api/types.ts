// Формы данных, которыми обмениваются клиент и сервер.
// Повторяет контракт app/src/main/resources/static/openapi.yaml (ветка backend-first-stage, #136),
// он построен по ТЗ «Система учёта показателей эффективности» и «Порядку начисления баллов».
// Меняется контракт — правим и этот файл.

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

/** Дата ГГГГ-ММ-ДД */
export type IsoDate = string
/** Дата и время ISO 8601 */
export type IsoDateTime = string

// ---------- Пользователи и оргструктура (ТЗ 2, ФР-01) ----------

/** Функциональные роли (ТЗ 2.1). У одного человека их может быть несколько */
export type Role = 'EMPLOYEE' | 'REVIEWER' | 'DIRECTOR' | 'ADMIN'

/** Категории оценки (ТЗ 1.2): у сотрудника может быть несколько */
export type Category = 'PPS' | 'AUP' | 'ROP'

/** Отдельные полномочия: импорт, ввод за другого сотрудника, самостоятельный ввод АУП (ТЗ 2.2, 4.2) */
export type Permission = 'IMPORT' | 'ENTER_FOR_OTHERS' | 'AUP_SELF_ENTRY'

export interface DepartmentDto {
  id: number
  name: string
}

/** Образовательная программа */
export interface ProgramDto {
  id: number
  code: string
  name: string
  /** Программа «топ-ИТ»: только её дисциплины учитываются в показателях ППС 3–7 */
  topIt: boolean
}

export interface UserDto {
  id: number
  login: string
  /** Фамилия, имя и отчество через пробел */
  fullName: string
  lastName: string
  firstName: string
  middleName: string | null
  /** Стабильный внешний идентификатор сотрудника (импорт) */
  externalId: string | null
  roles: Role[]
  categories: Category[]
  permissions: Permission[]
  departmentId: number | null
  departmentName: string | null
  managerId: number | null
  position: string | null
  /** Программы, к которым привязан сотрудник */
  programIds: number[]
  /** Область проверки РОП (scope): обязательна при роли REVIEWER */
  reviewProgramIds: number[]
  /** false — учётная запись деактивирована */
  active: boolean
  /** Пароль временный: после входа нужно сменить */
  mustChangePassword: boolean
}

export interface UserRequest {
  lastName: string
  firstName: string
  middleName: string | null
  login: string
  roles: Role[]
  categories: Category[]
  departmentId: number | null
  position: string | null
  programIds: number[]
  reviewProgramIds: number[]
  permissions: Permission[]
  managerId: number | null
  externalId: string | null
  /** Временный пароль: обязателен при создании, при изменении игнорируется */
  password: string | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordRequest {
  password: string
}

export interface LoginRequest {
  login: string
  password: string
}

/** Краткие сведения о человеке в списках и карточках */
export interface PersonShort {
  id: number
  fullName: string
  departmentName: string | null
}

// ---------- Справочник показателей (ФР-02) ----------

/** Тип оценки: баллы (ППС, АУП) или целевое значение (РОП) */
export type EvaluationType = 'POINTS' | 'TARGET'

/** Порядок начисления (ТЗ 6.1) */
export type AccrualMethod = 'INDIVIDUAL' | 'SHARED'

/** Направление сравнения с целевым значением (ТЗ 6.3) */
export type TargetDirection = 'AT_LEAST' | 'AT_MOST'

/** Вид достижения у балльного показателя: по нему ищутся дубли (ТЗ 5.2) */
export type AchievementType = 'PUBLICATION' | 'UMK_DOCUMENT' | 'EVENT' | 'CONTRACT' | 'CONFERENCE' | 'OTHER'

export interface IndicatorDto {
  id: number
  /** Код показателя: ППС-01, АУП-04, РОП-11 */
  code: string
  name: string
  category: Category
  evaluationType: EvaluationType
  unit: string
  /** Базовый балл B за одно достижение; null у целевых показателей */
  basePoints: number | null
  /** Порядок начисления; null у целевых показателей */
  accrualMethod: AccrualMethod | null
  /** Вид достижения; null у целевых показателей */
  achievementType: AchievementType | null
  /** Целевое значение T; null у балльных показателей */
  targetValue: number | null
  /** Факт считается как процент: числитель / знаменатель × 100 */
  percent: boolean
  direction: TargetDirection | null
  /** Коэффициент c, по умолчанию 1 (ТЗ 6.2) */
  coefficient: number
  /** Максимальный балл за период; null — без ограничения */
  maxPoints: number | null
  /** Сколько раз за период можно начислить; null — без ограничения */
  maxRepeats: number | null
  /** Нужна образовательная программа топ-ИТ (дисциплина из её учебного плана) */
  requiresProgram: boolean
  /** Подтверждающие документы, как в «Порядке начисления баллов» */
  evidence: string
  /** Методика: числитель и знаменатель, шкала, источник (для РОП) */
  methodology: string | null
  /** Обязательный показатель */
  required: boolean
  /** Без подтверждающего документа не отправить */
  evidenceRequired: boolean
  /** Редакция показателя; новая редакция не меняет утверждённые результаты */
  version: number
  validFrom: IsoDate
  validTo: IsoDate | null
  archived: boolean
}

export type IndicatorVersionDto = Omit<IndicatorDto, 'id' | 'code' | 'archived'> & { createdAt: IsoDateTime }

export interface IndicatorRequest {
  code: string
  name: string
  category: Category
  evaluationType: EvaluationType
  unit: string
  basePoints: number | null
  accrualMethod: AccrualMethod | null
  achievementType: AchievementType | null
  targetValue: number | null
  percent: boolean
  direction: TargetDirection | null
  coefficient: number
  maxPoints: number | null
  maxRepeats: number | null
  requiresProgram: boolean
  evidence: string
  methodology: string | null
  required: boolean
  evidenceRequired: boolean
  /** С какой даты действует новая редакция; пусто — с сегодняшней */
  validFrom: IsoDate | null
}

// ---------- Отчётные периоды (ФР-09) ----------

export type PeriodType = 'MONTH' | 'QUARTER' | 'SEMESTER' | 'HALF_YEAR' | 'YEAR' | 'ACADEMIC_YEAR' | 'CUSTOM'

export interface PeriodDto {
  id: number
  name: string
  type: PeriodType
  startDate: IsoDate
  endDate: IsoDate
  closed: boolean
  closedAt: IsoDateTime | null
}

export interface PeriodRequest {
  name: string
  type: PeriodType
  startDate: IsoDate
  endDate: IsoDate
}

// ---------- Достижения (ФР-03, ФР-04, раздел 5) ----------

/** Маршрут обработки результата (ТЗ 4.1) */
export type ResultStatus =
  | 'DRAFT'
  | 'ON_REVIEW'
  | 'RETURNED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION'

/** Вид идентификатора для проверки дублей (ТЗ 5.2) */
export type IdentifierType = 'DOI' | 'URL' | 'DOC_NUMBER'

/** Участник достижения: сотрудник или внешний соавтор */
export interface ParticipantDto {
  /** null — внешний соавтор */
  userId: number | null
  fullName: string
  external: boolean
  /** Вес участия w; по умолчанию 1 (равные доли) */
  weight: number
  /** Доля α = w / Σw, 4 знака */
  share: number
  /** Балл участника B × α × c, 2 знака, распределён методом наибольших остатков */
  points: number
}

export interface ParticipantRequest {
  userId: number | null
  /** ФИО внешнего соавтора; для сотрудника не нужно */
  fullName: string | null
  weight: number
  /** Обоснование неравного веса */
  basis?: string | null
}

export interface EvidenceDto {
  id: number
  /** Тип документа: «Копия статьи», «Сертификат участника»… */
  docType: string
  /** Реквизиты документа: номер, дата */
  requisites: string | null
  /** Файл или ссылка: заполнено одно из двух */
  fileName: string | null
  size: number | null
  url: string | null
  version: number
  uploadedAt: IsoDateTime
  uploadedBy: string
}

/** Решение на маршруте согласования (ТЗ 11.1, Approval / Decision) */
export type DecisionAction =
  | 'CREATED'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'JOINED'
  | 'REVISION'

export interface DecisionDto {
  id: number
  action: DecisionAction
  actor: string
  comment: string | null
  at: IsoDateTime
}

export interface AchievementDto {
  id: number
  indicatorId: number
  indicatorCode: string
  indicatorName: string
  category: Category
  achievementType: AchievementType
  periodId: number
  periodName: string
  title: string
  eventDate: IsoDate
  identifierType: IdentifierType | null
  identifier: string | null
  programId: number | null
  programName: string | null
  /** Дисциплина учебного плана (показатели ППС 3–7) */
  discipline: string | null
  description: string | null
  quantity: number | null
  /** Кто подал заявку */
  owner: PersonShort
  /** Административный ввод за сотрудника: кто ввёл и на каком основании (ТЗ 2.2) */
  enteredBy: string | null
  basis: string | null
  participants: ParticipantDto[]
  /** Базовый балл показателя B на момент расчёта */
  basePoints: number
  coefficient: number
  status: ResultStatus
  /** Кто проверяет: РОП или, если заявитель сам РОП, директор (ТЗ 2.2, запрет конфликта интересов) */
  reviewer: 'ROP' | 'DIRECTOR'
  /** Найдена похожая запись: проверяющий решает, дубль ли это */
  possibleDuplicate: boolean
  /** Последнее замечание при возврате или причина отклонения */
  lastComment: string | null
  evidence: EvidenceDto[]
  history: DecisionDto[]
  /** Версия расчёта: растёт при пересмотре */
  version: number
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface AchievementRequest {
  indicatorId: number
  periodId: number
  title: string
  eventDate: IsoDate
  identifierType: IdentifierType | null
  identifier: string | null
  programId: number | null
  discipline: string | null
  description: string | null
  quantity?: number | null
  /** Сам заявитель добавляется сервером, здесь только соавторы */
  coauthors: ParticipantRequest[]
  /** Административный ввод: за кого и на каком основании */
  ownerId: number | null
  basis: string | null
}

/** Найденный возможный дубль (ТЗ 5.2) */
export interface DuplicateDto {
  achievementId: number
  title: string
  indicatorCode: string
  eventDate: IsoDate
  participants: string[]
  status: ResultStatus
  /** STRICT — совпал идентификатор, SIMILAR — похожие название и дата */
  match: 'STRICT' | 'SIMILAR'
}

/** Решение проверяющего или директора; comment обязателен для возврата и отклонения */
export interface DecisionRequest {
  comment: string | null
}

// ---------- Целевые показатели РОП (ТЗ 6.3) ----------

export interface MeasurementDto {
  id: number
  indicatorId: number
  indicatorCode: string
  indicatorName: string
  unit: string
  periodId: number
  programId: number
  programName: string
  target: number
  direction: TargetDirection
  percent: boolean
  /** Для процентных: числитель A и знаменатель D */
  numerator: number | null
  denominator: number | null
  /** Факт F; null — недостаточно данных (D = 0) */
  value: number | null
  /** P = 100 × F / T */
  achievementPercent: number | null
  /** Δ = F − T */
  deviation: number | null
  achieved: boolean | null
  /** Шкала для показателей удовлетворённости */
  scale: string | null
  source: string | null
  documentBasis: string | null
  status: ResultStatus
  lastComment: string | null
  version: number
  enteredBy: string
  updatedAt: IsoDateTime
}

export interface MeasurementRequest {
  indicatorId: number
  periodId: number
  programId: number
  value: number | null
  numerator: number | null
  denominator: number | null
  source: string | null
  scale?: string | null
  documentBasis?: string | null
}

// ---------- Баллы сотрудника (ТЗ 6.2, 8.2) ----------

export interface ScoreRow {
  indicatorId: number
  indicatorCode: string
  indicatorName: string
  category: Category
  basePoints: number
  accrualMethod: AccrualMethod
  maxPoints: number | null
  /** Утверждено директором: входит в официальный итог */
  approved: number
  /** На проверке РОП или на утверждении */
  onReview: number
  /** Введено, но не отправлено: черновики и возвращённые */
  entered: number
  /** Число достижений, по которым есть начисление */
  count: number
}

export interface MyScoresDto {
  period: PeriodDto
  rows: ScoreRow[]
  approvedTotal: number
  onReviewTotal: number
  enteredTotal: number
}

// ---------- Дашборды (раздел 8) ----------

export interface IndicatorSlice {
  code: string
  name: string
  approved: number
  pending: number
  count: number
}

export interface PersonSlice {
  userId: number
  fullName: string
  departmentName: string | null
  approved: number
  pending: number
}

export interface ProgramSlice {
  programId: number
  programName: string
  approved: number
}

export interface DynamicsPoint {
  periodName: string
  approved: number
}

export interface DirectorDashboardDto {
  period: PeriodDto
  pps: {
    employees: number
    approvedResults: number
    approvedPoints: number
    pendingPoints: number
    /** Доля результатов, которые ещё на проверке или утверждении, % */
    onReviewShare: number
    byIndicator: IndicatorSlice[]
    byEmployee: PersonSlice[]
    byProgram: ProgramSlice[]
    dynamics: DynamicsPoint[]
  }
  aup: {
    employees: number
    approvedPoints: number
    pendingPoints: number
    byIndicator: IndicatorSlice[]
    /** Результаты АУП без утверждения */
    unconfirmed: number
  }
  rop: MeasurementDto[]
  signals: {
    awaitingApproval: number
    onReview: number
    /** Целевые показатели РОП, которые не достигнуты */
    deviations: number
    periodEnd: IsoDate
  }
}

// ---------- Журнал аудита (ТЗ 1.3, п. 6) ----------

export interface AuditEventDto {
  id: number
  at: IsoDateTime
  actor: string
  /** Что сделано: CREATED, SUBMITTED, APPROVED, CLOSED… */
  action: string
  /** С чем: «Достижение #12 …», «Период …» */
  object: string
  comment: string | null
}

// ---------- Импорт XLSX (ТЗ 7) ----------

export type ImportType = 'EMPLOYEES' | 'INDICATORS' | 'MEASUREMENTS' | 'ACHIEVEMENTS'

export interface ImportRowDto {
  row: number
  /** NEW — создать, UPDATE — обновить, SKIP — уже есть, ERROR — не загрузится */
  action: 'NEW' | 'UPDATE' | 'SKIP' | 'ERROR'
  key: string
  message: string | null
}

export interface ImportJobDto {
  id: number
  type: ImportType
  fileName: string
  /** VALIDATED — проверен и ждёт подтверждения, APPLIED — загружен */
  status: 'VALIDATED' | 'APPLIED'
  uploadedBy: string
  uploadedAt: IsoDateTime
  rows: ImportRowDto[]
}
