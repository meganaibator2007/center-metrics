/**
 * Периодические значения целевых показателей РОП: факт, числитель и знаменатель, процент достижения,
 * отклонение. Значение уникально по редакции показателя, периоду и программе, исправления версионируются.
 * Таблицы с префиксом msr_, миграции V700–V799.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period"})
package ru.fa.kpi.measurement;

import org.springframework.modulith.ApplicationModule;
