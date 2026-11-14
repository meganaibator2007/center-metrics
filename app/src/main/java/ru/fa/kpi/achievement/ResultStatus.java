package ru.fa.kpi.achievement;

/** Статус на маршруте согласования (ТЗ 4.1). В официальный итог входит только APPROVED. */
public enum ResultStatus {
    DRAFT,
    ON_REVIEW,
    RETURNED,
    REVIEWED,
    APPROVED,
    REJECTED,
    REVISION
}
