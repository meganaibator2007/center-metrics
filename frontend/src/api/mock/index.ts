// Заглушки API на время, пока сервер не готов. Включаются VITE_API_MOCK=true (.env.development)
// и в итоговую сборку не попадают: client.ts загружает этот модуль только в режиме заглушек.
//
// Здесь повторены правила сервера из ТЗ, чтобы на заглушках работал весь сценарий:
// доли на всех авторов, маршрут ППС → РОП → директор, запрет самопроверки, дубли, цели РОП.
// Данные хранятся в sessionStorage: переживают F5 и смену пользователя, сбрасываются с закрытием вкладки.

import { ApiError } from '../errors'
import type {
  AchievementDto,
  AchievementRequest,
  AuditEventDto,
  Category,
  DirectorDashboardDto,
  DuplicateDto,
  EvidenceDto,
  IndicatorDto,
  IndicatorRequest,
  IndicatorSlice,
  IndicatorVersionDto,
  LoginRequest,
  MeasurementDto,
  MeasurementRequest,
  MyScoresDto,
  Page,
  PeriodDto,
  PeriodRequest,
  Permission,
  PersonShort,
  ResultStatus,
  Role,
  ScoreRow,
  UserDto,
  UserRequest,
} from '../types'
import { measure, normalizeIdentifier, normalizeTitle, round, splitPoints } from '../../lib/calc'
import { seed, type MockDb, type StoredAchievement, type StoredMeasurement } from './data'

const DB_KEY = 'center-metrics-mock-db-v3'
const SESSION_KEY = 'center-metrics-mock-login'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

interface Db extends MockDb {
  audit: AuditEventDto[]
  /** Прежние редакции показателей: id показателя → редакции */
  versions: Record<number, IndicatorVersionDto[]>
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    // Хранилище недоступно — начинаем с демо-данных
  }
  return { ...structuredClone(seed()), audit: [], versions: {} }
}

let db = load()

function save() {
  try {
    sessionStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Не запомнится после F5 — для демо не страшно
  }
}

/** Сбросить демо-данные к исходным (кнопка на странице входа) */
export function resetMockData() {
  db = { ...structuredClone(seed()), audit: [], versions: {} }
  save()
}

// ---------- Общие помощники ----------

function fail(status: number, title: string, errors?: Record<string, string>): never {
  throw new ApiError(status, { status, title, detail: title, errors })
}

function now() {
  return new Date().toISOString()
}

function today() {
  return now().slice(0, 10)
}

function newId() {
  db.nextId += 1
  return db.nextId
}

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
    // Вход просто не запомнится
  }
}

function currentUser(): UserDto {
  const login = sessionLogin()
  const user = db.users.find((u) => u.login === login && u.active)
  if (!user) fail(401, 'Нужно войти в систему')
  return user
}

function has(user: UserDto, ...roles: Role[]) {
  return roles.some((role) => user.roles.includes(role))
}

function can(user: UserDto, permission: Permission) {
  return has(user, 'ADMIN') || user.permissions.includes(permission)
}

function requireRole(user: UserDto, ...roles: Role[]) {
  if (!has(user, ...roles)) fail(403, 'Недостаточно прав для этого действия')
}

function audit(actor: UserDto, action: string, object: string, comment: string | null = null) {
  db.audit.unshift({ id: newId(), at: now(), actor: actor.fullName, action, object, comment })
}

function userById(id: number) {
  const user = db.users.find((u) => u.id === id)
  if (!user) fail(404, 'Сотрудник не найден')
  return user
}

function indicatorById(id: number) {
  const indicator = db.indicators.find((i) => i.id === id)
  if (!indicator) fail(404, 'Показатель не найден')
  return indicator
}

function periodById(id: number) {
  const period = db.periods.find((p) => p.id === id)
  if (!period) fail(404, 'Период не найден')
  return period
}

/** Текущий период: открытый квартал, в который попадает сегодня, иначе первый открытый */
function currentPeriod(): PeriodDto {
  const today = new Date().toISOString().slice(0, 10)
  const open = db.periods.filter((p) => !p.closed)
  return (
    open.find((p) => p.type === 'QUARTER' && p.startDate <= today && today <= p.endDate) ??
    open.find((p) => p.startDate <= today && today <= p.endDate) ??
    open[0] ??
    db.periods[0]
  )
}

function periodFrom(params: URLSearchParams): PeriodDto {
  const id = params.get('periodId')
  return id ? periodById(Number(id)) : currentPeriod()
}

function short(user: UserDto): PersonShort {
  return { id: user.id, fullName: user.fullName, departmentName: user.departmentName }
}

function paginate<T>(items: T[], params: URLSearchParams): Page<T> {
  const size = Number(params.get('size') ?? 20)
  const number = Number(params.get('page') ?? 0)
  return {
    content: items.slice(number * size, number * size + size),
    page: { size, number, totalElements: items.length, totalPages: Math.max(1, Math.ceil(items.length / size)) },
  }
}

// ---------- Достижения ----------

const EDITABLE: ResultStatus[] = ['DRAFT', 'RETURNED', 'REVISION']
const PENDING: ResultStatus[] = ['ON_REVIEW', 'REVIEWED', 'REVISION']
const ENTERED: ResultStatus[] = ['DRAFT', 'RETURNED']

function achievementById(id: number) {
  const item = db.achievements.find((a) => a.id === id)
  if (!item) fail(404, 'Достижение не найдено')
  return item
}

function isParticipant(user: UserDto, a: StoredAchievement) {
  return a.ownerId === user.id || a.participants.some((p) => p.userId === user.id)
}

/** РОП проверяет результаты своей образовательной программы (scope) и результаты АУП */
function inReviewerScope(user: UserDto, a: StoredAchievement) {
  const owner = userById(a.ownerId)
  if (owner.categories.includes('AUP')) return true
  const programs = new Set(user.reviewProgramIds)
  return (a.programId !== null && programs.has(a.programId)) || owner.programIds.some((id) => programs.has(id))
}

/** Кто может вызвать /review: РОП своей области или директор, если заявитель сам РОП (ТЗ 2.2, 4.2) */
function canReview(user: UserDto, a: StoredAchievement) {
  if (a.status !== 'ON_REVIEW' || isParticipant(user, a)) return false
  return a.reviewer === 'ROP' ? has(user, 'REVIEWER') && inReviewerScope(user, a) : has(user, 'DIRECTOR')
}

/** Утвердить может только директор и только после проверки */
function canApprove(user: UserDto, a: StoredAchievement) {
  return has(user, 'DIRECTOR') && a.status === 'REVIEWED' && !isParticipant(user, a)
}

