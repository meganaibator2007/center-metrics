package ru.fa.kpi.user;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByLogin(String login);

    boolean existsByLogin(String login);

    boolean existsByLoginAndIdNot(String login, Long id);

    boolean existsByExternalId(String externalId);

    boolean existsByExternalIdAndIdNot(String externalId, Long id);

    @Query("""
            select u from User u
            where u.active = true and exists (
                select 1 from RoleAssignment r where r.user = u and r.role = :role and r.validTo is null)
            order by u.lastName, u.firstName, u.id
            """)
    List<User> findActiveWithRole(Role role);
}
