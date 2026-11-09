package ru.fa.kpi.user;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

/** Фильтры списка сотрудников. Условие добавляется только для заполненного фильтра. */
record UserFilter(String q, Role role, Category category, Long departmentId, Boolean active) {

    Specification<User> toSpecification() {
        return (root, query, cb) -> {
            List<Predicate> conditions = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                Expression<String> text = root.get("lastName");
                for (Expression<String> part : List.of(
                        root.<String>get("firstName"),
                        cb.coalesce(root.<String>get("middleName"), ""),
                        root.<String>get("login"))) {
                    text = cb.concat(cb.concat(text, " "), part);
                }
                conditions.add(cb.like(cb.lower(text), "%" + escape(q) + "%", '\\'));
            }
            if (role != null) {
                Subquery<Long> assignment = query.subquery(Long.class);
                Root<RoleAssignment> assignments = assignment.from(RoleAssignment.class);
                assignment.select(assignments.get("id")).where(
                        cb.equal(assignments.get("user"), root),
                        cb.equal(assignments.get("role"), role),
                        cb.isNull(assignments.get("validTo")));
                conditions.add(cb.exists(assignment));
            }
            if (category != null) {
                conditions.add(cb.isMember(category, root.<Set<Category>>get("categories")));
            }
            if (departmentId != null) {
                conditions.add(cb.equal(root.get("department").get("id"), departmentId));
            }
            if (active != null) {
                conditions.add(cb.equal(root.get("active"), active));
            }
            return cb.and(conditions.toArray(Predicate[]::new));
        };
    }

    /** Символы % и _ в запросе ищутся как обычные. */
    private static String escape(String value) {
        return value.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
