/**
 * Импорт XLSX: сотрудники, показатели, измерения и достижения. Файл сначала проверяется и ничего не меняет,
 * применяется отдельным подтверждением. Утверждённые результаты импорт не перезаписывает.
 * Таблицы с префиксом imp_, миграции V900–V999.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period", "achievement", "measurement"})
package ru.fa.kpi.importing;

import org.springframework.modulith.ApplicationModule;
