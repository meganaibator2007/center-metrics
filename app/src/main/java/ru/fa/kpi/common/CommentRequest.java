package ru.fa.kpi.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Решение, где причина обязательна: возврат, отклонение, переоткрытие периода. */
public record CommentRequest(
        @NotBlank(message = "Укажите причину")
        @Size(max = 1000, message = "Не длиннее 1000 символов")
        String comment) {
}
