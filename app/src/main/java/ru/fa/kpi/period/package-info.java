/**
 * Отчётные периоды: создание, закрытие и санкционированное переоткрытие. Публикует PeriodClosed.
 * Таблицы с префиксом per_, миграции V300–V399.
 */
@ApplicationModule(allowedDependencies = {"common"})
package ru.fa.kpi.period;

import org.springframework.modulith.ApplicationModule;
