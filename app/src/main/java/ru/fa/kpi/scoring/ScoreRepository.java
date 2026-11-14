package ru.fa.kpi.scoring;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ScoreRepository extends JpaRepository<Score, Long> {

    /**
     * Блокирует итог человека по показателю за период до конца транзакции, даже если строки итога ещё нет.
     * Это advisory-блокировка PostgreSQL: её ключ — хеш от человека, периода и показателя, а не строка таблицы.
     */
    @Query(value = """
            select 1 from pg_advisory_xact_lock(
                hashtextextended(concat_ws(':', 'scr_score', :userId, :periodId, :indicatorId), 0))
            """, nativeQuery = true)
    Integer lock(Long userId, Long periodId, Long indicatorId);

    Optional<Score> findByUserIdAndPeriodIdAndIndicatorId(Long userId, Long periodId, Long indicatorId);

    List<Score> findByUserIdAndPeriodId(Long userId, Long periodId);

    List<Score> findByPeriodId(Long periodId);
}
