package ru.fa.kpi.achievement;

import jakarta.validation.constraints.Size;

/** Решение, где комментарий необязателен: проверка и утверждение. */
record DecisionRequest(@Size(max = 1000, message = "Не длиннее 1000 символов") String comment) {
}
