package ru.fa.kpi.period;

import java.time.Instant;
import java.time.LocalDate;

public record PeriodDto(
        Long id,
        String name,
        PeriodType type,
        LocalDate startDate,
        LocalDate endDate,
        boolean closed,
        Instant closedAt) {
}
