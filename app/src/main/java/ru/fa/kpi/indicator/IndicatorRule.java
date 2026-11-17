package ru.fa.kpi.indicator;

import java.math.BigDecimal;

import ru.fa.kpi.common.Category;

/** Правило из конкретной редакции показателя: то, что нужно для расчёта другим пакетам. */
public record IndicatorRule(
        Long indicatorId,
        Long versionId,
        String code,
        String name,
        Category category,
        EvaluationType evaluationType,
        String unit,
        AchievementType achievementType,
        BigDecimal basePoints,
        AccrualMethod accrualMethod,
        BigDecimal coefficient,
        BigDecimal maxPoints,
        Integer maxRepeats,
        BigDecimal targetValue,
        TargetDirection direction,
        boolean percent,
        boolean requiresProgram,
        boolean evidenceRequired,
        String evidence,
        boolean archived) {

    public boolean isPoints() {
        return evaluationType == EvaluationType.POINTS;
    }
}
