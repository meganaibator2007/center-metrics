package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;

/** Требования к новому паролю проверяет {@link PasswordPolicy}: так правила в одном месте. */
record ChangePasswordRequest(
        @NotBlank(message = "Укажите текущий пароль")
        String currentPassword,

        @NotBlank(message = "Укажите новый пароль")
        String newPassword) {
}
