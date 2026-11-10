package ru.fa.kpi.user;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

record UserRequest(
        @NotBlank(message = "Укажите фамилию")
        @Size(max = 100, message = "Не длиннее 100 символов")
        String lastName,

        @NotBlank(message = "Укажите имя")
        @Size(max = 100, message = "Не длиннее 100 символов")
        String firstName,

        @Size(max = 100, message = "Не длиннее 100 символов")
        String middleName,

        @NotBlank(message = "Укажите логин")
        @Pattern(regexp = "^[a-z0-9.-]{3,50}$", message = "От 3 до 50 символов: строчные латинские буквы, цифры, точка и дефис")
        String login,

        @NotEmpty(message = "Назначьте хотя бы одну роль")
        Set<Role> roles,

        @NotNull(message = "Укажите категории оценки")
        Set<Category> categories,

        Long departmentId,

        @Size(max = 100, message = "Не длиннее 100 символов")
        String position,

        @NotNull(message = "Укажите образовательные программы")
        Set<Long> programIds,

        Set<Long> reviewProgramIds,

        Set<Permission> permissions,

        Long managerId,

        @Size(max = 50, message = "Не длиннее 50 символов")
        String externalId,

        String password) {
}
