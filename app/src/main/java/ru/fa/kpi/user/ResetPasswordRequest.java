package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;

/** Временный пароль подчиняется тем же правилам {@link PasswordPolicy}, что и постоянный. */
record ResetPasswordRequest(
        @NotBlank(message = "Укажите временный пароль")
        String password) {
}
