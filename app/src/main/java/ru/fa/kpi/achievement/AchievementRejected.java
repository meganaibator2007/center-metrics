package ru.fa.kpi.achievement;

/** Достижение отклонено: если по нему были начисления (пересмотр), scoring их отменяет. */
public record AchievementRejected(Long achievementId, Long rejectedBy) {
}
