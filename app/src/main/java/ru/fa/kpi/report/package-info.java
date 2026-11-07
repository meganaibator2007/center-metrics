/**
 * Итоги: кабинет преподавателя, статус и отправка отчёта, отчёт преподавателя,
 * сводный отчёт с рейтингом, контроль сдачи. Публикует ReportSubmitted и ReportReturned.
 * Таблицы с префиксом rep_, миграции V600–V699.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period", "entry", "scoring"})
package ru.fa.kpi.report;

import org.springframework.modulith.ApplicationModule;
