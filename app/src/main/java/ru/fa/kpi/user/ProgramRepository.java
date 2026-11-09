package ru.fa.kpi.user;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface ProgramRepository extends JpaRepository<Program, Long> {

    List<Program> findAllByOrderByCode();

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);
}
