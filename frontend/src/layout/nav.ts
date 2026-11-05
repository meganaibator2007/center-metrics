import type { Role } from '../api/types'

export interface NavItem {
  to: string
  label: string
  /** Функция после защиты: пункт ведёт на заглушку и помечен «скоро» */
  soon?: boolean
}

export const NAV: Record<Role, NavItem[]> = {
  TEACHER: [
    { to: '/cabinet', label: 'Кабинет' },
    { to: '/entries/new', label: 'Ввод данных' },
    { to: '/report', label: 'Мой отчёт' },
    { to: '/soon/history', label: 'История', soon: true },
  ],
  ADMIN: [
    { to: '/admin/control', label: 'Контроль сдачи' },
    { to: '/admin/summary', label: 'Сводный отчёт' },
    { to: '/admin/indicators', label: 'Показатели' },
    { to: '/admin/periods', label: 'Периоды' },
    { to: '/admin/users', label: 'Пользователи' },
    { to: '/soon/dashboard', label: 'Дашборд', soon: true },
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  TEACHER: 'Преподаватель',
  ADMIN: 'Администратор',
}
