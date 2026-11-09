import type { Role, UserDto } from '../api/types'

export interface NavItem {
  to: string
  label: string
  /** Кому виден пункт: хотя бы одна из ролей */
  roles: Role[]
}

const ALL: Role[] = ['EMPLOYEE', 'REVIEWER', 'DIRECTOR', 'ADMIN']

/** Разделы интерфейса по ТЗ, раздел 10 */
const NAV: NavItem[] = [
  { to: '/', label: 'Главная', roles: ALL },
  { to: '/my/indicators', label: 'Мои показатели', roles: ['EMPLOYEE'] },
  { to: '/my/achievements', label: 'Мои достижения', roles: ['EMPLOYEE', 'ADMIN'] },
  { to: '/review', label: 'На проверке', roles: ['REVIEWER'] },
  { to: '/approval', label: 'На утверждении', roles: ['DIRECTOR'] },
  { to: '/targets', label: 'Цели РОП', roles: ['REVIEWER', 'DIRECTOR', 'ADMIN'] },
  { to: '/registry', label: 'Реестр', roles: ['REVIEWER', 'DIRECTOR', 'ADMIN'] },
  { to: '/analytics', label: 'Аналитика', roles: ['REVIEWER', 'DIRECTOR', 'ADMIN'] },
  { to: '/reports', label: 'Отчёты', roles: ALL },
  { to: '/admin/periods', label: 'Периоды', roles: ['DIRECTOR'] },
  { to: '/admin', label: 'Администрирование', roles: ['ADMIN'] },
]

export function navFor(user: UserDto): NavItem[] {
  return NAV.filter((item) => item.roles.some((role) => user.roles.includes(role)))
    // У админа периоды — в разделе «Администрирование»
    .filter((item) => !(item.to === '/admin/periods' && user.roles.includes('ADMIN')))
    .map((item) =>
    // У суперадминистратора без роли сотрудника это раздел административного ввода
    item.to === '/my/achievements' && !user.roles.includes('EMPLOYEE') ? { ...item, label: 'Ввод результатов' } : item,
  )
}
