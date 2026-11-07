package ru.fa.kpi.common;

/**
 * Действие противоречит текущему состоянию → 409.
 * Например: периоды пересекаются, отчёт без обязательных показателей, период закрыт.
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
