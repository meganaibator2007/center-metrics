package ru.fa.kpi.user;

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

/** Назначение роли. Заполненная дата validTo означает, что роль снята: строка остаётся историей. */
@Entity
@Table(name = "usr_role_assignment")
@Getter
@Setter
class RoleAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private Role role;

    /** Область проверки: заполнена только у REVIEWER. */
    private Long programId;

    private LocalDate validFrom;

    private LocalDate validTo;

    private Long assignedBy;

    @CreationTimestamp
    private Instant createdAt;
}
