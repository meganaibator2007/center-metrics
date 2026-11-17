package ru.fa.kpi.scoring;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.achievement.AchievementApproved;
import ru.fa.kpi.achievement.AchievementRejected;
import ru.fa.kpi.period.PeriodClosed;

/**
 * Начисления и итоги (ТЗ 6.1, 6.2, 6.4). Начисление появляется только при утверждении и только у сотрудников.
 * Итог сотрудника по показателю за период — S = min(M, Σ долей), без максимума — просто сумма.
 * Прежние начисления не удаляются: при новой утверждённой редакции они получают статус SUPERSEDED.
 */
@Service
@RequiredArgsConstructor
public class ScoringService {

    static final String FORMULA = "B × c × w / Σw";

    private final AccrualRepository accruals;
    private final ScoreRepository scores;
    private final PeriodSnapshotRepository snapshots;

    private record ScoreKey(Long userId, Long periodId, Long indicatorId) {

        static ScoreKey of(Accrual accrual) {
            return new ScoreKey(accrual.getUserId(), accrual.getPeriodId(), accrual.getIndicatorId());
        }
    }

    @Transactional(readOnly = true)
    public List<ScoreView> scores(Long userId, Long periodId) {
        return scores.findByUserIdAndPeriodId(userId, periodId).stream()
                .map(score -> new ScoreView(score.getIndicatorId(), score.getTotalPoints(), score.getMaxPoints(),
                        score.getScore(), score.getAccrualCount()))
                .toList();
    }

    @Transactional
    void accrue(AchievementApproved event) {
        Set<ScoreKey> touched = new LinkedHashSet<>();
        for (Accrual previous : accruals.findByAchievementIdAndStatus(event.achievementId(), AccrualStatus.ACTIVE)) {
            previous.setStatus(AccrualStatus.SUPERSEDED);
            touched.add(ScoreKey.of(previous));
        }
        // Действующее начисление у человека по достижению одно (уникальный индекс): прежние снимаются раньше вставки
        accruals.flush();
        for (AchievementApproved.Share share : event.shares()) {
            Accrual accrual = new Accrual();
            accrual.setAchievementId(event.achievementId());
            accrual.setRevision(event.revision());
            accrual.setUserId(share.userId());
            accrual.setIndicatorId(event.indicatorId());
            accrual.setIndicatorVersionId(event.indicatorVersionId());
            accrual.setPeriodId(event.periodId());
            accrual.setBasePoints(event.basePoints());
            accrual.setCoefficient(event.coefficient());
            accrual.setShare(share.share());
            accrual.setPointsExact(share.pointsExact());
            accrual.setPoints(share.points());
            accrual.setFormula(FORMULA);
            accrual.setCalculatedBy(event.approvedBy());
            accruals.save(accrual);
            touched.add(ScoreKey.of(accrual));
        }
        touched.forEach(key -> recalculate(key, event.indicatorVersionId(), event.maxPoints(), event.approvedBy()));
    }

    /** Отклонение после пересмотра: прежние начисления больше не входят в итог. */
    @Transactional
    void cancel(AchievementRejected event) {
        Set<ScoreKey> touched = new LinkedHashSet<>();
        for (Accrual accrual : accruals.findByAchievementIdAndStatus(event.achievementId(), AccrualStatus.ACTIVE)) {
            accrual.setStatus(AccrualStatus.CANCELLED);
            touched.add(ScoreKey.of(accrual));
        }
        accruals.flush();
        for (ScoreKey key : touched) {
            scores.findByUserIdAndPeriodIdAndIndicatorId(key.userId(), key.periodId(), key.indicatorId())
                    .ifPresent(score -> recalculate(key, score.getIndicatorVersionId(), score.getMaxPoints(), event.rejectedBy()));
        }
    }

    /** Снимок официальных итогов при закрытии периода (ТЗ 4.3). */
    @Transactional
    void snapshot(PeriodClosed event) {
        int number = snapshots.lastNumber(event.periodId()) + 1;
        for (Score score : scores.findByPeriodId(event.periodId())) {
            PeriodSnapshot row = new PeriodSnapshot();
            row.setPeriodId(event.periodId());
            row.setSnapshotNo(number);
            row.setUserId(score.getUserId());
            row.setIndicatorId(score.getIndicatorId());
            row.setIndicatorVersionId(score.getIndicatorVersionId());
            row.setAccrualCount(score.getAccrualCount());
            row.setScore(score.getScore());
            row.setTakenBy(event.closedBy());
            snapshots.save(row);
        }
    }

    private void recalculate(ScoreKey key, Long indicatorVersionId, BigDecimal maxPoints, Long actorId) {
        List<Accrual> active = accruals.findByUserIdAndPeriodIdAndIndicatorIdAndStatus(
                key.userId(), key.periodId(), key.indicatorId(), AccrualStatus.ACTIVE);
        Optional<Score> existing = scores.findByUserIdAndPeriodIdAndIndicatorId(key.userId(), key.periodId(), key.indicatorId());
        if (active.isEmpty()) {
            existing.ifPresent(scores::delete);
            return;
        }
        BigDecimal total = active.stream().map(Accrual::getPoints).reduce(BigDecimal.ZERO, BigDecimal::add);
        Score score = existing.orElseGet(Score::new);
        score.setUserId(key.userId());
        score.setPeriodId(key.periodId());
        score.setIndicatorId(key.indicatorId());
        score.setIndicatorVersionId(indicatorVersionId);
        score.setAccrualCount(active.size());
        score.setTotalPoints(total);
        score.setMaxPoints(maxPoints);
        score.setScore(maxPoints == null ? total : total.min(maxPoints));
        score.setCalculatedBy(actorId);
        score.setCalculatedAt(Instant.now());
        scores.save(score);
    }
}
