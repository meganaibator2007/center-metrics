/**
 * Записи преподавателя по показателям и прикреплённые файлы (подпакет attachment).
 * Публикует EntrySaved, слушает ReportSubmitted и ReportReturned из common.
 * Таблицы с префиксом ent_, миграции V400–V499.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period"})
package ru.fa.kpi.entry;

import org.springframework.modulith.ApplicationModule;