function inReviewQueue(user: UserDto, a: StoredAchievement) {
  return has(user, 'REVIEWER') && a.reviewer === 'ROP' && canReview(user, a)
}

/** Очередь директора: проверить результаты самих РОП и утвердить проверенное */
function inApprovalQueue(user: UserDto, a: StoredAchievement) {
  return has(user, 'DIRECTOR') && (canApprove(user, a) || (a.reviewer === 'DIRECTOR' && canReview(user, a)))
}

function canView(user: UserDto, a: StoredAchievement) {
  return (
    has(user, 'ADMIN', 'DIRECTOR') ||
    isParticipant(user, a) ||
    a.enteredBy === user.fullName ||
    (has(user, 'REVIEWER') && inReviewerScope(user, a))
  )
}

function canEdit(user: UserDto, a: StoredAchievement) {
  return EDITABLE.includes(a.status) && (a.ownerId === user.id || a.enteredBy === user.fullName)
}

function toAchievement(a: StoredAchievement): AchievementDto {
  const indicator = indicatorById(a.indicatorId)
  const period = periodById(a.periodId)
  const owner = userById(a.ownerId)
  const program = db.programs.find((p) => p.id === a.programId) ?? null
  const base = indicator.basePoints ?? 0
  const split = splitPoints(base, indicator.coefficient, a.participants.map((p) => p.weight))
  return {
    id: a.id,
    indicatorId: indicator.id,
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    category: indicator.category,
    achievementType: indicator.achievementType ?? 'OTHER',
    periodId: period.id,
    periodName: period.name,
    title: a.title,
    eventDate: a.eventDate,
    identifierType: a.identifierType,
    identifier: a.identifier,
    programId: a.programId,
    programName: program ? `${program.code} ${program.name}` : null,
    discipline: a.discipline,
    description: a.description,
    quantity: a.quantity ?? null,
    owner: short(owner),
    enteredBy: a.enteredBy,
    basis: a.basis,
    participants: a.participants.map((p, i) => ({
      userId: p.userId,
      fullName: p.fullName,
      external: p.userId === null,
      weight: p.weight,
      share: split[i].share,
      points: split[i].points,
    })),
    basePoints: base,
    coefficient: indicator.coefficient,
    status: a.status,
    reviewer: a.reviewer,
    possibleDuplicate: findDuplicates(a, a.id).length > 0,
    lastComment: a.lastComment,
    evidence: a.evidence,
    history: a.history,
    version: a.version,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

/** Строгие ключи — DOI и номер документа; URL идентифицирует объект ненадёжно (ТЗ 5.2, шаг 2) */
const STRICT_KEYS = ['DOI', 'DOC_NUMBER']

function findDuplicates(
  data: { indicatorId: number; identifierType: string | null; identifier: string | null; title: string; eventDate: string },
  excludeId: number | null,
): DuplicateDto[] {
  const identifier = data.identifier && data.identifierType ? normalizeIdentifier(data.identifier) : null
  const strictKey = data.identifierType !== null && STRICT_KEYS.includes(data.identifierType)
  const title = normalizeTitle(data.title)
  const result: DuplicateDto[] = []
  for (const a of db.achievements) {
    if (a.id === excludeId || a.status === 'REJECTED') continue
    const sameIdentifier = identifier !== null && a.identifier !== null && normalizeIdentifier(a.identifier) === identifier
    const strict = sameIdentifier && strictKey && a.identifierType === data.identifierType
    const similar =
      !strict &&
      (sameIdentifier ||
        (title.length > 0 &&
          (normalizeTitle(a.title) === title || (a.indicatorId === data.indicatorId && a.eventDate === data.eventDate))))
    if (strict || similar) {
      result.push({
        achievementId: a.id,
        title: a.title,
        indicatorCode: indicatorById(a.indicatorId).code,
        eventDate: a.eventDate,
        participants: a.participants.map((p) => p.fullName),
        status: a.status,
        match: strict ? 'STRICT' : 'SIMILAR',
      })
    }
  }
  return result
}

function validateAchievement(user: UserDto, body: AchievementRequest, existing: StoredAchievement | null) {
  const errors: Record<string, string> = {}
  const indicator = db.indicators.find((i) => i.id === body.indicatorId)
  const period = db.periods.find((p) => p.id === body.periodId)
  let owner = user
  if (body.ownerId !== null && body.ownerId !== user.id) {
    if (!can(user, 'ENTER_FOR_OTHERS')) fail(403, 'Вводить результаты за другого сотрудника может админ или пользователь с полномочием ENTER_FOR_OTHERS')
    owner = userById(body.ownerId)
    if (!body.basis?.trim()) errors.basis = 'Укажите основание административного ввода'
  } else if (existing) {
    owner = userById(existing.ownerId)
  }

  if (!indicator || indicator.archived) errors.indicatorId = 'Выберите показатель'
  else if (indicator.evaluationType !== 'POINTS') errors.indicatorId = 'Целевые показатели РОП вносятся на странице «Целевые показатели»'
  else if (!owner.categories.includes(indicator.category)) errors.indicatorId = 'Показатель не относится к категории оценки сотрудника'
  else if (indicator.category === 'AUP' && owner.id === user.id && !user.permissions.includes('AUP_SELF_ENTRY'))
    errors.indicatorId = 'Результаты АУП вносит уполномоченный пользователь по данным РОП (ТЗ 4.2)'
  if (!period) errors.periodId = 'Выберите отчётный период'
  else if (period.closed) errors.periodId = 'Период закрыт: изменения только через процедуру пересмотра'
  if (!body.title.trim()) errors.title = 'Введите наименование'
  if (!body.eventDate) errors.eventDate = 'Укажите дату события'
  else if (period && (body.eventDate < period.startDate || body.eventDate > period.endDate))
    errors.eventDate = `Дата должна попадать в период «${period.name}»`
  if (body.identifierType && !body.identifier?.trim()) errors.identifier = 'Введите идентификатор или уберите его тип'
  if (indicator?.requiresProgram) {
    const program = db.programs.find((p) => p.id === body.programId)
    if (!program) errors.programId = 'Для этого показателя нужна образовательная программа'
    else if (!program.topIt) errors.programId = 'Учитываются только дисциплины ОП топ-ИТ'
    if (!body.discipline?.trim()) errors.discipline = 'Укажите дисциплину учебного плана'
  }
  if (indicator?.accrualMethod === 'INDIVIDUAL' && body.coauthors.length > 0)
    errors.coauthors = 'Показатель начисляется индивидуально: соавторов не указывают'
  const seen = new Set<number>([owner.id])
  for (const c of body.coauthors) {
    if (c.userId !== null) {
      if (seen.has(c.userId)) errors.coauthors = 'Один и тот же сотрудник указан дважды'
      seen.add(c.userId)
    } else if (!c.fullName?.trim()) {
      errors.coauthors = 'Укажите ФИО внешнего соавтора'
    }
    if (!(c.weight > 0)) errors.coauthors = 'Вес участия должен быть больше нуля'
  }
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)
  return { owner, indicator: indicator as IndicatorDto }
}

function applyRequest(target: StoredAchievement, body: AchievementRequest, owner: UserDto) {
  target.indicatorId = body.indicatorId
  target.periodId = body.periodId
  target.title = body.title.trim()
  target.eventDate = body.eventDate
  target.identifierType = body.identifierType
  target.identifier = body.identifier?.trim() || null
  target.programId = body.programId
  target.discipline = body.discipline?.trim() || null
  target.description = body.description?.trim() || null
  target.quantity = body.quantity ?? null
  target.participants = [
    { userId: owner.id, fullName: owner.fullName, weight: target.participants[0]?.weight ?? 1 },
    ...body.coauthors.map((c) => ({
      userId: c.userId,
      fullName: c.userId !== null ? userById(c.userId).fullName : (c.fullName ?? '').trim(),
      weight: c.weight,
    })),
  ]
  target.updatedAt = now()
}

function decide(a: StoredAchievement, actor: UserDto, action: AchievementDto['history'][number]['action'], comment: string | null) {
  a.history.push({ id: newId(), action, actor: actor.fullName, comment, at: now() })
  a.updatedAt = now()
  audit(actor, action, `Достижение #${a.id} «${a.title}»`, comment)
}

function requireComment(body: unknown): string {
  const comment = (body as { comment?: string | null } | undefined)?.comment?.trim()
  if (!comment) fail(400, 'Укажите причину', { comment: 'Комментарий обязателен' })
  return comment
}

function listAchievements(user: UserDto, params: URLSearchParams): AchievementDto[] {
  const scope = params.get('scope') ?? 'my'
  const status = params.get('status')
  const periodId = params.get('periodId')
  const q = params.get('q')?.toLowerCase().trim()
  const category = params.get('category')
  const indicatorId = params.get('indicatorId')
  const userId = params.get('userId')
  let items = db.achievements.filter((a) => {
    switch (scope) {
      case 'my':
        return isParticipant(user, a) || a.enteredBy === user.fullName
      case 'review':
        return inReviewQueue(user, a)
      case 'approval':
        return inApprovalQueue(user, a)
      default:
        return canView(user, a)
    }
  })
  if (status) items = items.filter((a) => status.split(',').includes(a.status))
  if (periodId) items = items.filter((a) => a.periodId === Number(periodId))
  if (category) items = items.filter((a) => indicatorById(a.indicatorId).category === category)
  if (indicatorId) items = items.filter((a) => a.indicatorId === Number(indicatorId))
  if (userId) items = items.filter((a) => a.participants.some((p) => p.userId === Number(userId)))
  if (q)
    items = items.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.identifier ?? '').toLowerCase().includes(q) ||
        a.participants.some((p) => p.fullName.toLowerCase().includes(q)),
    )
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(toAchievement)
}

