package ru.fa.kpi.indicator;

import java.math.BigDecimal;
import java.util.Objects;

/** Ручной маппер. Код, категорию, номер и даты редакции задаёт сервис. */
final class IndicatorMapper {

    private IndicatorMapper() {
    }

    static IndicatorDto toDto(Indicator indicator, IndicatorVersion version) {
        return new IndicatorDto(
                indicator.getId(),
                indicator.getCode(),
                version.getName(),
                indicator.getCategory(),
                version.getEvaluationType(),
                version.getUnit(),
                version.getBasePoints(),
                version.getAccrualMethod(),
                version.getAchievementType(),
                version.getTargetValue(),
                version.isPercent(),
                version.getDirection(),
                version.getCoefficient(),
                version.getMaxPoints(),
                version.getMaxRepeats(),
                version.isRequiresProgram(),
                version.getEvidence(),
                version.getMethodology(),
                version.isRequired(),
                version.isEvidenceRequired(),
                version.getVersionNo(),
                version.getValidFrom(),
                version.getValidTo(),
                indicator.isArchived());
    }

    static IndicatorVersionDto toDto(IndicatorVersion version) {
        return new IndicatorVersionDto(
                version.getVersionNo(),
                version.getName(),
                version.getIndicator().getCategory(),
                version.getEvaluationType(),
                version.getUnit(),
                version.getBasePoints(),
                version.getAccrualMethod(),
                version.getAchievementType(),
                version.getTargetValue(),
                version.isPercent(),
                version.getDirection(),
                version.getCoefficient(),
                version.getMaxPoints(),
                version.getMaxRepeats(),
                version.isRequiresProgram(),
                version.getEvidence(),
                version.getMethodology(),
                version.isRequired(),
                version.isEvidenceRequired(),
                version.getValidFrom(),
                version.getValidTo(),
                version.getCreatedAt());
    }

    static IndicatorRule toRule(IndicatorVersion version) {
        Indicator indicator = version.getIndicator();
        return new IndicatorRule(
                indicator.getId(),
                version.getId(),
                indicator.getCode(),
                version.getName(),
                indicator.getCategory(),
                version.getEvaluationType(),
                version.getUnit(),
                version.getAchievementType(),
                version.getBasePoints(),
                version.getAccrualMethod(),
                version.getCoefficient(),
                version.getMaxPoints(),
                version.getMaxRepeats(),
                version.getTargetValue(),
                version.getDirection(),
                version.isPercent(),
                version.isRequiresProgram(),
                version.isEvidenceRequired(),
                version.getEvidence(),
                indicator.isArchived());
    }

    /** Переносит правило из запроса в редакцию. Поля чужого типа оценки обнуляются: так требует схема. */
    static void apply(IndicatorVersion version, IndicatorRequest request) {
        boolean points = request.evaluationType() == EvaluationType.POINTS;
        version.setName(request.name().trim());
        version.setMethodology(blankToNull(request.methodology()));
        version.setEvaluationType(request.evaluationType());
        version.setUnit(request.unit().trim());
        version.setBasePoints(points ? request.basePoints() : null);
        version.setAccrualMethod(points ? request.accrualMethod() : null);
        version.setAchievementType(points ? request.achievementType() : null);
        version.setMaxPoints(points ? request.maxPoints() : null);
        version.setTargetValue(points ? null : request.targetValue());
        version.setDirection(points ? null : Objects.requireNonNullElse(request.direction(), TargetDirection.AT_LEAST));
        version.setPercent(!points && Boolean.TRUE.equals(request.percent()));
        version.setCoefficient(Objects.requireNonNullElse(request.coefficient(), BigDecimal.ONE));
        version.setMaxRepeats(request.maxRepeats());
        version.setRequired(Boolean.TRUE.equals(request.required()));
        version.setRequiresProgram(Boolean.TRUE.equals(request.requiresProgram()));
        version.setEvidence(request.evidence() == null ? "" : request.evidence().trim());
        version.setEvidenceRequired(!Boolean.FALSE.equals(request.evidenceRequired()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
