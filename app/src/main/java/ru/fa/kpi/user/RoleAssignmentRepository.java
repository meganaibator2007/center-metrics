package ru.fa.kpi.user;

import org.springframework.data.jpa.repository.JpaRepository;

interface RoleAssignmentRepository extends JpaRepository<RoleAssignment, Long> {

    boolean existsByRoleAndValidToIsNull(Role role);
}
