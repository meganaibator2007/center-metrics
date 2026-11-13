package ru.fa.kpi.scoring;

import java.math.BigDecimal;

/** Официальный итог по показателю за период: сумма утверждённых долей и итог с учётом максимума. */
public record ScoreView(Long indicatorId, BigDecimal totalPoints, BigDecimal maxPoints, BigDecimal score, int accrualCount) {
}
