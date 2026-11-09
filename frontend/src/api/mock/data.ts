// Демо-данные для заглушек. Показатели — из «Порядка начисления баллов» (ППС, АУП, РОП),
// люди, программы и достижения вымышлены.

import type {
  AccrualMethod,
  Category,
  DecisionDto,
  DepartmentDto,
  EvidenceDto,
  IdentifierType,
  IndicatorDto,
  PeriodDto,
  ProgramDto,
  ResultStatus,
  TargetDirection,
  UserDto,
} from '../types'

export interface StoredParticipant {
  userId: number | null
  fullName: string
  weight: number
}

export interface StoredAchievement {
  id: number
  indicatorId: number
  periodId: number
  title: string
  eventDate: string
  identifierType: IdentifierType | null
  identifier: string | null
  programId: number | null
  discipline: string | null
  description: string | null
  ownerId: number
  enteredBy: string | null
  basis: string | null
  /** Все участники, включая заявителя */
  participants: StoredParticipant[]
  status: ResultStatus
  reviewer: 'ROP' | 'DIRECTOR'
  lastComment: string | null
  evidence: EvidenceDto[]
  history: DecisionDto[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface StoredMeasurement {
  id: number
  indicatorId: number
  periodId: number
  programId: number
  value: number | null
  numerator: number | null
  denominator: number | null
  source: string | null
  status: ResultStatus
  enteredBy: string
  updatedAt: string
}

export interface MockDb {
  departments: DepartmentDto[]
  programs: ProgramDto[]
  users: UserDto[]
  indicators: IndicatorDto[]
  periods: PeriodDto[]
  achievements: StoredAchievement[]
  measurements: StoredMeasurement[]
  nextId: number
}

const departments: DepartmentDto[] = [
  { id: 1, name: 'Кафедра информационных технологий' },
  { id: 2, name: 'Кафедра бизнес-информатики' },
  { id: 3, name: 'Центр «Цифровые компетенции»' },
]

const programs: ProgramDto[] = [
  { id: 1, code: '09.03.04', name: 'Программная инженерия', topIt: true },
  { id: 2, code: '01.03.02', name: 'Прикладная математика и информатика', topIt: true },
  { id: 3, code: '38.03.05', name: 'Бизнес-информатика', topIt: false },
]

function user(
  id: number,
  login: string,
  lastName: string,
  firstName: string,
  middleName: string,
  roles: UserDto['roles'],
  categories: Category[],
  departmentId: number | null,
  position: string,
  programIds: number[],
): UserDto {
  return {
    id,
    login,
    fullName: `${lastName} ${firstName} ${middleName}`,
    lastName,
    firstName,
    middleName,
    roles,
    categories,
    departmentId,
    departmentName: departments.find((d) => d.id === departmentId)?.name ?? null,
    position,
    programIds,
    active: true,
  }
}

const users: UserDto[] = [
  user(1, 'e.smirnova', 'Смирнова', 'Елена', 'Викторовна', ['ADMIN'], [], 3, 'Администратор системы', []),
  user(2, 'a.ivanova', 'Иванова', 'Анна', 'Петровна', ['EMPLOYEE'], ['PPS'], 1, 'Доцент', [1]),
  user(3, 'p.sokolov', 'Соколов', 'Павел', 'Андреевич', ['EMPLOYEE'], ['PPS'], 1, 'Старший преподаватель', [1, 2]),
  user(4, 'm.petrova', 'Петрова', 'Мария', 'Игоревна', ['EMPLOYEE', 'REVIEWER'], ['PPS', 'ROP'], 1, 'Доцент, руководитель ОП', [1]),
  user(5, 'd.orlov', 'Орлов', 'Дмитрий', 'Сергеевич', ['DIRECTOR'], [], 3, 'Директор центра', []),
  user(6, 'k.volkova', 'Волкова', 'Ксения', 'Андреевна', ['EMPLOYEE'], ['AUP'], 3, 'Специалист центра', []),
  user(7, 'i.lebedev', 'Лебедев', 'Игорь', 'Николаевич', ['EMPLOYEE'], ['PPS'], 2, 'Профессор', [2]),
  user(8, 'n.kozlova', 'Козлова', 'Наталья', 'Олеговна', ['EMPLOYEE', 'REVIEWER'], ['PPS', 'ROP'], 2, 'Доцент, руководитель ОП', [2]),
]

const ONLY_TOP_IT = 'Учитываются только дисциплины, входящие в учебный план ОП топ-ИТ.'

function points(
  id: number,
  code: string,
  category: Category,
  name: string,
  basePoints: number,
  accrualMethod: AccrualMethod,
  evidence: string,
  requiresProgram = false,
): IndicatorDto {
  return {
    id,
    code,
    name,
    category,
    evaluationType: 'POINTS',
    unit: 'шт.',
    basePoints,
    accrualMethod,
    targetValue: null,
    percent: false,
    direction: null,
    coefficient: 1,
    maxPoints: null,
    maxRepeats: null,
    requiresProgram,
    evidence: requiresProgram ? `${evidence} ${ONLY_TOP_IT}` : evidence,
    version: 1,
    archived: false,
  }
}

function target(
  id: number,
  code: string,
  name: string,
  targetValue: number,
  unit: string,
  percent: boolean,
  evidence: string,
  direction: TargetDirection = 'AT_LEAST',
): IndicatorDto {
  return {
    id,
    code,
    name,
    category: 'ROP',
    evaluationType: 'TARGET',
    unit,
    basePoints: null,
    accrualMethod: null,
    targetValue,
    percent,
    direction,
    coefficient: 1,
    maxPoints: null,
    maxRepeats: null,
    requiresProgram: true,
    evidence,
    version: 1,
    archived: false,
  }
}

const indicators: IndicatorDto[] = [
  points(1, 'ППС-01', 'PPS', 'Публикация статьи по теме ИТ в журналах Белого списка (1–2 уровень)', 20, 'SHARED',
    'Копия статьи, титульный лист и содержание журнала или ссылка на страницу в eLibrary.'),
  points(2, 'ППС-02', 'PPS', 'Доклад на международной конференции по тематике ИТ уровня A*/A рейтинга CORE', 50, 'SHARED',
    'Копия статьи, программа конференции.'),
  points(3, 'ППС-03', 'PPS', 'Разработка УМК, согласованных с ИП', 5, 'SHARED',
    'Полный текст УМК, протокол заседания кафедры с утверждением.', true),
  points(4, 'ППС-04', 'PPS', 'Разработка ФОС, согласованных с ИП', 5, 'SHARED',
    'Полный текст ФОС, протокол заседания кафедры с утверждением.', true),
  points(5, 'ППС-05', 'PPS', 'Разработка РПД, согласованных с ИП', 5, 'SHARED',
    'Полный текст РПД, протокол заседания кафедры с утверждением.', true),
  points(6, 'ППС-06', 'PPS', 'Внедрение результатов НИР по тематике ИТ в учебный процесс', 15, 'SHARED',
    'Копия договора или отчёта о НИР, справка о внедрении в учебный процесс от кафедры, реализующей дисциплину.', true),
  points(7, 'ППС-07', 'PPS', 'Внедрение результатов проектов и опыта практической деятельности в сфере ИТ', 10, 'INDIVIDUAL',
    'Договор (трудовой, ГПХ), акт о выполнении проекта, справка о внедрении от кафедры, реализующей дисциплину.', true),
  points(8, 'ППС-08', 'PPS', 'Прохождение ДПО в сфере ИТ и методики обучения ИТ', 10, 'INDIVIDUAL',
    'Документ о повышении квалификации или профессиональной переподготовке.'),
  points(9, 'ППС-09', 'PPS', 'Личное участие в международных и национальных мероприятиях по тематике ИТ (кроме строки 2)', 5, 'INDIVIDUAL',
    'Сертификат или диплом участника.'),
  points(10, 'ППС-10', 'PPS', 'Подготовка студентов к международным и национальным мероприятиям и соревнованиям по ИТ', 5, 'INDIVIDUAL',
    'Программа мероприятия с указанием руководителя или тренера команды.'),
  points(11, 'АУП-01', 'AUP', 'Организация согласования и подписания договора, соглашения, доп. соглашения в рамках Программы Центра', 10, 'INDIVIDUAL',
    'Подписанный договор, соглашение или дополнительное соглашение, направленное на реализацию программы Центра.'),
  points(12, 'АУП-02', 'AUP', 'Организация командирования работников Центра на мероприятие в рамках программы Центра', 1, 'INDIVIDUAL',
    'Приказ о командировании.'),
  points(13, 'АУП-03', 'AUP', 'Организация мероприятия Центра в рамках реализации программы Центра', 10, 'INDIVIDUAL',
    'Приказ о мероприятии, пост-релиз или программа мероприятия с указанием оргкомитета.'),
  points(14, 'АУП-04', 'AUP', 'Своевременная сдача и полнота ежеквартальной и годовой отчётности', 5, 'INDIVIDUAL',
    'Ежеквартальный или годовой отчёт.'),
  target(15, 'РОП-01', 'Количество студентов, принятых на ОП топ-ИТ', 101, 'чел.', false, 'Приказы о зачислении.'),
  target(16, 'РОП-02', 'Доля студентов ОП топ-ИТ, успешно прошедших аттестацию', 80, '%', true, 'Ведомости промежуточной аттестации.'),
  target(17, 'РОП-03', 'Доля студентов ОП топ-ИТ, участвующих в проектной, научной деятельности, соревнованиях', 50, '%', true, 'Отчёт руководителя.'),
  target(18, 'РОП-04', 'Доля преподавателей — внешних совместителей из ИТ-отрасли', 20, '%', true, 'Трудовой договор, договор ГПХ.'),
  target(19, 'РОП-05', 'Количество актуализированных ОП', 1, 'шт.', false, 'Протокол экспертного совета по ИИ.'),
  target(20, 'РОП-06', 'Участие в НИР по тематике ИТ и внедрение результатов в учебный процесс', 1, 'шт.', false, 'Отчёт по НИР.'),
  target(21, 'РОП-07', 'Взаимодействие с ИП ОП топ-ИТ', 3, 'мероприятий', false, 'Пост-релиз, ссылка на мероприятие.'),
  target(22, 'РОП-08', 'Своевременная сдача и полнота ежеквартальной и годовой отчётности', 1, 'шт.', false, 'Отчёт руководителя.'),
  target(23, 'РОП-09', 'Количество мероприятий в рамках выполнения программы Центра', 1, 'шт.', false, 'Пост-релиз, ссылка на мероприятие.'),
  target(24, 'РОП-10', 'Уровень удовлетворённости студентов качеством образования', 4, 'балла из 5', false, 'Отчёт РОП.'),
  target(25, 'РОП-11', 'Уровень удовлетворённости ИП качеством образования', 4, 'балла из 5', false, 'Отчёт РОП.'),
]

const periods: PeriodDto[] = [
  { id: 1, name: 'IV квартал 2026', type: 'QUARTER', startDate: '2026-10-01', endDate: '2026-12-31', closed: false, closedAt: null },
  { id: 2, name: '2026 год', type: 'YEAR', startDate: '2026-01-01', endDate: '2026-12-31', closed: false, closedAt: null },
  { id: 3, name: 'III квартал 2026', type: 'QUARTER', startDate: '2026-07-01', endDate: '2026-09-30', closed: true, closedAt: '2026-10-10T12:00:00Z' },
  { id: 4, name: 'II квартал 2026', type: 'QUARTER', startDate: '2026-04-01', endDate: '2026-06-30', closed: true, closedAt: '2026-07-10T12:00:00Z' },
]

let historyId = 1
function event(action: DecisionDto['action'], actor: string, at: string, comment: string | null = null): DecisionDto {
  return { id: historyId++, action, actor, comment, at }
}

let evidenceId = 1
function file(docType: string, fileName: string, size: number, at: string, by: string): EvidenceDto {
  return { id: evidenceId++, docType, fileName, size, url: null, uploadedAt: at, uploadedBy: by }
}
function link(docType: string, url: string, at: string, by: string): EvidenceDto {
  return { id: evidenceId++, docType, fileName: null, size: null, url, uploadedAt: at, uploadedBy: by }
}

const IVANOVA = 'Иванова Анна Петровна'
const SOKOLOV = 'Соколов Павел Андреевич'
const PETROVA = 'Петрова Мария Игоревна'
const ORLOV = 'Орлов Дмитрий Сергеевич'
const LEBEDEV = 'Лебедев Игорь Николаевич'
const VOLKOVA = 'Волкова Ксения Андреевна'
const SMIRNOVA = 'Смирнова Елена Викторовна'
const KOZLOVA = 'Козлова Наталья Олеговна'

type Seed = Omit<StoredAchievement, 'version' | 'createdAt' | 'updatedAt' | 'reviewer' | 'enteredBy' | 'basis' | 'lastComment'> &
  Partial<Pick<StoredAchievement, 'reviewer' | 'enteredBy' | 'basis' | 'lastComment'>>

function achievement(seed: Seed): StoredAchievement {
  const first = seed.history[0]?.at ?? '2026-10-01T09:00:00Z'
  const last = seed.history[seed.history.length - 1]?.at ?? first
  return {
    reviewer: 'ROP',
    enteredBy: null,
    basis: null,
    lastComment: null,
    version: 1,
    createdAt: first,
    updatedAt: last,
    ...seed,
  }
}

const achievements: StoredAchievement[] = [
  achievement({
    id: 1, indicatorId: 1, periodId: 3, ownerId: 2, status: 'APPROVED',
    title: 'Модели оценки качества программного обеспечения в учебных проектах',
    eventDate: '2026-08-20', identifierType: 'DOI', identifier: '10.31857/S0132162526080034',
    programId: null, discipline: null, description: 'Журнал «Программирование», 2026, № 4.',
    participants: [
      { userId: 2, fullName: IVANOVA, weight: 1 },
      { userId: 3, fullName: SOKOLOV, weight: 1 },
      { userId: null, fullName: 'Кузнецов Андрей Владимирович (МГУ)', weight: 1 },
      { userId: null, fullName: 'Ли Сергей Вячеславович (ВШЭ)', weight: 1 },
    ],
    evidence: [file('Копия статьи', 'statya-programmirovanie-2026-4.pdf', 1_245_000, '2026-08-25T10:00:00Z', IVANOVA)],
    history: [
      event('CREATED', IVANOVA, '2026-08-25T10:00:00Z'),
      event('SUBMITTED', IVANOVA, '2026-08-25T10:05:00Z'),
      event('REVIEWED', PETROVA, '2026-08-28T14:00:00Z', 'Статья в журнале Белого списка, уровень 1. Дублей нет.'),
      event('APPROVED', ORLOV, '2026-09-02T09:30:00Z'),
    ],
  }),
  achievement({
    id: 2, indicatorId: 8, periodId: 1, ownerId: 2, status: 'APPROVED',
    title: 'Повышение квалификации «Машинное обучение в образовании», 72 ч',
    eventDate: '2026-10-14', identifierType: 'DOC_NUMBER', identifier: 'ПК-772410-2026',
    programId: null, discipline: null, description: null,
    participants: [{ userId: 2, fullName: IVANOVA, weight: 1 }],
    evidence: [file('Удостоверение о повышении квалификации', 'udostoverenie-pk.pdf', 380_000, '2026-10-16T08:00:00Z', IVANOVA)],
    history: [
      event('CREATED', IVANOVA, '2026-10-16T08:00:00Z'),
      event('SUBMITTED', IVANOVA, '2026-10-16T08:02:00Z'),
      event('REVIEWED', PETROVA, '2026-10-18T11:00:00Z'),
      event('APPROVED', ORLOV, '2026-10-21T10:00:00Z'),
    ],
  }),
  achievement({
    id: 3, indicatorId: 5, periodId: 1, ownerId: 2, status: 'ON_REVIEW',
    title: 'РПД «Машинное обучение»', eventDate: '2026-10-30', identifierType: 'DOC_NUMBER', identifier: 'Протокол № 3 от 30.10.2026',
    programId: 1, discipline: 'Машинное обучение', description: null,
    participants: [
      { userId: 2, fullName: IVANOVA, weight: 1 },
      { userId: 4, fullName: PETROVA, weight: 1 },
    ],
    evidence: [
      file('Полный текст РПД', 'rpd-mashinnoe-obuchenie.pdf', 812_000, '2026-11-02T09:00:00Z', IVANOVA),
      file('Протокол заседания кафедры', 'protokol-3.pdf', 210_000, '2026-11-02T09:01:00Z', IVANOVA),
    ],
    history: [event('CREATED', IVANOVA, '2026-11-02T09:00:00Z'), event('SUBMITTED', IVANOVA, '2026-11-02T09:05:00Z')],
  }),
  achievement({
    id: 4, indicatorId: 9, periodId: 1, ownerId: 2, status: 'DRAFT',
    title: 'Участие в конференции «Цифровая индустрия России»', eventDate: '2026-11-05', identifierType: 'URL',
    identifier: 'https://cipr.ru/2026', programId: null, discipline: null, description: null,
    participants: [{ userId: 2, fullName: IVANOVA, weight: 1 }],
    evidence: [],
    history: [event('CREATED', IVANOVA, '2026-11-06T15:00:00Z')],
  }),
  achievement({
    id: 5, indicatorId: 2, periodId: 1, ownerId: 3, status: 'REVIEWED',
    title: 'Graph-based detection of code clones in student assignments', eventDate: '2026-10-08',
    identifierType: 'DOI', identifier: '10.1145/3701234.3701299', programId: null, discipline: null,
    description: 'ICSE 2026 Companion, рейтинг CORE A*.',
    participants: [
      { userId: 3, fullName: SOKOLOV, weight: 1 },
      { userId: 7, fullName: LEBEDEV, weight: 1 },
      { userId: null, fullName: 'Chen Wei (NUS)', weight: 1 },
    ],
    evidence: [
      file('Копия статьи', 'icse-2026-clones.pdf', 2_100_000, '2026-10-20T12:00:00Z', SOKOLOV),
      link('Программа конференции', 'https://conf.researchr.org/program/icse-2026', '2026-10-20T12:01:00Z', SOKOLOV),
    ],
    history: [
      event('CREATED', SOKOLOV, '2026-10-20T12:00:00Z'),
      event('SUBMITTED', SOKOLOV, '2026-10-20T12:05:00Z'),
      event('REVIEWED', PETROVA, '2026-10-24T16:00:00Z', 'Конференция в рейтинге CORE A*, состав авторов совпадает со статьёй.'),
    ],
  }),
  achievement({
    id: 6, indicatorId: 10, periodId: 1, ownerId: 3, status: 'RETURNED',
    title: 'Подготовка команды к чемпионату ICPC, полуфинал Северной Евразии', eventDate: '2026-10-25',
    identifierType: null, identifier: null, programId: null, discipline: null, description: null,
    participants: [{ userId: 3, fullName: SOKOLOV, weight: 1 }],
    lastComment: 'Приложите программу мероприятия, где вы указаны тренером команды.',
    evidence: [file('Фотография с соревнований', 'icpc-team.jpg', 640_000, '2026-10-27T10:00:00Z', SOKOLOV)],
    history: [
      event('CREATED', SOKOLOV, '2026-10-27T10:00:00Z'),
      event('SUBMITTED', SOKOLOV, '2026-10-27T10:03:00Z'),
      event('RETURNED', PETROVA, '2026-10-29T09:00:00Z', 'Приложите программу мероприятия, где вы указаны тренером команды.'),
    ],
  }),
  achievement({
    id: 7, indicatorId: 3, periodId: 1, ownerId: 4, status: 'ON_REVIEW', reviewer: 'DIRECTOR',
    title: 'УМК «Проектирование информационных систем»', eventDate: '2026-10-12', identifierType: 'DOC_NUMBER',
    identifier: 'Протокол № 2 от 12.10.2026', programId: 1, discipline: 'Проектирование информационных систем', description: null,
    participants: [{ userId: 4, fullName: PETROVA, weight: 1 }],
    evidence: [file('Полный текст УМК', 'umk-pis.pdf', 3_400_000, '2026-10-15T09:00:00Z', PETROVA)],
    history: [
      event('CREATED', PETROVA, '2026-10-15T09:00:00Z'),
      event('SUBMITTED', PETROVA, '2026-10-15T09:10:00Z', 'Заявитель — РОП: проверку и утверждение выполняет директор.'),
    ],
  }),
  achievement({
    id: 8, indicatorId: 6, periodId: 1, ownerId: 7, status: 'APPROVED',
    title: 'Внедрение результатов НИР «Анализ больших графов» в дисциплину «Алгоритмы на графах»', eventDate: '2026-10-03',
    identifierType: 'DOC_NUMBER', identifier: 'НИР 2026-117', programId: 2, discipline: 'Алгоритмы на графах', description: null,
    participants: [{ userId: 7, fullName: LEBEDEV, weight: 1 }],
    evidence: [file('Справка о внедрении', 'spravka-vnedrenie.pdf', 150_000, '2026-10-05T10:00:00Z', LEBEDEV)],
    history: [
      event('CREATED', LEBEDEV, '2026-10-05T10:00:00Z'),
      event('SUBMITTED', LEBEDEV, '2026-10-05T10:02:00Z'),
      event('REVIEWED', KOZLOVA, '2026-10-07T12:00:00Z'),
      event('APPROVED', ORLOV, '2026-10-09T09:00:00Z'),
    ],
  }),
  achievement({
    id: 9, indicatorId: 11, periodId: 1, ownerId: 6, status: 'APPROVED', enteredBy: SMIRNOVA,
    basis: 'Служебная записка РОП Петровой М. И. от 02.11.2026',
    title: 'Соглашение о сотрудничестве с ООО «Яндекс.Образование»', eventDate: '2026-10-28',
    identifierType: 'DOC_NUMBER', identifier: 'Соглашение № 45-ЦК от 28.10.2026', programId: null, discipline: null, description: null,
    participants: [{ userId: 6, fullName: VOLKOVA, weight: 1 }],
    evidence: [file('Подписанное соглашение', 'soglashenie-45.pdf', 520_000, '2026-11-02T13:00:00Z', SMIRNOVA)],
    history: [
      event('CREATED', SMIRNOVA, '2026-11-02T13:00:00Z', 'Административный ввод за Волкову К. А.'),
      event('SUBMITTED', SMIRNOVA, '2026-11-02T13:05:00Z'),
      event('REVIEWED', PETROVA, '2026-11-03T10:00:00Z'),
      event('APPROVED', ORLOV, '2026-11-04T09:00:00Z'),
    ],
  }),
  achievement({
    id: 10, indicatorId: 13, periodId: 1, ownerId: 6, status: 'REVIEWED', enteredBy: SMIRNOVA,
    basis: 'Служебная записка РОП Петровой М. И. от 02.11.2026',
    title: 'Хакатон «Цифровой кампус»', eventDate: '2026-10-18', identifierType: 'DOC_NUMBER',
    identifier: 'Приказ № 1290 от 01.10.2026', programId: null, discipline: null, description: null,
    participants: [{ userId: 6, fullName: VOLKOVA, weight: 1 }],
    evidence: [file('Приказ о мероприятии', 'prikaz-1290.pdf', 300_000, '2026-11-02T13:20:00Z', SMIRNOVA)],
    history: [
      event('CREATED', SMIRNOVA, '2026-11-02T13:20:00Z', 'Административный ввод за Волкову К. А.'),
      event('SUBMITTED', SMIRNOVA, '2026-11-02T13:25:00Z'),
      event('REVIEWED', PETROVA, '2026-11-05T15:00:00Z'),
    ],
  }),
  achievement({
    id: 11, indicatorId: 12, periodId: 1, ownerId: 6, status: 'REJECTED', enteredBy: SMIRNOVA,
    basis: 'Служебная записка РОП Петровой М. И. от 02.11.2026',
    title: 'Командирование на конференцию «Открытые системы»', eventDate: '2026-10-10', identifierType: 'DOC_NUMBER',
    identifier: 'Приказ № 1301-к', programId: null, discipline: null, description: null,
    participants: [{ userId: 6, fullName: VOLKOVA, weight: 1 }],
    lastComment: 'Мероприятие не входит в программу Центра.',
    evidence: [file('Приказ о командировании', 'prikaz-1301k.pdf', 120_000, '2026-11-02T13:40:00Z', SMIRNOVA)],
    history: [
      event('CREATED', SMIRNOVA, '2026-11-02T13:40:00Z', 'Административный ввод за Волкову К. А.'),
      event('SUBMITTED', SMIRNOVA, '2026-11-02T13:45:00Z'),
      event('REJECTED', ORLOV, '2026-11-06T10:00:00Z', 'Мероприятие не входит в программу Центра.'),
    ],
  }),
  achievement({
    id: 12, indicatorId: 1, periodId: 4, ownerId: 7, status: 'APPROVED',
    title: 'Параллельные алгоритмы поиска кратчайших путей', eventDate: '2026-05-14', identifierType: 'DOI',
    identifier: '10.21685/2072-3040-2026-2-5', programId: null, discipline: null, description: null,
    participants: [
      { userId: 7, fullName: LEBEDEV, weight: 1 },
      { userId: 8, fullName: KOZLOVA, weight: 1 },
    ],
    evidence: [file('Копия статьи', 'parallel-sp.pdf', 900_000, '2026-05-20T10:00:00Z', LEBEDEV)],
    history: [
      event('CREATED', LEBEDEV, '2026-05-20T10:00:00Z'),
      event('SUBMITTED', LEBEDEV, '2026-05-20T10:02:00Z'),
      event('REVIEWED', PETROVA, '2026-05-22T10:00:00Z'),
      event('APPROVED', ORLOV, '2026-05-25T10:00:00Z'),
    ],
  }),
  achievement({
    id: 13, indicatorId: 7, periodId: 4, ownerId: 2, status: 'APPROVED',
    title: 'Кейс «Сбербанк: миграция платёжного шлюза» в дисциплине «Архитектура ПО»', eventDate: '2026-04-22',
    identifierType: 'DOC_NUMBER', identifier: 'Акт № 17 от 22.04.2026', programId: 1, discipline: 'Архитектура программного обеспечения',
    description: null, participants: [{ userId: 2, fullName: IVANOVA, weight: 1 }],
    evidence: [file('Акт о выполнении проекта', 'akt-17.pdf', 260_000, '2026-04-25T10:00:00Z', IVANOVA)],
    history: [
      event('CREATED', IVANOVA, '2026-04-25T10:00:00Z'),
      event('SUBMITTED', IVANOVA, '2026-04-25T10:01:00Z'),
      event('REVIEWED', PETROVA, '2026-04-27T10:00:00Z'),
      event('APPROVED', ORLOV, '2026-04-30T10:00:00Z'),
    ],
  }),
  achievement({
    id: 14, indicatorId: 9, periodId: 3, ownerId: 3, status: 'APPROVED',
    title: 'Участие в форуме «Технопром-2026»', eventDate: '2026-08-27', identifierType: 'URL', identifier: 'https://technoprom.ru/2026',
    programId: null, discipline: null, description: null, participants: [{ userId: 3, fullName: SOKOLOV, weight: 1 }],
    evidence: [file('Сертификат участника', 'technoprom-cert.pdf', 180_000, '2026-08-30T10:00:00Z', SOKOLOV)],
    history: [
      event('CREATED', SOKOLOV, '2026-08-30T10:00:00Z'),
      event('SUBMITTED', SOKOLOV, '2026-08-30T10:01:00Z'),
      event('REVIEWED', PETROVA, '2026-09-01T10:00:00Z'),
      event('APPROVED', ORLOV, '2026-09-03T10:00:00Z'),
    ],
  }),
]

function m(
  id: number, indicatorId: number, programId: number, status: ResultStatus, enteredBy: string,
  value: number | null, numerator: number | null = null, denominator: number | null = null, source: string | null = null,
): StoredMeasurement {
  return { id, indicatorId, periodId: 2, programId, value, numerator, denominator, source, status, enteredBy, updatedAt: '2026-11-03T10:00:00Z' }
}

const measurements: StoredMeasurement[] = [
  m(1, 15, 1, 'APPROVED', PETROVA, 112, null, null, 'Приказы о зачислении № 2140-с, 2215-с'),
  m(2, 16, 1, 'APPROVED', PETROVA, null, 87, 112, 'Ведомости зимней сессии'),
  m(3, 17, 1, 'REVIEWED', PETROVA, null, 41, 112, 'Отчёт руководителя ОП'),
  m(4, 18, 1, 'REVIEWED', PETROVA, null, 3, 19, 'Договоры ГПХ'),
  m(5, 21, 1, 'APPROVED', PETROVA, 2, null, null, 'Пост-релизы на сайте'),
  m(6, 24, 1, 'DRAFT', PETROVA, 4.3, null, null, 'Анкетирование, 96 ответов'),
  m(7, 15, 2, 'APPROVED', KOZLOVA, 88, null, null, 'Приказы о зачислении'),
  m(8, 16, 2, 'REVIEWED', KOZLOVA, null, 70, 88, 'Ведомости зимней сессии'),
  m(9, 19, 2, 'APPROVED', KOZLOVA, 1, null, null, 'Протокол экспертного совета № 4'),
]

export function seed(): MockDb {
  return {
    departments,
    programs,
    users,
    indicators,
    periods,
    achievements,
    measurements,
    nextId: 1000,
  }
}
