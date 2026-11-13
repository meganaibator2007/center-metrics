package ru.fa.kpi.report;

import java.math.BigDecimal;
import java.util.List;

import ru.fa.kpi.period.PeriodDto;

record MyScoresDto(PeriodDto period, List<ScoreRow> rows, BigDecimal approvedTotal, BigDecimal onReviewTotal,
                   BigDecimal enteredTotal) {
}
