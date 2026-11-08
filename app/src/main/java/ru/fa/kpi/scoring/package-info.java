/**
 * Расчёт баллов: значение × коэффициент, но не больше максимального балла.
 * Пересчитывает баллы по событию EntrySaved в той же транзакции,
 * баллы закрытых периодов не трогает.
 * Таблицы с префиксом scr_, миграции V500–V599.
 */
@ApplicationModule(allowedDependencies = {"common", "entry", "indicator", "period"})
package ru.fa.kpi.scoring;

import org.springframework.modulith.ApplicationModule;
