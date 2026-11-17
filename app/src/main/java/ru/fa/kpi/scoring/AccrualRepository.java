package ru.fa.kpi.scoring;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface AccrualRepository extends JpaRepository<Accrual, Long> {

    List<Accrual> findByAchievementIdAndStatus(Long achievementId, AccrualStatus status);

    List<Accrual> findByUserIdAndPeriodIdAndIndicatorIdAndStatus(Long userId, Long periodId, Long indicatorId,
                                                                  AccrualStatus status);
}
