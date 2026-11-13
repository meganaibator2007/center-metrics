package ru.fa.kpi.report;

import java.math.BigDecimal;

import ru.fa.kpi.common.Category;
import ru.fa.kpi.indicator.AccrualMethod;

/** Баллы сотрудника по показателю: утверждено, на проверке и введено, но не отправлено. */
record ScoreRow(
        Long indicatorId,
        String indicatorCode,
        String indicatorName,
        Category category,
        BigDecimal basePoints,
        AccrualMethod accrualMethod,
        BigDecimal maxPoints,
        BigDecimal approved,
        BigDecimal onReview,
        BigDecimal entered,
        int count) {
}
