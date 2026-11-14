package ru.fa.kpi.user;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface RoleAssignmentRepository extends JpaRepository<RoleAssignment, Long> {

    boolean existsByRoleAndValidToIsNull(Role role);

    /** Активные сотрудники с действующей ролью и областью в одной из программ. */
    @Query("""
            select distinct r.user.id from RoleAssignment r
            where r.role = :role and r.validTo is null and r.programId in :programIds and r.user.active = true
            """)
    List<Long> findActiveUserIds(Role role, Collection<Long> programIds);
}
