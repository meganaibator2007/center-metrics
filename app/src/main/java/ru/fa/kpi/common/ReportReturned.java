package ru.fa.kpi.common;

/**
 * Администратор вернул отчёт на доработку. Публикует report, слушает entry:
 * записи преподавателя за период снова можно менять.
 */
public record ReportReturned(Long teacherId, Long periodId, String comment) {
}
