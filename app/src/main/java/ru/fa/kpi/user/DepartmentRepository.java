package ru.fa.kpi.user;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findAllByOrderByName();

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);
}