// ---------- Баллы ----------

function scoresFor(user: UserDto, period: PeriodDto): MyScoresDto {
  const rows: ScoreRow[] = db.indicators
    .filter((i) => i.evaluationType === 'POINTS' && !i.archived && user.categories.includes(i.category))
    .map((indicator) => {
      let approved = 0
      let onReview = 0
      let entered = 0
      let count = 0
      for (const a of db.achievements) {
        if (a.indicatorId !== indicator.id || a.periodId !== period.id) continue
        const index = a.participants.findIndex((p) => p.userId === user.id)
        if (index < 0) continue
        const points = toAchievement(a).participants[index].points
        if (a.status === 'APPROVED') approved += points
        else if (PENDING.includes(a.status)) onReview += points
        else if (ENTERED.includes(a.status)) entered += points
        else continue
        count += 1
      }
      // S = min(M, Σ): максимум ограничивает только официальный итог (ТЗ 6.2)
      if (indicator.maxPoints !== null) approved = Math.min(approved, indicator.maxPoints)
      return {
        indicatorId: indicator.id,
        indicatorCode: indicator.code,
        indicatorName: indicator.name,
        category: indicator.category,
        basePoints: indicator.basePoints ?? 0,
        accrualMethod: indicator.accrualMethod ?? 'INDIVIDUAL',
        maxPoints: indicator.maxPoints,
        approved: round(approved),
        onReview: round(onReview),
        entered: round(entered),
        count,
      }
    })
  return {
    period,
    rows,
    approvedTotal: round(rows.reduce((s, r) => s + r.approved, 0)),
    onReviewTotal: round(rows.reduce((s, r) => s + r.onReview, 0)),
    enteredTotal: round(rows.reduce((s, r) => s + r.entered, 0)),
  }
}

// ---------- Целевые показатели РОП ----------

function toMeasurement(m: StoredMeasurement): MeasurementDto {
  const indicator = indicatorById(m.indicatorId)
  const program = db.programs.find((p) => p.id === m.programId)
  const target = indicator.targetValue ?? 0
  const direction = indicator.direction ?? 'AT_LEAST'
  const calc = measure(target, direction, indicator.percent, m.value, m.numerator, m.denominator)
  return {
    id: m.id,
    indicatorId: indicator.id,
    indicatorCode: indicator.code,
    indicatorName: indicator.name,
    unit: indicator.unit,
    periodId: m.periodId,
    programId: m.programId,
    programName: program ? `${program.code} ${program.name}` : '',
    target,
    direction,
    percent: indicator.percent,
    numerator: m.numerator,
    denominator: m.denominator,
    ...calc,
    scale: m.scale,
    source: m.source,
    documentBasis: m.documentBasis,
    status: m.status,
    lastComment: m.lastComment,
    version: m.version,
    enteredBy: m.enteredBy,
    updatedAt: m.updatedAt,
  }
}

function measurementById(id: number) {
  const item = db.measurements.find((m) => m.id === id)
  if (!item) fail(404, 'Измерение не найдено')
  return item
}

function canEditMeasurement(user: UserDto, programId: number) {
  return has(user, 'ADMIN') || (has(user, 'REVIEWER') && user.reviewProgramIds.includes(programId))
}

