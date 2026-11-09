package ru.fa.kpi.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record DepartmentRequest(
        @NotBlank(message = "Укажите название")
        @Size(max = 150, message = "Не длиннее 150 символов")
        String name) {
}
