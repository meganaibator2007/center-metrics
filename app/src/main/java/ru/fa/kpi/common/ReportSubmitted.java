package ru.fa.kpi.common;

/**
 * Преподаватель отправил отчёт за период. Публикует report, слушает entry:
 * записи этого преподавателя за период больше менять нельзя.
 * Событие лежит в common, чтобы entry не зависел от report (иначе цикл).
 */
public record ReportSubmitted(Long teacherId, Long periodId) {
}
