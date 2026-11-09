package ru.fa.kpi.common;

/**
 * Значимое действие, которое нужно записать в журнал аудита (ТЗ, раздел 1.3, п. 6).
 * Публикует любой пакет, слушает audit. Событие лежит в common, чтобы пакетам
 * не приходилось зависеть от audit.
 *
 * @param actorId    кто выполнил действие; {@code null}, если сама система
 * @param actorName  ФИО на момент действия
 * @param action     что сделано: CREATED, APPROVED, CLOSED и т. п.
 * @param objectType вид объекта: ACHIEVEMENT, PERIOD, INDICATOR и т. п.
 * @param objectId   ID объекта, если он есть
 * @param objectName как объект показывать в журнале
 * @param oldData    прежняя версия в JSON или {@code null}
 * @param newData    новая версия в JSON или {@code null}
 * @param comment    основание или комментарий
 */
public record AuditRecorded(
        Long actorId,
        String actorName,
        String action,
        String objectType,
        Long objectId,
        String objectName,
        String oldData,
        String newData,
        String comment) {
}
