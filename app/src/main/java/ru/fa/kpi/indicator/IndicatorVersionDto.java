package ru.fa.kpi.indicator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import ru.fa.kpi.common.Category;

public record IndicatorVersionDto(
        int version,
        String name,
        Category category,
        EvaluationType evaluationType,
        String unit,
        BigDecimal basePoints,
        AccrualMethod accrualMethod,
        AchievementType achievementType,
        BigDecimal targetValue,
        boolean percent,
        TargetDirection direction,
        BigDecimal coefficient,
        BigDecimal maxPoints,
        Integer maxRepeats,
        boolean requiresProgram,
        String evidence,
        String methodology,
        boolean required,
        boolean evidenceRequired,
        LocalDate validFrom,
        LocalDate validTo,
        Instant createdAt) {
}
