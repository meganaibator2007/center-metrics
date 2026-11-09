package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;

record LoginRequest(
        @NotBlank(message = "Укажите логин") String login,
        @NotBlank(message = "Укажите пароль") String password) {
}
