package ru.fa.kpi.scoring;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import ru.fa.kpi.achievement.AchievementApproved;
import ru.fa.kpi.achievement.AchievementRejected;
import ru.fa.kpi.period.PeriodClosed;

/** Слушает события синхронно: начисление и решение по достижению сохраняются одной транзакцией. */
@Component
@RequiredArgsConstructor
class ScoringEventListener {

    private final ScoringService scoring;

    @EventListener
    void on(AchievementApproved event) {
        scoring.accrue(event);
    }

    @EventListener
    void on(AchievementRejected event) {
        scoring.cancel(event);
    }

    @EventListener
    void on(PeriodClosed event) {
        scoring.snapshot(event);
    }
}
