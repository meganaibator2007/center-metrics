package ru.fa.kpi.period;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.jpa.repository.JpaRepository;

interface PeriodRepository extends JpaRepository<Period, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Period p where p.id = :id")
    Optional<Period> findForUpdate(Long id);

    List<Period> findAllByOrderByStartDateDescIdDesc();

    List<Period> findByStatus(PeriodStatus status);

    /** Есть ли период этого типа, который пересекается с датами [start, end]. */
    boolean existsByTypeAndStartDateLessThanEqualAndEndDateGreaterThanEqual(PeriodType type, LocalDate end, LocalDate start);
}
