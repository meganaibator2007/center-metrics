package ru.fa.kpi.user;

import java.util.Collection;
import java.util.List;

/**
 * Ручной маппер. Логин, ФИО и должность переносятся здесь, а роли, категории, программы,
 * подразделение, пароль и состояние задаёт сервис.
 */
final class UserMapper {

    private UserMapper() {
    }

    static UserDto toDto(User user) {
        Department department = user.getDepartment();
        return new UserDto(
                user.getId(),
                user.getLogin(),
                user.fullName(),
                user.getLastName(),
                user.getFirstName(),
                user.getMiddleName(),
                user.getExternalId(),
                sorted(user.activeRoles()),
                sorted(user.getCategories()),
                sorted(user.getPermissions()),
                department == null ? null : department.getId(),
                department == null ? null : department.getName(),
                user.getManagerId(),
                user.getPosition(),
                sorted(user.getProgramIds()),
                sorted(user.reviewProgramIds()),
                user.isActive(),
                user.isMustChangePassword());
    }

    static PersonShort toShort(User user) {
        Department department = user.getDepartment();
        return new PersonShort(user.getId(), user.fullName(), department == null ? null : department.getName());
    }

    static EmploymentRecordDto toDto(EmploymentRecord record) {
        Department department = record.getDepartment();
        return new EmploymentRecordDto(
                department == null ? null : department.getName(),
                record.getPosition(),
                record.getValidFrom(),
                record.getValidTo());
    }

    static User toEntity(UserRequest request) {
        User user = new User();
        update(user, request);
        return user;
    }

    static void update(User user, UserRequest request) {
        user.setLastName(request.lastName().trim());
        user.setFirstName(request.firstName().trim());
        user.setMiddleName(blankToNull(request.middleName()));
        user.setLogin(request.login());
        user.setPosition(blankToNull(request.position()));
        user.setExternalId(blankToNull(request.externalId()));
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static <T extends Comparable<? super T>> List<T> sorted(Collection<T> values) {
        return values.stream().sorted().toList();
    }
}
