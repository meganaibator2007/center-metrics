package ru.fa.kpi.scoring;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.fa.kpi.TestcontainersConfiguration;
import ru.fa.kpi.achievement.AchievementApproved;

/**
 * Два утверждения по одному человеку, показателю и периоду в одно время. Каждое пересчитывает итог
 * из действующих начислений и не видит чужое, пока оно не сохранено. Без блокировки второе записало бы сумму
 * без баллов первого. Нужен настоящий PostgreSQL: без Docker тест пропускается.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class ScoringConcurrencyTests {

    private static final long PERIOD = 9_001L;
    private static final long INDICATOR = 9_002L;
    private static final long VERSION = 9_003L;
    private static final long DIRECTOR = 9_004L;

    @Autowired
    private ScoringService scoring;

    @Autowired
    private ScoreRepository scores;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private static AchievementApproved approved(long achievementId, long userId, String points) {
        BigDecimal value = new BigDecimal(points);
        return new AchievementApproved(achievementId, 1, INDICATOR, VERSION, PERIOD, value, BigDecimal.ONE, null,
                DIRECTOR, List.of(new AchievementApproved.Share(userId, BigDecimal.ONE, value, value)));
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(10, SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    /**
     * Первое утверждение уже посчитало итог, но транзакция ещё открыта. Второе запускается в этот момент.
     * Если оно не ждёт первое, то успевает сохраниться раньше, и одно из двух начислений пропадает из итога.
     */
    private void approveAtTheSameTime(AchievementApproved first, AchievementApproved second) throws Exception {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        CountDownLatch firstCalculated = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> firstDone = pool.submit(() -> tx.executeWithoutResult(status -> {
                scoring.accrue(first);
                firstCalculated.countDown();
                await(releaseFirst);
            }));
            assertThat(firstCalculated.await(10, SECONDS)).isTrue();
            Future<?> secondDone = pool.submit(() -> tx.executeWithoutResult(status -> scoring.accrue(second)));
            try {
                secondDone.get(1, SECONDS);
            } catch (TimeoutException waitsForFirst) {
                // так и должно быть: второе ждёт, пока первое сохранится
            }
            releaseFirst.countDown();
            firstDone.get(10, SECONDS);
            secondDone.get(10, SECONDS);
        } finally {
            releaseFirst.countDown();
            pool.shutdownNow();
        }
    }

    private Score score(long userId) {
        return scores.findByUserIdAndPeriodIdAndIndicatorId(userId, PERIOD, INDICATOR).orElseThrow();
    }

    @Test
    void simultaneousApprovalsKeepBothAccrualsInScore() throws Exception {
        long user = 9_101L;
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> scoring.accrue(approved(9_201L, user, "10.00")));

        approveAtTheSameTime(approved(9_202L, user, "20.00"), approved(9_203L, user, "30.00"));

        assertThat(score(user).getTotalPoints()).isEqualByComparingTo("60.00");
        assertThat(score(user).getAccrualCount()).isEqualTo(3);
    }

    /** Строки итога ещё нет: без блокировки обе транзакции вставили бы её, и вторая упала бы на уникальном ключе. */
    @Test
    void simultaneousFirstApprovalsCreateOneScore() throws Exception {
        long user = 9_102L;

        approveAtTheSameTime(approved(9_211L, user, "20.00"), approved(9_212L, user, "30.00"));

        assertThat(score(user).getTotalPoints()).isEqualByComparingTo("50.00");
        assertThat(score(user).getAccrualCount()).isEqualTo(2);
    }
}
