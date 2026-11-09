package ru.fa.kpi.common;

/** Объект не найден → 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
