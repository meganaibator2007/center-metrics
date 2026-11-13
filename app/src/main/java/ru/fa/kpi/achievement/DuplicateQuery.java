package ru.fa.kpi.achievement;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

record DuplicateQuery(
        @NotNull(message = "Выберите показатель")
        Long indicatorId,
        IdentifierType identifierType,
        String identifier,
        String title,
        LocalDate eventDate,
        Long excludeId) {
}
