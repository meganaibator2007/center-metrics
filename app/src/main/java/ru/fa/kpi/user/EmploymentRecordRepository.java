package ru.fa.kpi.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface EmploymentRecordRepository extends JpaRepository<EmploymentRecord, Long> {

    Optional<EmploymentRecord> findByUserIdAndValidToIsNull(Long userId);

    List<EmploymentRecord> findByUserIdOrderByValidFromDescIdDesc(Long userId);
}
