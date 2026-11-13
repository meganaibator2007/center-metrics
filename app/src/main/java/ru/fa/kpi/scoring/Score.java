package ru.fa.kpi.scoring;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Официальный итог сотрудника по показателю за период: S = min(M, Σ). */
@Entity
@Table(name = "scr_score")
@Getter
@Setter
class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private Long periodId;

    private Long indicatorId;

    private Long indicatorVersionId;

    private int accrualCount;

    private BigDecimal totalPoints;

    private BigDecimal maxPoints;

    private BigDecimal score;

    private Long calculatedBy;

    private Instant calculatedAt;
}