function saveMeasurement(user: UserDto, body: MeasurementRequest, existing: StoredMeasurement | null) {
  const indicator = indicatorById(body.indicatorId)
  const period = periodById(body.periodId)
  const errors: Record<string, string> = {}
  if (indicator.evaluationType !== 'TARGET') errors.indicatorId = 'Это не целевой показатель'
  if (period.closed) errors.periodId = 'Период закрыт'
  if (!db.programs.some((p) => p.id === body.programId)) errors.programId = 'Выберите образовательную программу'
  else if (!canEditMeasurement(user, body.programId)) fail(403, 'Можно вносить данные только по своей образовательной программе')
  if (indicator.percent) {
    if (body.numerator === null || body.numerator < 0) errors.numerator = 'Введите числитель'
    if (body.denominator === null || body.denominator < 0) errors.denominator = 'Введите знаменатель'
    if (body.numerator !== null && body.denominator !== null && body.numerator > body.denominator)
      errors.numerator = 'Числитель не может быть больше знаменателя'
  } else if (body.value === null || body.value < 0) {
    errors.value = 'Введите фактическое значение'
  }
  const duplicate = db.measurements.find(
    (m) => m.id !== existing?.id && m.indicatorId === body.indicatorId && m.periodId === body.periodId && m.programId === body.programId,
  )
  if (duplicate) fail(409, 'За этот период по этой программе значение уже внесено — откройте его и исправьте')
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)

  const target = existing ?? ({ id: newId(), status: 'DRAFT', lastComment: null, version: 1 } as StoredMeasurement)
  Object.assign(target, {
    indicatorId: body.indicatorId,
    periodId: body.periodId,
    programId: body.programId,
    value: indicator.percent ? null : body.value,
    numerator: indicator.percent ? body.numerator : null,
    denominator: indicator.percent ? body.denominator : null,
    source: body.source?.trim() || null,
    scale: body.scale?.trim() || null,
    documentBasis: body.documentBasis?.trim() || null,
    enteredBy: user.fullName,
    updatedAt: now(),
  })
  if (!existing) db.measurements.push(target)
  audit(user, existing ? 'UPDATED' : 'CREATED', `Измерение ${indicator.code}`)
  return target
}

// ---------- Дашборд директора ----------

function slices(category: Category, period: PeriodDto): IndicatorSlice[] {
  return db.indicators
    .filter((i) => i.category === category && i.evaluationType === 'POINTS')
    .map((indicator) => {
      let approved = 0
      let pending = 0
      let count = 0
      for (const a of db.achievements) {
        if (a.indicatorId !== indicator.id || a.periodId !== period.id) continue
        const internal = toAchievement(a).participants.filter((p) => !p.external)
        const sum = internal.reduce((s, p) => s + p.points, 0)
        if (a.status === 'APPROVED') {
          approved += sum
          count += 1
        } else if (PENDING.includes(a.status)) pending += sum
      }
      return { code: indicator.code, name: indicator.name, approved: round(approved), pending: round(pending), count }
    })
}

function directorDashboard(period: PeriodDto): DirectorDashboardDto {
  const pps = slices('PPS', period)
  const aup = slices('AUP', period)
  const inPeriod = db.achievements.filter((a) => a.periodId === period.id)
  const ppsItems = inPeriod.filter((a) => indicatorById(a.indicatorId).category === 'PPS')
  const submitted = ppsItems.filter((a) => a.status !== 'DRAFT')
  const ppsUsers = db.users.filter((u) => u.active && u.categories.includes('PPS'))

  const byEmployee = ppsUsers
    .map((u) => {
      const s = scoresFor(u, period)
      const ppsRows = s.rows.filter((r) => r.category === 'PPS')
      return {
        userId: u.id,
        fullName: u.fullName,
        departmentName: u.departmentName,
        approved: round(ppsRows.reduce((sum, r) => sum + r.approved, 0)),
        pending: round(ppsRows.reduce((sum, r) => sum + r.onReview, 0)),
      }
    })
    .sort((a, b) => b.approved - a.approved)

  const byProgram = db.programs.map((program) => {
    let approved = 0
    for (const a of ppsItems) {
      if (a.status !== 'APPROVED') continue
      const owner = userById(a.ownerId)
      if (a.programId === program.id || (a.programId === null && owner.programIds[0] === program.id)) {
        approved += toAchievement(a)
          .participants.filter((p) => !p.external)
          .reduce((s, p) => s + p.points, 0)
      }
    }
    return { programId: program.id, programName: `${program.code} ${program.name}`, approved: round(approved) }
  })

  const quarters = db.periods.filter((p) => p.type === period.type).sort((a, b) => a.startDate.localeCompare(b.startDate))
  const dynamics = quarters.map((p) => ({
    periodName: p.name,
    approved: round(slices('PPS', p).reduce((s, x) => s + x.approved, 0)),
  }))

  const ropPeriod = db.periods.find((p) => p.type === 'YEAR' && p.startDate <= period.startDate && period.endDate <= p.endDate) ?? period
  const rop = db.measurements.filter((m) => m.periodId === ropPeriod.id).map(toMeasurement)

  const director = db.users.find((u) => u.roles.includes('DIRECTOR'))
  return {
    period,
    pps: {
      employees: ppsUsers.length,
      approvedResults: ppsItems.filter((a) => a.status === 'APPROVED').length,
      approvedPoints: round(pps.reduce((s, x) => s + x.approved, 0)),
      pendingPoints: round(pps.reduce((s, x) => s + x.pending, 0)),
      onReviewShare: submitted.length ? round((100 * submitted.filter((a) => PENDING.includes(a.status)).length) / submitted.length, 0) : 0,
      byIndicator: pps,
      byEmployee,
      byProgram,
      dynamics,
    },
    aup: {
      employees: db.users.filter((u) => u.active && u.categories.includes('AUP')).length,
      approvedPoints: round(aup.reduce((s, x) => s + x.approved, 0)),
      pendingPoints: round(aup.reduce((s, x) => s + x.pending, 0)),
      byIndicator: aup,
      unconfirmed: inPeriod.filter((a) => indicatorById(a.indicatorId).category === 'AUP' && a.status !== 'APPROVED' && a.status !== 'REJECTED').length,
    },
    rop,
    signals: {
      awaitingApproval: director ? db.achievements.filter((a) => inApprovalQueue(director, a)).length : 0,
      onReview: db.achievements.filter((a) => a.status === 'ON_REVIEW' && a.reviewer === 'ROP').length,
      deviations: rop.filter((m) => m.achieved === false).length,
      periodEnd: period.endDate,
    },
  }
}

// ---------- Маршрутизация ----------

