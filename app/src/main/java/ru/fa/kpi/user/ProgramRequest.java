package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

record ProgramRequest(
        @NotBlank(message = "Укажите код")
        @Size(max = 30, message = "Не длиннее 30 символов")
        String code,

        @NotBlank(message = "Укажите название")
        @Size(max = 255, message = "Не длиннее 255 символов")
        String name,

        @NotNull(message = "Укажите, относится ли программа к топ-ИТ")
        Boolean topIt) {
}
