package ru.fa.kpi.period;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface PeriodRepository extends JpaRepository<Period, Long> {

    List<Period> findAllByOrderByStartDateDescIdDesc();

    List<Period> findByStatus(PeriodStatus status);

    /** Есть ли период этого типа, который пересекается с датами [start, end]. */
    boolean existsByTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(PeriodType type, LocalDate end, LocalDate start);
}
