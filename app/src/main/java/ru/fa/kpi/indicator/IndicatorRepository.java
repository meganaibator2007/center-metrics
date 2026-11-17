package ru.fa.kpi.indicator;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface IndicatorRepository extends JpaRepository<Indicator, Long> {

    List<Indicator> findAllByOrderByCode();

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);
}
