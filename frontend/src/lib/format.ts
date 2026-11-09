// Форматирование чисел и дат для экранов: русская локаль, баллы до двух знаков (ТЗ 6.1)

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

/** 16.666 → «16,67»; null → «—» */
export function fmt(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : numberFormat.format(value)
}

/** 2026-10-14 → 14.10.2026 */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** ISO-время → «14.10.2026, 09:30» по местному времени */
export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
}

export function fmtSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${numberFormat.format(Math.round((bytes / 1024 / 1024) * 10) / 10)} МБ`
}

/** plural(3, ['достижение', 'достижения', 'достижений']) → «достижения» */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
