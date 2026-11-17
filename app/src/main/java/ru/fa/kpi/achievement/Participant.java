package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Entity;
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

/** Автор достижения: сотрудник (userId) или внешний соавтор (externalName). */
@Entity
@Table(name = "ach_participant")
@Getter
@Setter
class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id")
    private Achievement achievement;

    private Long userId;

    private String externalName;

    private BigDecimal weight;

    private BigDecimal share;

    private BigDecimal pointsExact;

    private BigDecimal points;

    private String basis;

    @CreationTimestamp
    private Instant createdAt;

    boolean isExternal() {
        return userId == null;
    }
}
