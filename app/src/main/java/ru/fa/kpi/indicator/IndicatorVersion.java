package ru.fa.kpi.indicator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Редакция показателя. После создания меняется только {@code validTo}: новая редакция закрывает предыдущую,
 * а результаты, посчитанные по этой, остаются объяснимыми.
 */
@Entity
@Table(name = "ind_indicator_version")
@Getter
@Setter
class IndicatorVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "indicator_id")
    private Indicator indicator;

    private int versionNo;

    private String name;

    private String methodology;

    @Enumerated(EnumType.STRING)
    private EvaluationType evaluationType;

    private String unit;

    @Enumerated(EnumType.STRING)
    private AchievementType achievementType;

    private BigDecimal basePoints;

    @Enumerated(EnumType.STRING)
    private AccrualMethod accrualMethod;

    private BigDecimal targetValue;

    @Enumerated(EnumType.STRING)
    private TargetDirection direction;

    private boolean percent;

    private BigDecimal coefficient;

    private BigDecimal maxPoints;

    private Integer maxRepeats;

    private boolean required;

    private boolean requiresProgram;

    private String evidence;

    private boolean evidenceRequired;

    private LocalDate validFrom;

    private LocalDate validTo;

    private Long createdBy;

    @CreationTimestamp
    private Instant createdAt;

    boolean covers(LocalDate date) {
        return !date.isBefore(validFrom) && (validTo == null || !date.isAfter(validTo));
    }
}
