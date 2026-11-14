package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.util.List;

/**
 * Директор утвердил достижение: scoring создаёт начисления сотрудникам и пересчитывает их итоги
 * в той же транзакции. Доли внешних соавторов сюда не входят: они никому не начисляются.
 */
public record AchievementApproved(
        Long achievementId,
        int revision,
        Long indicatorId,
        Long indicatorVersionId,
        Long periodId,
        BigDecimal basePoints,
        BigDecimal coefficient,
        BigDecimal maxPoints,
        Long approvedBy,
        List<Share> shares) {

    public record Share(Long userId, BigDecimal share, BigDecimal pointsExact, BigDecimal points) {
    }
}