type Handler = (args: { params: URLSearchParams; body: unknown; ids: number[] }) => unknown

const routes: Array<[string, RegExp, Handler]> = []
function route(method: string, pattern: string, handler: Handler) {
  routes.push([method, new RegExp(`^${pattern.replace(/\{id\}/g, '(\\d+)')}$`), handler])
}

route('GET', '/auth/csrf', () => undefined)
route('POST', '/auth/login', ({ body }) => {
  const { login, password } = body as LoginRequest
  const user = db.users.find((u) => u.login === login.trim().toLowerCase())
  if (!user || !password) fail(401, 'Неверный логин или пароль')
  if (!user.active) fail(401, 'Учётная запись деактивирована')
  setSessionLogin(user.login)
  return user
})
route('POST', '/auth/logout', () => {
  setSessionLogin(null)
  return undefined
})
route('GET', '/auth/me', () => currentUser())

route('GET', '/departments', () => (currentUser(), db.departments))
route('GET', '/programs', () => (currentUser(), db.programs))
route('GET', '/employees', () => {
  currentUser()
  return db.users.filter((u) => u.active && u.roles.includes('EMPLOYEE')).map(short)
})

route('GET', '/users', ({ params }) => {
  requireRole(currentUser(), 'ADMIN', 'DIRECTOR')
  const q = params.get('q')?.toLowerCase().trim()
  const role = params.get('role')
  const category = params.get('category')
  const active = params.get('active')
  let items = db.users
  if (q) items = items.filter((u) => u.fullName.toLowerCase().includes(q) || u.login.includes(q))
  if (role) items = items.filter((u) => u.roles.includes(role as Role))
  if (category) items = items.filter((u) => u.categories.includes(category as Category))
  if (active) items = items.filter((u) => String(u.active) === active)
  return paginate([...items].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru')), params)
})
route('GET', '/users/{id}', ({ ids }) => {
  requireRole(currentUser(), 'ADMIN', 'DIRECTOR')
  return userById(ids[0])
})

function saveUser(actor: UserDto, body: UserRequest, existing: UserDto | null): UserDto {
  requireRole(actor, 'ADMIN')
  const errors: Record<string, string> = {}
  const login = body.login.trim().toLowerCase()
  if (!body.lastName.trim()) errors.lastName = 'Введите фамилию'
  if (!body.firstName.trim()) errors.firstName = 'Введите имя'
  if (!/^[a-z0-9.-]{3,50}$/.test(login)) errors.login = 'Латинские буквы, цифры, точка и дефис, от 3 до 50 символов'
  else if (db.users.some((u) => u.login === login && u.id !== existing?.id)) errors.login = 'Такой логин уже занят'
  if (body.roles.length === 0) errors.roles = 'Выберите хотя бы одну роль'
  if (body.roles.includes('EMPLOYEE') && body.categories.length === 0) errors.categories = 'Сотруднику нужна категория оценки'
  if (body.roles.includes('REVIEWER') && (body.reviewProgramIds ?? []).length === 0)
    errors.reviewProgramIds = 'Укажите программы, которые проверяет РОП'
  if (!existing && (!body.password || body.password.length < 8)) errors.password = 'Временный пароль — не короче 8 символов'
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)
  const middleName = body.middleName?.trim() || null
  const data: UserDto = {
    id: existing?.id ?? newId(),
    login,
    lastName: body.lastName.trim(),
    firstName: body.firstName.trim(),
    middleName,
    fullName: [body.lastName.trim(), body.firstName.trim(), middleName].filter(Boolean).join(' '),
    externalId: body.externalId?.trim() || existing?.externalId || null,
    roles: body.roles,
    categories: body.categories,
    permissions: body.permissions ?? [],
    departmentId: body.departmentId,
    departmentName: db.departments.find((d) => d.id === body.departmentId)?.name ?? null,
    managerId: body.managerId ?? null,
    position: body.position?.trim() || null,
    programIds: body.programIds,
    reviewProgramIds: body.roles.includes('REVIEWER') ? (body.reviewProgramIds ?? []) : [],
    active: existing?.active ?? true,
    // Новому сотруднику выдан временный пароль — после входа его нужно сменить
    mustChangePassword: existing?.mustChangePassword ?? true,
  }
  if (existing) Object.assign(existing, data)
  else db.users.push(data)
  audit(actor, existing ? 'UPDATED' : 'CREATED', `Пользователь ${data.login}`)
  return existing ?? data
}

route('POST', '/users', ({ body }) => saveUser(currentUser(), body as UserRequest, null))
route('PUT', '/users/{id}', ({ body, ids }) => saveUser(currentUser(), body as UserRequest, userById(ids[0])))
route('POST', '/users/{id}/reset-password', ({ body, ids }) => {
  const actor = currentUser()
  requireRole(actor, 'ADMIN')
  const password = (body as { password?: string }).password ?? ''
  if (password.length < 8) fail(400, 'Проверьте поля формы', { password: 'Временный пароль — не короче 8 символов' })
  const user = userById(ids[0])
  user.mustChangePassword = true
  audit(actor, 'PASSWORD_RESET', `Пользователь ${user.login}`)
  return undefined
})
route('POST', '/auth/password', ({ body }) => {
  const user = currentUser()
  const { currentPassword, newPassword } = body as { currentPassword: string; newPassword: string }
  const errors: Record<string, string> = {}
  if (!currentPassword) errors.currentPassword = 'Введите текущий пароль'
  if (!newPassword || newPassword.length < 8) errors.newPassword = 'Новый пароль — не короче 8 символов'
  else if (newPassword === currentPassword) errors.newPassword = 'Новый пароль должен отличаться от текущего'
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)
  user.mustChangePassword = false
  audit(user, 'PASSWORD_CHANGED', `Пользователь ${user.login}`)
  return undefined
})
route('PATCH', '/users/{id}/active', ({ body, ids }) => {
  const actor = currentUser()
  requireRole(actor, 'ADMIN')
  const user = userById(ids[0])
  if (user.id === actor.id) fail(409, 'Нельзя деактивировать собственную учётную запись')
  user.active = (body as { active: boolean }).active
  audit(actor, user.active ? 'ACTIVATED' : 'DEACTIVATED', `Пользователь ${user.login}`)
  return user
})

