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
import org.hibernate.annotations.CreationTimestamp;

/** Итог на момент закрытия периода (ТЗ 4.3). Если период переоткрыли и закрыли снова — следующий номер. */
@Entity
@Table(name = "scr_period_snapshot")
@Getter
@Setter
class PeriodSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long periodId;

    private int snapshotNo;

    private Long userId;

    private Long indicatorId;

    private Long indicatorVersionId;

    private int accrualCount;

    private BigDecimal score;

    private Long takenBy;

    @CreationTimestamp
    private Instant takenAt;
}
