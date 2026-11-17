package ru.fa.kpi.period;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.fa.kpi.TestcontainersConfiguration;
import ru.fa.kpi.achievement.AchievementApproved;
import ru.fa.kpi.common.ConflictException;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class PeriodConcurrencyTests {
    @Autowired PeriodService periods;
    @Autowired PlatformTransactionManager transactions;
    @Autowired ApplicationEventPublisher events;
    @Autowired JdbcTemplate jdbc;

    @Test
    void closingWaitsForApprovalAndIncludesItsScore() throws Exception {
        long id = periods.create(new PeriodRequest("Concurrent", PeriodType.CUSTOM,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31))).id();
        CountDownLatch openChecked = new CountDownLatch(1);
        CountDownLatch proceed = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Future<?> approval = pool.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
                periods.requireOpen(id);
                openChecked.countDown();
                try {
                    if (!proceed.await(10, SECONDS)) throw new IllegalStateException("Approval timed out");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
                events.publishEvent(new AchievementApproved(990001L, 1, 990002L, 990003L, id,
                        BigDecimal.TEN, BigDecimal.ONE, null, 990004L,
                        List.of(new AchievementApproved.Share(990005L, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN))));
            }));
            try {
                assertThat(openChecked.await(10, SECONDS)).isTrue();
                Future<?> close = pool.submit(() -> periods.close(id, 990004L));
                assertThatThrownBy(() -> close.get(1, SECONDS)).isInstanceOf(TimeoutException.class);
                proceed.countDown();
                approval.get(10, SECONDS);
                close.get(10, SECONDS);
            } finally {
                proceed.countDown();
            }
        }
        assertThat(jdbc.queryForObject("select sum(score) from scr_period_snapshot where period_id = ?",
                BigDecimal.class, id)).isEqualByComparingTo("10");
        assertThatThrownBy(() -> periods.requireOpen(id)).isInstanceOf(ConflictException.class);
    }
}