route('GET', '/indicators', ({ params }) => {
  currentUser()
  const category = params.get('category')
  const type = params.get('evaluationType')
  const archived = params.get('archived')
  return db.indicators.filter(
    (i) =>
      (!category || i.category === category) &&
      (!type || i.evaluationType === type) &&
      (archived === null || String(i.archived) === archived),
  )
})
route('GET', '/indicators/{id}', ({ ids }) => (currentUser(), indicatorById(ids[0])))
route('GET', '/indicators/{id}/versions', ({ ids }) => {
  currentUser()
  const { id: _id, code: _code, archived: _archived, ...current } = indicatorById(ids[0])
  void _id
  void _code
  void _archived
  return [...(db.versions[ids[0]] ?? []), { ...current, createdAt: now() }]
})

function saveIndicator(actor: UserDto, body: IndicatorRequest, existing: IndicatorDto | null): IndicatorDto {
  requireRole(actor, 'ADMIN')
  const errors: Record<string, string> = {}
  if (!body.code.trim()) errors.code = 'Введите код'
  else if (db.indicators.some((i) => i.code === body.code.trim() && i.id !== existing?.id)) errors.code = 'Такой код уже есть'
  if (!body.name.trim()) errors.name = 'Введите наименование'
  if (body.evaluationType === 'POINTS' && !(Number(body.basePoints) > 0)) errors.basePoints = 'Базовый балл больше нуля'
  if (body.evaluationType === 'TARGET' && !(Number(body.targetValue) > 0)) errors.targetValue = 'Целевое значение больше нуля'
  if (!(body.coefficient > 0)) errors.coefficient = 'Коэффициент больше нуля'
  // Категория задаёт тип оценки: ППС и АУП — баллы, РОП — цели (ТЗ 1.3, п. 5)
  if ((body.category === 'ROP') !== (body.evaluationType === 'TARGET'))
    errors.evaluationType = 'У РОП — целевые значения, у ППС и АУП — баллы'
  if (body.evaluationType === 'POINTS' && !body.achievementType) errors.achievementType = 'Выберите вид достижения'
  if (body.evaluationType === 'POINTS' && (body.direction !== null || body.targetValue !== null))
    errors.evaluationType = 'У балльного показателя нет цели и направления'
  if (body.evaluationType === 'TARGET' && (body.accrualMethod !== null || body.achievementType !== null || body.basePoints !== null))
    errors.evaluationType = 'У целевого показателя нет балла, порядка начисления и вида достижения'
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)
  const points = body.evaluationType === 'POINTS'
  if (existing) {
    const { id: _id, code: _code, archived: _archived, ...previous } = existing
    void _id
    void _code
    void _archived
    db.versions[existing.id] = [...(db.versions[existing.id] ?? []), { ...previous, validTo: today(), createdAt: now() }]
  }
  const data: IndicatorDto = {
    id: existing?.id ?? newId(),
    code: body.code.trim(),
    name: body.name.trim(),
    category: body.category,
    evaluationType: body.evaluationType,
    unit: body.unit.trim() || 'шт.',
    basePoints: points ? body.basePoints : null,
    accrualMethod: points ? (body.accrualMethod ?? 'INDIVIDUAL') : null,
    achievementType: points ? body.achievementType : null,
    targetValue: points ? null : body.targetValue,
    percent: points ? false : body.percent,
    direction: points ? null : (body.direction ?? 'AT_LEAST'),
    coefficient: body.coefficient,
    maxPoints: body.maxPoints,
    maxRepeats: body.maxRepeats,
    requiresProgram: body.requiresProgram,
    evidence: body.evidence.trim(),
    methodology: body.methodology?.trim() || null,
    required: body.required,
    evidenceRequired: body.evidenceRequired,
    // Новая редакция: утверждённые результаты считаются по своей версии (ТЗ 3.2)
    version: existing ? existing.version + 1 : 1,
    validFrom: body.validFrom || today(),
    validTo: null,
    archived: existing?.archived ?? false,
  }
  if (existing) Object.assign(existing, data)
  else db.indicators.push(data)
  audit(actor, existing ? 'NEW_VERSION' : 'CREATED', `Показатель ${data.code}`, existing ? `Редакция ${data.version}` : null)
  return existing ?? data
}

route('POST', '/indicators', ({ body }) => saveIndicator(currentUser(), body as IndicatorRequest, null))
route('PUT', '/indicators/{id}', ({ body, ids }) => saveIndicator(currentUser(), body as IndicatorRequest, indicatorById(ids[0])))
route('POST', '/indicators/{id}/archive', ({ ids }) => {
  const actor = currentUser()
  requireRole(actor, 'ADMIN')
  const indicator = indicatorById(ids[0])
  indicator.archived = !indicator.archived
  audit(actor, indicator.archived ? 'ARCHIVED' : 'RESTORED', `Показатель ${indicator.code}`)
  return indicator
})

route('GET', '/periods', () => (currentUser(), [...db.periods].sort((a, b) => b.startDate.localeCompare(a.startDate))))
route('GET', '/periods/current', () => (currentUser(), currentPeriod()))
route('POST', '/periods', ({ body }) => {
  const actor = currentUser()
  requireRole(actor, 'ADMIN')
  const p = body as PeriodRequest
  const errors: Record<string, string> = {}
  if (!p.name.trim()) errors.name = 'Введите название'
  if (!p.startDate) errors.startDate = 'Укажите начало'
  if (!p.endDate) errors.endDate = 'Укажите окончание'
  else if (p.startDate && p.endDate < p.startDate) errors.endDate = 'Окончание раньше начала'
  if (Object.keys(errors).length > 0) fail(400, 'Проверьте поля формы', errors)
  const overlap = db.periods.find((x) => x.type === p.type && p.type !== 'CUSTOM' && x.startDate <= p.endDate && p.startDate <= x.endDate)
  if (overlap) fail(409, `Период пересекается с «${overlap.name}» того же типа`)
  const period: PeriodDto = { id: newId(), ...p, name: p.name.trim(), closed: false, closedAt: null }
  db.periods.push(period)
  audit(actor, 'CREATED', `Период «${period.name}»`)
  return period
})
route('POST', '/periods/{id}/close', ({ ids }) => {
  const actor = currentUser()
  requireRole(actor, 'ADMIN')
  const period = periodById(ids[0])
  period.closed = true
  period.closedAt = now()
  audit(actor, 'CLOSED', `Период «${period.name}»`, 'Сформирован снимок официальных итогов')
  return period
})
route('POST', '/periods/{id}/reopen', ({ ids, body }) => {
  // Переоткрытие закрытого периода — решение директора (ТЗ 4.3)
  const actor = currentUser()
  requireRole(actor, 'DIRECTOR')
  const comment = requireComment(body)
  const period = periodById(ids[0])
  period.closed = false
  period.closedAt = null
  audit(actor, 'REOPENED', `Период «${period.name}»`, comment)
  return period
})

