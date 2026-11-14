package ru.fa.kpi.scoring;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.fa.kpi.achievement.AchievementApproved;
import ru.fa.kpi.achievement.AchievementRejected;
import ru.fa.kpi.period.PeriodClosed;

@ExtendWith(MockitoExtension.class)
class ScoringServiceTest {

    private static final long USER = 7L;
    private static final long PERIOD = 3L;
    private static final long INDICATOR = 11L;
    private static final long VERSION = 21L;
    private static final long DIRECTOR = 2L;

    @Mock
    private AccrualRepository accruals;

    @Mock
    private ScoreRepository scores;

    @Mock
    private PeriodSnapshotRepository snapshots;

    @InjectMocks
    private ScoringService scoring;

    private static AchievementApproved approved(String points, String maxPoints) {
        BigDecimal value = new BigDecimal(points);
        return new AchievementApproved(100L, 1, INDICATOR, VERSION, PERIOD, new BigDecimal("20"), BigDecimal.ONE,
                maxPoints == null ? null : new BigDecimal(maxPoints), DIRECTOR,
                List.of(new AchievementApproved.Share(USER, BigDecimal.ONE, value, value)));
    }

    private static Accrual accrual(long achievementId, String points) {
        Accrual accrual = new Accrual();
        accrual.setAchievementId(achievementId);
        accrual.setUserId(USER);
        accrual.setPeriodId(PERIOD);
        accrual.setIndicatorId(INDICATOR);
        accrual.setPoints(new BigDecimal(points));
        return accrual;
    }

    private Score savedScore() {
        ArgumentCaptor<Score> saved = ArgumentCaptor.forClass(Score.class);
        verify(scores).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void scoreIsCappedByMaximum() {
        when(accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(USER, PERIOD, INDICATOR, AccrualStatus.ACTIVE))
                .thenReturn(List.of(accrual(100L, "20.00"), accrual(99L, "15.00")));
        when(scores.findByUserIdAndPeriodIdAndIndicatorId(USER, PERIOD, INDICATOR)).thenReturn(Optional.empty());

        scoring.accrue(approved("20.00", "30.00"));

        Score score = savedScore();
        assertThat(score.getTotalPoints()).isEqualByComparingTo("35.00");
        assertThat(score.getScore()).isEqualByComparingTo("30.00");
        assertThat(score.getAccrualCount()).isEqualTo(2);
        assertThat(score.getCalculatedBy()).isEqualTo(DIRECTOR);
    }

    @Test
    void withoutMaximumScoreIsTheSum() {
        when(accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(USER, PERIOD, INDICATOR, AccrualStatus.ACTIVE))
                .thenReturn(List.of(accrual(100L, "20.00"), accrual(99L, "15.00")));
        when(scores.findByUserIdAndPeriodIdAndIndicatorId(USER, PERIOD, INDICATOR)).thenReturn(Optional.empty());

        scoring.accrue(approved("20.00", null));

        assertThat(savedScore().getScore()).isEqualByComparingTo("35.00");
    }

    @Test
    void newRevisionSupersedesPreviousAccrualBeforeInsert() {
        Accrual previous = accrual(100L, "10.00");
        previous.setStatus(AccrualStatus.ACTIVE);
        when(accruals.findByAchievementIdAndStatus(100L, AccrualStatus.ACTIVE)).thenReturn(List.of(previous));
        when(accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(USER, PERIOD, INDICATOR, AccrualStatus.ACTIVE))
                .thenReturn(List.of(accrual(100L, "20.00")));
        when(scores.findByUserIdAndPeriodIdAndIndicatorId(USER, PERIOD, INDICATOR)).thenReturn(Optional.empty());

        scoring.accrue(approved("20.00", null));

        assertThat(previous.getStatus()).isEqualTo(AccrualStatus.SUPERSEDED);
        InOrder order = inOrder(accruals);
        order.verify(accruals).flush();
        order.verify(accruals).save(any(Accrual.class));
        ArgumentCaptor<Accrual> created = ArgumentCaptor.forClass(Accrual.class);
        verify(accruals).save(created.capture());
        assertThat(created.getValue().getStatus()).isEqualTo(AccrualStatus.ACTIVE);
        assertThat(created.getValue().getFormula()).isEqualTo(ScoringService.FORMULA);
    }

    /** Соавторы в событии в любом порядке, а блокировки — всегда по возрастанию: так два утверждения не ждут друг друга по кругу. */
    @Test
    void scoresAreLockedInFixedOrderBeforeRecalculation() {
        when(accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(any(), any(), any(), any()))
                .thenReturn(List.of(accrual(100L, "10.00")));
        when(scores.findByUserIdAndPeriodIdAndIndicatorId(any(), any(), any())).thenReturn(Optional.empty());
        BigDecimal half = new BigDecimal("0.5");
        BigDecimal ten = new BigDecimal("10.00");
        AchievementApproved coauthors = new AchievementApproved(100L, 1, INDICATOR, VERSION, PERIOD, new BigDecimal("20"),
                BigDecimal.ONE, null, DIRECTOR, List.of(
                        new AchievementApproved.Share(USER + 1, half, ten, ten),
                        new AchievementApproved.Share(USER, half, ten, ten)));

        scoring.accrue(coauthors);

        InOrder order = inOrder(scores, accruals);
        order.verify(scores).lock(USER, PERIOD, INDICATOR);
        order.verify(scores).lock(USER + 1, PERIOD, INDICATOR);
        order.verify(accruals, times(2)).findByUserIdAndPeriodIdAndIndicatorIdAndStatus(any(), any(), any(), any());
    }

    @Test
    void rejectionRemovesScoreWhenNothingLeft() {
        Accrual active = accrual(100L, "20.00");
        Score existing = new Score();
        existing.setIndicatorVersionId(VERSION);
        when(accruals.findByAchievementIdAndStatus(100L, AccrualStatus.ACTIVE)).thenReturn(List.of(active));
        when(scores.findByUserIdAndPeriodIdAndIndicatorId(USER, PERIOD, INDICATOR)).thenReturn(Optional.of(existing));
        when(accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(USER, PERIOD, INDICATOR, AccrualStatus.ACTIVE))
                .thenReturn(List.of());

        scoring.cancel(new AchievementRejected(100L, DIRECTOR));

        assertThat(active.getStatus()).isEqualTo(AccrualStatus.CANCELLED);
        verify(scores).delete(existing);
        verify(scores, never()).save(any());
    }

    @Test
    void snapshotGetsNextNumber() {
        Score score = new Score();
        score.setUserId(USER);
        score.setIndicatorId(INDICATOR);
        score.setIndicatorVersionId(VERSION);
        score.setAccrualCount(2);
        score.setScore(new BigDecimal("30.00"));
        when(snapshots.lastNumber(PERIOD)).thenReturn(1);
        when(scores.findByPeriodId(PERIOD)).thenReturn(List.of(score));

        scoring.snapshot(new PeriodClosed(PERIOD, DIRECTOR));

        ArgumentCaptor<PeriodSnapshot> saved = ArgumentCaptor.forClass(PeriodSnapshot.class);
        verify(snapshots).save(saved.capture());
        assertThat(saved.getValue().getSnapshotNo()).isEqualTo(2);
        assertThat(saved.getValue().getScore()).isEqualByComparingTo("30.00");
        assertThat(saved.getValue().getTakenBy()).isEqualTo(DIRECTOR);
    }
}
