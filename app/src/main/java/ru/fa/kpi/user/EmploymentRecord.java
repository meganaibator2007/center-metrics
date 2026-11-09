package ru.fa.kpi.user;

import java.time.Instant;
import java.time.LocalDate;

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

/** Запись истории переводов. Текущее место работы — строка без даты validTo. */
@Entity
@Table(name = "usr_employment_history")
@Getter
@Setter
class EmploymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    private String position;

    private LocalDate validFrom;

    private LocalDate validTo;

    private Long changedBy;

    @CreationTimestamp
    private Instant createdAt;
}