route('GET', '/achievements', ({ params }) => listAchievements(currentUser(), params))
route('GET', '/achievements/{id}', ({ ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canView(user, a)) fail(403, 'Нет доступа к этому достижению')
  return toAchievement(a)
})
route('POST', '/achievements/check-duplicates', ({ body }) => {
  currentUser()
  const b = body as { indicatorId: number; identifierType: string | null; identifier: string | null; title: string; eventDate: string; excludeId: number | null }
  return findDuplicates(b, b.excludeId)
})
route('POST', '/achievements', ({ body }) => {
  const user = currentUser()
  const request = body as AchievementRequest
  const { owner } = validateAchievement(user, request, null)
  const strict = findDuplicates(request, null).find((d) => d.match === 'STRICT')
  if (strict) fail(409, `Достижение с таким идентификатором уже зарегистрировано (#${strict.achievementId}). Присоединитесь к нему как соавтор.`)
  const a = {
    id: newId(),
    ownerId: owner.id,
    enteredBy: owner.id !== user.id ? user.fullName : null,
    basis: owner.id !== user.id ? request.basis : null,
    participants: [],
    status: 'DRAFT',
    reviewer: 'ROP',
    lastComment: null,
    evidence: [],
    history: [],
    version: 1,
    createdAt: now(),
  } as unknown as StoredAchievement
  applyRequest(a, request, owner)
  db.achievements.push(a)
  decide(a, user, 'CREATED', owner.id !== user.id ? `Административный ввод за ${owner.fullName}` : null)
  save()
  return toAchievement(a)
})
route('PUT', '/achievements/{id}', ({ body, ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canEdit(user, a)) fail(409, 'Достижение нельзя изменить в текущем статусе')
  const request = body as AchievementRequest
  const { owner } = validateAchievement(user, { ...request, ownerId: null }, a)
  const strict = findDuplicates(request, a.id).find((d) => d.match === 'STRICT')
  if (strict) fail(409, `Достижение с таким идентификатором уже зарегистрировано (#${strict.achievementId})`)
  applyRequest(a, request, owner)
  return toAchievement(a)
})
route('DELETE', '/achievements/{id}', ({ ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (a.status !== 'DRAFT' || !canEdit(user, a)) fail(409, 'Удалить можно только свой черновик')
  db.achievements = db.achievements.filter((x) => x.id !== a.id)
  audit(user, 'DELETED', `Черновик #${a.id} «${a.title}»`)
  return undefined
})
route('POST', '/achievements/{id}/evidence', ({ body, ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canEdit(user, a)) fail(409, 'Документы меняются только в черновике или после возврата')
  let item: EvidenceDto
  if (body instanceof FormData) {
    const file = body.get('file')
    const docType = String(body.get('docType') ?? '').trim()
    const requisites = String(body.get('requisites') ?? '').trim() || null
    if (!docType) fail(400, 'Укажите тип документа', { docType: 'Укажите тип документа' })
    if (!(file instanceof File)) fail(400, 'Выберите файл', { file: 'Выберите файл' })
    if (!FILE_TYPES.includes(file.type)) fail(400, 'Допустимы только PDF, JPG и PNG', { file: 'Допустимы только PDF, JPG и PNG' })
    if (file.size > MAX_FILE_SIZE) fail(400, 'Файл больше 10 МБ', { file: 'Файл больше 10 МБ' })
    item = { id: newId(), docType, requisites, fileName: file.name, size: file.size, url: null, version: 1, uploadedAt: now(), uploadedBy: user.fullName }
  } else {
    const { docType, url, requisites } = body as { docType: string; url: string; requisites: string | null }
    if (!docType?.trim()) fail(400, 'Укажите тип документа', { docType: 'Укажите тип документа' })
    if (!/^https?:\/\/\S+$/.test(url?.trim() ?? '')) fail(400, 'Введите ссылку, начиная с https://', { url: 'Введите ссылку, начиная с https://' })
    item = { id: newId(), docType: docType.trim(), requisites: requisites?.trim() || null, fileName: null, size: null, url: url.trim(), version: 1, uploadedAt: now(), uploadedBy: user.fullName }
  }
  a.evidence.push(item)
  a.updatedAt = now()
  return item
})
route('DELETE', '/achievements/{id}/evidence/{id}', ({ ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canEdit(user, a)) fail(409, 'Документы меняются только в черновике или после возврата')
  a.evidence = a.evidence.filter((e) => e.id !== ids[1])
  return undefined
})
route('POST', '/achievements/{id}/submit', ({ ids }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canEdit(user, a)) fail(409, 'Отправить можно черновик или возвращённое достижение')
  const indicator = indicatorById(a.indicatorId)
  if (periodById(a.periodId).closed) fail(409, 'Период закрыт')
  if (indicator.evidenceRequired && a.evidence.length === 0)
    fail(400, 'Приложите хотя бы один подтверждающий документ', { evidence: indicator.evidence })
  if (indicator.requiresProgram && a.programId === null) fail(400, 'Для этого показателя нужна образовательная программа')
  const strict = findDuplicates(a, a.id).find((d) => d.match === 'STRICT')
  if (strict) fail(409, `Достижение с таким идентификатором уже зарегистрировано (#${strict.achievementId})`)
  const owner = userById(a.ownerId)
  a.reviewer = owner.roles.includes('REVIEWER') ? 'DIRECTOR' : 'ROP'
  a.status = 'ON_REVIEW'
  a.lastComment = null
  decide(a, user, 'SUBMITTED', a.reviewer === 'DIRECTOR' ? 'Заявитель — РОП: проверку и утверждение выполняет директор.' : null)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/review', ({ ids, body }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canReview(user, a)) fail(a.status === 'ON_REVIEW' ? 403 : 409, 'Проверить может РОП своей области, а результаты самих РОП — директор')
  a.status = 'REVIEWED'
  decide(a, user, 'REVIEWED', (body as { comment?: string } | undefined)?.comment?.trim() || null)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/return', ({ ids, body }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canReview(user, a) && !canApprove(user, a)) fail(403, 'Вернуть может проверяющий РОП или директор')
  const comment = requireComment(body)
  a.status = 'RETURNED'
  a.lastComment = comment
  decide(a, user, 'RETURNED', comment)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/reject', ({ ids, body }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (!canReview(user, a) && !canApprove(user, a)) fail(403, 'Отклонить может проверяющий РОП или директор')
  const comment = requireComment(body)
  a.status = 'REJECTED'
  a.lastComment = comment
  decide(a, user, 'REJECTED', comment)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/approve', ({ ids, body }) => {
  const user = currentUser()
  const a = achievementById(ids[0])
  if (isParticipant(user, a)) fail(403, 'Нельзя утверждать собственное достижение')
  if (!canApprove(user, a)) fail(a.status === 'REVIEWED' ? 403 : 409, 'Утвердить можно только проверенное достижение (статус REVIEWED)')
  a.status = 'APPROVED'
  a.lastComment = null
  decide(a, user, 'APPROVED', (body as { comment?: string } | undefined)?.comment?.trim() || null)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/revision', ({ ids, body }) => {
  const user = currentUser()
  requireRole(user, 'DIRECTOR')
  const a = achievementById(ids[0])
  if (a.status !== 'APPROVED') fail(409, 'На пересмотр отправляется только утверждённое достижение')
  const comment = requireComment(body)
  a.status = 'REVISION'
  a.version += 1
  a.lastComment = comment
  decide(a, user, 'REVISION', `${comment} Прежняя версия начислений (${a.version - 1}) сохранена в журнале.`)
  return toAchievement(a)
})
route('POST', '/achievements/{id}/join', ({ ids }) => {
  const user = currentUser()
  requireRole(user, 'EMPLOYEE')
  const a = achievementById(ids[0])
  if (isParticipant(user, a)) fail(409, 'Вы уже участник этого достижения')
  if (a.status === 'REJECTED') fail(409, 'Достижение отклонено')
  const indicator = indicatorById(a.indicatorId)
  if (indicator.accrualMethod === 'INDIVIDUAL') fail(409, 'Показатель начисляется индивидуально: присоединиться нельзя')
  if (!user.categories.includes(indicator.category)) fail(409, 'Показатель не относится к вашей категории оценки')
  a.participants.push({ userId: user.id, fullName: user.fullName, weight: 1 })
  let comment = 'Заявка на соавторство: доли всех участников пересчитаны.'
  if (a.status === 'APPROVED' || a.status === 'REVIEWED') {
    a.status = 'ON_REVIEW'
    a.version += 1
    comment += ` Новая редакция ${a.version} проходит проверку, прежняя сохранена в журнале.`
  }
  decide(a, user, 'JOINED', comment)
  return toAchievement(a)
})

