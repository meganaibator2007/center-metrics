/**
 * Справочник показателей ППС, АУП и РОП и их редакции. Правка показателя создаёт новую редакцию,
 * утверждённые результаты остаются на своей. К периоду относится редакция, действующая на дату его начала.
 * Таблицы с префиксом ind_, миграции V200–V299.
 */
@ApplicationModule(allowedDependencies = {"common"})
package ru.fa.kpi.indicator;

import org.springframework.modulith.ApplicationModule;
