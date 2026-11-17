package ru.fa.kpi.achievement;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Соавтор: сотрудник (userId) или внешний автор (fullName). Заявителя сервер добавляет сам с весом 1. */
record ParticipantRequest(
        Long userId,

        @Size(max = 300, message = "Не длиннее 300 символов")
        String fullName,

        @NotNull(message = "Укажите вес участия")
        @DecimalMin(value = "0.01", message = "Вес не меньше 0,01")
        @DecimalMax(value = "100", message = "Вес не больше 100")
        @Digits(integer = 3, fraction = 4, message = "Не больше 4 знаков после запятой")
        BigDecimal weight,

        @Size(max = 1000, message = "Не длиннее 1000 символов")
        String basis) {
}
