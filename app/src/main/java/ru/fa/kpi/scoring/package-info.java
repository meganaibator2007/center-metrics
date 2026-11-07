/**
 * Расчёт баллов: значение × коэффициент, но не больше максимального балла.
 * Пересчитывает баллы по событию EntryChanged в той же транзакции для всех открытых периодов, куда попадает дата записи,
 * баллы закрытых периодов не трогает.
 * Таблицы с префиксом scr_, миграции V500–V599.
 */
@ApplicationModule(allowedDependencies = {"common", "entry", "indicator", "period"})
package ru.fa.kpi.scoring;

import org.springframework.modulith.ApplicationModule;
