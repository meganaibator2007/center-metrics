package ru.fa.kpi.achievement;

import java.time.Instant;

public record DecisionDto(Long id, DecisionAction action, String actor, String comment, Instant at) {
}
