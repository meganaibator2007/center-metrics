package ru.fa.kpi.scoring;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface PeriodSnapshotRepository extends JpaRepository<PeriodSnapshot, Long> {

    @Query("select coalesce(max(s.snapshotNo), 0) from PeriodSnapshot s where s.periodId = :periodId")
    int lastNumber(Long periodId);
}
