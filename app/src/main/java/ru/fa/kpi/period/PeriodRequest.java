package ru.fa.kpi.period;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

record PeriodRequest(
        @NotBlank(message = "Укажите название")
        @Size(max = 100, message = "Не длиннее 100 символов")
        String name,

        @NotNull(message = "Укажите тип периода")
        PeriodType type,

        @NotNull(message = "Укажите дату начала")
        LocalDate startDate,

        @NotNull(message = "Укажите дату окончания")
        LocalDate endDate) {
}
