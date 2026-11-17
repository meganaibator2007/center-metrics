package ru.fa.kpi.user;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import ru.fa.kpi.common.TooManyRequestsException;

/**
 * Защита входа от перебора паролей. Неудачные попытки считаются отдельно по логину и по адресу клиента
 * за последние 15 минут. После лимита вход закрывается на 15 минут даже с верным паролем, иначе перебор продолжился бы.
 * <p>
 * По логину — 5 попыток: так не подобрать пароль конкретного человека. По адресу — 20: так не перебрать один
 * пароль по многим логинам. Несуществующий логин закрывается так же, как настоящий, поэтому ответ 429
 * не выдаёт, есть ли такой пользователь. Счётчики в памяти: сервер один, после перезапуска они обнуляются.
 */
@Component
class LoginThrottle {

    static final int MAX_LOGIN_FAILURES = 5;
    static final int MAX_ADDRESS_FAILURES = 20;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration LOCK = Duration.ofMinutes(15);

    /** Сверх этого числа записей при каждой неудаче выбрасываются устаревшие: память не растёт от случайных логинов. */
    private static final int CLEANUP_THRESHOLD = 10_000;

    private final Clock clock;
    private final Map<String, Failures> byLogin = new ConcurrentHashMap<>();
    private final Map<String, Failures> byAddress = new ConcurrentHashMap<>();

    LoginThrottle() {
        this(Clock.systemUTC());
    }

    LoginThrottle(Clock clock) {
        this.clock = clock;
    }

    /** Перед проверкой пароля: если вход закрыт, пароль даже не сверяется. */
    void check(String login, String address) {
        Instant now = clock.instant();
        Duration wait = max(remaining(byLogin, key(login), now), remaining(byAddress, address, now));
        if (!wait.isZero()) {
            long minutes = (wait.toMillis() + 59_999) / 60_000;
            throw new TooManyRequestsException(
                    "Слишком много неудачных попыток входа. Повторите через " + minutes + " мин.", wait);
        }
    }

    void failed(String login, String address) {
        Instant now = clock.instant();
        record(byLogin, key(login), now, MAX_LOGIN_FAILURES);
        record(byAddress, address, now, MAX_ADDRESS_FAILURES);
    }

    /** Удачный вход обнуляет счётчик логина. Счётчик адреса остаётся: с него могли перебирать чужие логины. */
    void succeeded(String login) {
        byLogin.remove(key(login));
    }

    private static String key(String login) {
        return login == null ? "" : login.trim().toLowerCase(Locale.ROOT);
    }

    private static Duration remaining(Map<String, Failures> map, String key, Instant now) {
        Failures failures = key == null ? null : map.get(key);
        return failures == null ? Duration.ZERO : failures.lockRemaining(now);
    }

    private void record(Map<String, Failures> map, String key, Instant now, int limit) {
        if (key == null) {
            return;
        }
        map.computeIfAbsent(key, k -> new Failures()).add(now, limit);
        if (map.size() > CLEANUP_THRESHOLD) {
            map.values().removeIf(failures -> failures.idle(now));
        }
    }

    private static Duration max(Duration a, Duration b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    /** Неудачи одного логина или адреса в скользящем окне и время, до которого вход закрыт. */
    private static final class Failures {

        private final Deque<Instant> recent = new ArrayDeque<>();
        private Instant lockedUntil = Instant.MIN;

        synchronized void add(Instant now, int limit) {
            forgetOld(now);
            recent.addLast(now);
            if (recent.size() >= limit) {
                lockedUntil = now.plus(LOCK);
                recent.clear();
            }
        }

        synchronized Duration lockRemaining(Instant now) {
            return now.isBefore(lockedUntil) ? Duration.between(now, lockedUntil) : Duration.ZERO;
        }

        synchronized boolean idle(Instant now) {
            forgetOld(now);
            return recent.isEmpty() && !now.isBefore(lockedUntil);
        }

        private void forgetOld(Instant now) {
            Instant border = now.minus(WINDOW);
            while (!recent.isEmpty() && !recent.peekFirst().isAfter(border)) {
                recent.removeFirst();
            }
        }
    }
}
