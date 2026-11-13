package ru.fa.kpi.common;

/**
 * Нет прав на действие с конкретной записью → 403 с объяснением.
 * Права по роли проверяет {@code @PreAuthorize}, а это исключение — правила, которые зависят от самой записи:
 * своё нельзя проверять, чужое нельзя менять.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
