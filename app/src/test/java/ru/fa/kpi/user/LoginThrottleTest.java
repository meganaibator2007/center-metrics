package ru.fa.kpi.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import ru.fa.kpi.common.TooManyRequestsException;

class LoginThrottleTest {

    private static final String ADDRESS = "10.0.0.7";

    /** Часы, которые двигает сам тест. */
    private static final class TestClock extends Clock {

        private Instant now = Instant.parse("2026-11-13T10:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    private final TestClock clock = new TestClock();
    private final LoginThrottle throttle = new LoginThrottle(clock);

    private void fail(String login, int times) {
        for (int i = 0; i < times; i++) {
            throttle.check(login, ADDRESS);
            throttle.failed(login, ADDRESS);
        }
    }

    @Test
    void fifthFailureLocksLoginForFifteenMinutes() {
        fail("a.ivanova", LoginThrottle.MAX_LOGIN_FAILURES);

        assertThatThrownBy(() -> throttle.check("a.ivanova", ADDRESS))
                .isInstanceOfSatisfying(TooManyRequestsException.class,
                        e -> assertThat(e.getRetryAfter()).isEqualTo(LoginThrottle.LOCK));
        clock.advance(LoginThrottle.LOCK);
        assertThatCode(() -> throttle.check("a.ivanova", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void loginCaseAndSpacesDoNotBypassTheLock() {
        fail("A.Ivanova ", LoginThrottle.MAX_LOGIN_FAILURES);

        assertThatThrownBy(() -> throttle.check("a.ivanova", "10.0.0.8")).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void oldFailuresLeaveTheWindow() {
        fail("a.ivanova", LoginThrottle.MAX_LOGIN_FAILURES - 1);
        clock.advance(LoginThrottle.WINDOW.plusSeconds(1));
        fail("a.ivanova", 1);

        assertThatCode(() -> throttle.check("a.ivanova", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void successResetsLoginCounter() {
        fail("a.ivanova", LoginThrottle.MAX_LOGIN_FAILURES - 1);
        throttle.succeeded("a.ivanova");
        fail("a.ivanova", LoginThrottle.MAX_LOGIN_FAILURES - 1);

        assertThatCode(() -> throttle.check("a.ivanova", ADDRESS)).doesNotThrowAnyException();
    }

    @Test
    void oneAddressCannotSprayManyLogins() {
        for (int i = 0; i < LoginThrottle.MAX_ADDRESS_FAILURES; i++) {
            fail("user" + i, 1);
        }

        assertThatThrownBy(() -> throttle.check("someone.else", ADDRESS)).isInstanceOf(TooManyRequestsException.class);
        assertThatCode(() -> throttle.check("someone.else", "10.0.0.8")).doesNotThrowAnyException();
    }
}
