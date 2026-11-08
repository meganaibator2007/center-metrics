/**
 * Отчётные периоды: создание, проверка пересечения дат периодов одного типа, закрытие.
 * Таблицы с префиксом per_, миграции V300–V399.
 */
@ApplicationModule(allowedDependencies = "common")
package ru.fa.kpi.period;

import org.springframework.modulith.ApplicationModule;
