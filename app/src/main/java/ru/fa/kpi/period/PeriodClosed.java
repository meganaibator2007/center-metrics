package ru.fa.kpi.period;

/** Период закрыт: scoring формирует снимок официальных итогов (ТЗ 4.3). */
public record PeriodClosed(Long periodId, Long closedBy) {
}
