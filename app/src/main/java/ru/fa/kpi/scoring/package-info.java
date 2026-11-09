/**
 * Начисления и итоги: при утверждении достижения создаёт начисления сотрудникам и пересчитывает
 * итог S = min(M, Σ) в той же транзакции. При закрытии периода формирует снимок итогов.
 * Слушает AchievementApproved, AchievementRejected и PeriodClosed.
 * Таблицы с префиксом scr_, миграции V500–V599.
 */
@ApplicationModule(allowedDependencies = {"common", "achievement", "indicator", "period"})
package ru.fa.kpi.scoring;

import org.springframework.modulith.ApplicationModule;
