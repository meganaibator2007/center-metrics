package ru.fa.kpi.scoring;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** Начисление сотруднику по утверждённой редакции достижения. Правило расчёта копируется в строку. */
@Entity
@Table(name = "scr_accrual")
@Getter
@Setter
class Accrual {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long achievementId;

    private int revision;

    private Long userId;

    private Long indicatorId;

    private Long indicatorVersionId;

    private Long periodId;

    private BigDecimal basePoints;

    private BigDecimal coefficient;

    private BigDecimal share;

    private BigDecimal pointsExact;

    private BigDecimal points;

    private String formula;

    @Enumerated(EnumType.STRING)
    private AccrualStatus status = AccrualStatus.ACTIVE;

    private Long calculatedBy;

    @CreationTimestamp
    private Instant calculatedAt;
}
