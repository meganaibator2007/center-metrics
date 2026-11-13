package ru.fa.kpi.achievement;

import java.math.BigDecimal;

public record ParticipantDto(Long userId, String fullName, boolean external, BigDecimal weight, BigDecimal share, BigDecimal points) {
}
