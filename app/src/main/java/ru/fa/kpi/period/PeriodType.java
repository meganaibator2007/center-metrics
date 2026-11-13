package ru.fa.kpi.period;

/** Тип отчётного периода. CUSTOM — произвольный, такие периоды могут накладываться. */
public enum PeriodType {
    MONTH,
    QUARTER,
    SEMESTER,
    HALF_YEAR,
    YEAR,
    ACADEMIC_YEAR,
    CUSTOM
}
