package ru.fa.kpi.achievement;

import java.time.LocalDate;
import java.util.List;

public record DuplicateDto(
        Long achievementId,
        String title,
        String indicatorCode,
        LocalDate eventDate,
        List<String> participants,
        ResultStatus status,
        DuplicateMatch match) {
}
