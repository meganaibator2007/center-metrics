package ru.fa.kpi.achievement;

import java.math.BigDecimal;

/** Доля сотрудника в достижении за период: для личных итогов «утверждено / на проверке / введено». */
public record Participation(Long achievementId, Long indicatorId, ResultStatus status, BigDecimal points) {
}
