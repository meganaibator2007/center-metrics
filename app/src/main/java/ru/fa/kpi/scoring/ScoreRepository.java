package ru.fa.kpi.scoring;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface ScoreRepository extends JpaRepository<Score, Long> {

    Optional<Score> findByUserIdAndPeriodIdAndIndicatorId(Long userId, Long periodId, Long indicatorId);

    List<Score> findByUserIdAndPeriodId(Long userId, Long periodId);

    List<Score> findByPeriodId(Long periodId);
}
