package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record ResetPasswordRequest(
        @NotBlank(message = "Укажите временный пароль")
        @Size(min = 8, message = "Не короче 8 символов")
        String password) {
}
