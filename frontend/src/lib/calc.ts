// Правила расчёта из ТЗ, раздел 6. Официальный расчёт делает сервер (пакет scoring, BigDecimal);
// здесь те же формулы для заглушек, предварительного расчёта в формах и как образец для бэкенда.

import type { TargetDirection } from '../api/types'

/** Округление без ошибок вида 0,1 + 0,2 */
export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Делит балл B × c между участниками пропорционально весам (ТЗ 6.1):
 * Bᵢ = B × c × wᵢ / Σw. Внешние соавторы тоже в списке, их доли никому не достаются.
 * Двухзнаковые суммы получаются методом наибольших остатков, поэтому сумма долей
 * никогда не больше B × c: 20 / 3 → 6,67 + 6,67 + 6,66.
 */
export function splitPoints(base: number, coefficient: number, weights: number[]) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight <= 0) return weights.map(() => ({ share: 0, points: 0 }))

  const cents = Math.round(base * coefficient * 100)
  const exact = weights.map((w) => (cents * w) / totalWeight)
  const floors = exact.map((x) => Math.floor(x + 1e-9))
  let rest = cents - floors.reduce((sum, x) => sum + x, 0)

  const order = exact
    .map((x, i) => ({ i, fraction: x - Math.floor(x + 1e-9) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  for (const { i } of order) {
    if (rest <= 0) break
    floors[i] += 1
    rest -= 1
  }

  return weights.map((w, i) => ({ share: round(w / totalWeight, 4), points: floors[i] / 100 }))
}

/**
 * Целевой показатель РОП (ТЗ 6.3): факт F, процент достижения P = 100 × F / T,
 * отклонение Δ = F − T и признак «достигнут». Для процентных F = 100 × A / D,
 * при D = 0 — «недостаточно данных» (всё null).
 */
export function measure(
  target: number,
  direction: TargetDirection,
  percent: boolean,
  value: number | null,
  numerator: number | null,
  denominator: number | null,
) {
  let fact = value
  if (percent) {
    fact = numerator !== null && denominator !== null && denominator > 0 ? round((100 * numerator) / denominator, 2) : null
  }
  if (fact === null) {
    return { value: null, achievementPercent: null, deviation: null, achieved: null }
  }
  return {
    value: fact,
    achievementPercent: target > 0 ? round((100 * fact) / target, 1) : null,
    deviation: round(fact - target, 2),
    achieved: direction === 'AT_MOST' ? fact <= target : fact >= target,
  }
}

/** Нормализация идентификатора для поиска дублей (ТЗ 5.2, шаг 1) */
export function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[\s/]+$/, '')
    .replace(/\s+/g, '')
}

/** Нормализация названия: регистр, пробелы, пунктуация */
export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}
