package ru.fa.kpi.achievement;

import java.time.Instant;

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

/** Решение на маршруте: кто, когда и что решил по какой редакции. Строки только добавляются. */
@Entity
@Table(name = "ach_decision")
@Getter
@Setter
class Decision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id")
    private Achievement achievement;

    private int revision;

    @Enumerated(EnumType.STRING)
    private DecisionAction action;

    private Long actorId;

    private String comment;

    @CreationTimestamp
    private Instant decidedAt;
}
