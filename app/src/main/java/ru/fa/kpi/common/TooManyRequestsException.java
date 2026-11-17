package ru.fa.kpi.common;

import java.time.Duration;

/** Слишком много попыток → 429 с заголовком Retry-After: через сколько секунд можно повторить. */
public class TooManyRequestsException extends RuntimeException {

    private final Duration retryAfter;

    public TooManyRequestsException(String message, Duration retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }

    public Duration getRetryAfter() {
        return retryAfter;
    }
}
