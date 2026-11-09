package ru.fa.kpi.common;

import java.util.Map;

/**
 * Ошибка в полях запроса, которую нельзя проверить аннотациями: нужно посмотреть в базу
 * или сравнить поля между собой → 400 с текстами в свойстве {@code errors}.
 */
public class FieldValidationException extends RuntimeException {

    private final Map<String, String> errors;

    public FieldValidationException(Map<String, String> errors) {
        super("Ошибка в полях запроса: " + errors.keySet());
        this.errors = Map.copyOf(errors);
    }

    public FieldValidationException(String field, String message) {
        this(Map.of(field, message));
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