route('GET', '/scores/my', ({ params }) => scoresFor(currentUser(), periodFrom(params)))
route('GET', '/scores/users/{id}', ({ ids, params }) => {
  const user = currentUser()
  if (user.id !== ids[0]) requireRole(user, 'ADMIN', 'DIRECTOR', 'REVIEWER')
  return scoresFor(userById(ids[0]), periodFrom(params))
})
route('GET', '/dashboard/director', ({ params }) => {
  // РОП видит свод «в своей области» (ТЗ 2.2); в заглушке — общий, сервер фильтрует по программам
  requireRole(currentUser(), 'DIRECTOR', 'ADMIN', 'REVIEWER')
  return directorDashboard(periodFrom(params))
})

route('GET', '/measurements', ({ params }) => {
  const user = currentUser()
  const periodId = params.get('periodId')
  const programId = params.get('programId')
  return db.measurements
    .filter((m) => has(user, 'ADMIN', 'DIRECTOR') || user.reviewProgramIds.includes(m.programId))
    .filter((m) => (!periodId || m.periodId === Number(periodId)) && (!programId || m.programId === Number(programId)))
    .map(toMeasurement)
})
route('POST', '/measurements', ({ body }) => toMeasurement(saveMeasurement(currentUser(), body as MeasurementRequest, null)))
route('PUT', '/measurements/{id}', ({ body, ids }) => {
  const user = currentUser()
  const m = measurementById(ids[0])
  if (!EDITABLE.includes(m.status)) fail(409, 'Значение на утверждении или уже утверждено')
  return toMeasurement(saveMeasurement(user, body as MeasurementRequest, m))
})
route('POST', '/measurements/{id}/submit', ({ ids }) => {
  const user = currentUser()
  const m = measurementById(ids[0])
  if (!canEditMeasurement(user, m.programId) || !EDITABLE.includes(m.status)) fail(409, 'Отправить можно только черновик')
  // Значения РОП проверяет и утверждает директор, двумя отдельными решениями (ТЗ 4.2)
  m.status = 'ON_REVIEW'
  m.lastComment = null
  m.updatedAt = now()
  audit(user, 'SUBMITTED', `Измерение ${indicatorById(m.indicatorId).code}`)
  return toMeasurement(m)
})
const MEASUREMENT_ROUTE: Array<[string, ResultStatus[], ResultStatus, boolean]> = [
  // действие, из каких статусов, в какой, нужен ли комментарий
  ['review', ['ON_REVIEW'], 'REVIEWED', false],
  ['approve', ['REVIEWED'], 'APPROVED', false],
  ['return', ['ON_REVIEW', 'REVIEWED'], 'RETURNED', true],
  ['reject', ['ON_REVIEW', 'REVIEWED'], 'REJECTED', true],
  ['revision', ['APPROVED'], 'REVISION', true],
]
for (const [action, from, status, needsComment] of MEASUREMENT_ROUTE) {
  route('POST', `/measurements/{id}/${action}`, ({ ids, body }) => {
    const user = currentUser()
    requireRole(user, 'DIRECTOR')
    const m = measurementById(ids[0])
    if (!from.includes(m.status)) fail(409, `Действие недоступно в статусе ${m.status}`)
    const comment = needsComment ? requireComment(body) : null
    m.status = status
    if (needsComment) m.lastComment = comment
    if (status === 'REVISION') m.version += 1
    m.updatedAt = now()
    audit(user, status, `Измерение ${indicatorById(m.indicatorId).code}`, comment)
    return toMeasurement(m)
  })
}

route('GET', '/imports', () => (requireRole(currentUser(), 'ADMIN', 'REVIEWER'), []))
route('POST', '/imports', () => fail(501, 'Разбор XLSX выполняет сервер: в режиме заглушек импорт недоступен'))

route('GET', '/audit', ({ params }) => {
  requireRole(currentUser(), 'ADMIN', 'DIRECTOR')
  return paginate(db.audit, params)
})

function handle(method: string, path: string, body: unknown): unknown {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue
    const match = pattern.exec(pathname)
    if (match) {
      const result = handler({ params, body, ids: match.slice(1).map(Number) })
      if (method !== 'GET') save()
      return result
    }
  }
  fail(404, `Для ${method} ${pathname} заглушки пока нет`)
}

export async function mockRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  // Копия, чтобы экран не менял «серверные» данные напрямую
  const result = handle(method, path, body)
  return (result === undefined ? undefined : structuredClone(result)) as T
}
