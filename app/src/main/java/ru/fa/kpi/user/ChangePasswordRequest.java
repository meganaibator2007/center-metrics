package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record ChangePasswordRequest(
        @NotBlank(message = "Укажите текущий пароль")
        String currentPassword,

        @NotBlank(message = "Укажите новый пароль")
        @Size(min = 8, message = "Не короче 8 символов")
        String newPassword) {
}
