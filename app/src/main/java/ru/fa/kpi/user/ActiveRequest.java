package ru.fa.kpi.user;

import jakarta.validation.constraints.NotNull;

record ActiveRequest(@NotNull(message = "Укажите состояние") Boolean active) {
}
