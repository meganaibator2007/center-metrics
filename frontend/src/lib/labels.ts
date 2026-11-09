// Подписи перечислений на русском: одно место для всех экранов

import type {
  AccrualMethod,
  Category,
  DecisionAction,
  IdentifierType,
  PeriodType,
  ResultStatus,
  Role,
} from '../api/types'

export const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: 'Сотрудник',
  REVIEWER: 'РОП, проверяющий',
  DIRECTOR: 'Директор',
  ADMIN: 'Суперадминистратор',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  PPS: 'ППС',
  AUP: 'АУП',
  ROP: 'РОП',
}

export const CATEGORY_FULL: Record<Category, string> = {
  PPS: 'Профессорско-преподавательский состав',
  AUP: 'Административно-управленческий персонал',
  ROP: 'Руководители образовательных программ',
}

export const ACCRUAL_LABEL: Record<AccrualMethod, string> = {
  INDIVIDUAL: 'индивидуально',
  SHARED: 'на всех авторов',
}

/** Статус и класс бейджа из прототипа */
export const STATUS: Record<ResultStatus, { label: string; badge: string }> = {
  DRAFT: { label: 'Черновик', badge: 'draft' },
  ON_REVIEW: { label: 'На проверке РОП', badge: 'sent' },
  RETURNED: { label: 'На доработке', badge: 'returned' },
  REVIEWED: { label: 'На утверждении', badge: 'open' },
  APPROVED: { label: 'Утверждено', badge: 'accepted' },
  REJECTED: { label: 'Отклонено', badge: 'closed' },
  REVISION: { label: 'На пересмотре', badge: 'returned' },
}

export const ACTION_LABEL: Record<DecisionAction, string> = {
  CREATED: 'Создано',
  SUBMITTED: 'Отправлено на проверку',
  RETURNED: 'Возвращено на доработку',
  REVIEWED: 'Проверено РОП, передано директору',
  APPROVED: 'Утверждено директором',
  REJECTED: 'Отклонено',
  JOINED: 'Присоединился соавтор',
  REVISION: 'Отправлено на пересмотр',
}

export const IDENTIFIER_LABEL: Record<IdentifierType, string> = {
  DOI: 'DOI',
  URL: 'Ссылка',
  DOC_NUMBER: 'Номер документа',
}

export const PERIOD_TYPE_LABEL: Record<PeriodType, string> = {
  MONTH: 'Месяц',
  QUARTER: 'Квартал',
  HALF_YEAR: 'Полугодие',
  YEAR: 'Год',
  CUSTOM: 'Произвольный',
}
