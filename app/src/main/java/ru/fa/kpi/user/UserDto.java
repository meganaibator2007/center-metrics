package ru.fa.kpi.user;

import java.util.List;
import ru.fa.kpi.common.Category;

public record UserDto(
        Long id,
        String login,
        String fullName,
        String lastName,
        String firstName,
        String middleName,
        String externalId,
        List<Role> roles,
        List<Category> categories,
        List<Permission> permissions,
        Long departmentId,
        String departmentName,
        Long managerId,
        String position,
        List<Long> programIds,
        List<Long> reviewProgramIds,
        boolean active,
        boolean mustChangePassword) {
}
