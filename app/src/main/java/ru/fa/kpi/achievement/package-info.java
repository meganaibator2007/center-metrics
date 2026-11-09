/**
 * Единый реестр достижений: участники и их доли, подтверждения, поиск дублей, маршрут согласования,
 * запрет проверять и утверждать своё, редакции при пересмотре. Публикует AchievementApproved и AchievementRejected.
 * Таблицы с префиксом ach_, миграции V400–V499.
 */
@ApplicationModule(allowedDependencies = {"common", "user", "indicator", "period"})
package ru.fa.kpi.achievement;

import org.springframework.modulith.ApplicationModule;
