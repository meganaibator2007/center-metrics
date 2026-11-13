package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import ru.fa.kpi.common.Category;
import ru.fa.kpi.indicator.AchievementType;
import ru.fa.kpi.user.PersonShort;

public record AchievementDto(
        Long id,
        Long indicatorId,
        String indicatorCode,
        String indicatorName,
        Category category,
        AchievementType achievementType,
        Long periodId,
        String periodName,
        String title,
        LocalDate eventDate,
        IdentifierType identifierType,
        String identifier,
        Long programId,
        String programName,
        String discipline,
        String description,
        BigDecimal quantity,
        PersonShort owner,
        String enteredBy,
        String basis,
        List<ParticipantDto> participants,
        BigDecimal basePoints,
        BigDecimal coefficient,
        ResultStatus status,
        ReviewerKind reviewer,
        boolean possibleDuplicate,
        String lastComment,
        List<EvidenceDto> evidence,
        List<DecisionDto> history,
        int version,
        Instant createdAt,
        Instant updatedAt) {
}
