package ru.fa.kpi.report;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.achievement.AchievementService;
import ru.fa.kpi.achievement.Participation;
import ru.fa.kpi.achievement.ResultStatus;
import ru.fa.kpi.common.ForbiddenException;
import ru.fa.kpi.indicator.IndicatorRule;
import ru.fa.kpi.indicator.IndicatorService;
import ru.fa.kpi.period.PeriodDto;
import ru.fa.kpi.period.PeriodService;
import ru.fa.kpi.scoring.ScoreView;
import ru.fa.kpi.scoring.ScoringService;
import ru.fa.kpi.user.Role;
import ru.fa.kpi.user.UserDto;
import ru.fa.kpi.user.UserService;

/**
 * Личные баллы (ТЗ 8.2): утверждённые и предварительные значения всегда раздельно.
 * Утверждённое берётся из итогов scoring, предварительное — из долей в достижениях на маршруте.
 */
@Service
@RequiredArgsConstructor
class ReportService {

    private static final Set<ResultStatus> ON_REVIEW =
            EnumSet.of(ResultStatus.ON_REVIEW, ResultStatus.REVIEWED, ResultStatus.REVISION);
    private static final Set<ResultStatus> ENTERED = EnumSet.of(ResultStatus.DRAFT, ResultStatus.RETURNED);
    private static final BigDecimal NONE = BigDecimal.ZERO.setScale(2);

    private final UserService users;
    private final PeriodService periods;
    private final IndicatorService indicators;
    private final AchievementService achievements;
    private final ScoringService scoring;

    @Transactional(readOnly = true)
    MyScoresDto scores(Long userId, Long periodId, Long actorId) {
        UserDto user = users.getById(userId);
        if (!userId.equals(actorId)) {
            requireAccess(users.getById(actorId), user);
        }
        PeriodDto period = periodId == null ? periods.current() : periods.get(periodId);
        Map<Long, ScoreView> official = scoring.scores(userId, period.id()).stream()
                .collect(Collectors.toMap(ScoreView::indicatorId, Function.identity()));
        Map<Long, List<Participation>> participations = achievements.participations(userId, period.id()).stream()
                .collect(Collectors.groupingBy(Participation::indicatorId));

        List<ScoreRow> rows = indicators.pointRulesOn(period.startDate()).stream()
                .filter(rule -> (!rule.archived() && user.categories().contains(rule.category()))
                        || official.containsKey(rule.indicatorId())
                        || participations.containsKey(rule.indicatorId()))
                .map(rule -> row(rule, official.get(rule.indicatorId()),
                        participations.getOrDefault(rule.indicatorId(), List.of())))
                .toList();
        return new MyScoresDto(period, rows,
                total(rows, ScoreRow::approved), total(rows, ScoreRow::onReview), total(rows, ScoreRow::entered));
    }

    private static ScoreRow row(IndicatorRule rule, ScoreView official, List<Participation> participations) {
        return new ScoreRow(
                rule.indicatorId(),
                rule.code(),
                rule.name(),
                rule.category(),
                rule.basePoints(),
                rule.accrualMethod(),
                rule.maxPoints(),
                official == null ? NONE : official.score(),
                points(participations, ON_REVIEW),
                points(participations, ENTERED),
                (int) participations.stream().filter(p -> p.status() != ResultStatus.REJECTED).count());
    }

    private static BigDecimal points(List<Participation> participations, Set<ResultStatus> statuses) {
        return participations.stream()
                .filter(participation -> statuses.contains(participation.status()))
                .map(Participation::points)
                .reduce(NONE, BigDecimal::add);
    }

    private static BigDecimal total(List<ScoreRow> rows, Function<ScoreRow, BigDecimal> column) {
        return rows.stream().map(column).reduce(NONE, BigDecimal::add);
    }

    /** Чужие баллы видят администратор, директор и РОП программы сотрудника. */
    private static void requireAccess(UserDto actor, UserDto user) {
        boolean manager = actor.roles().contains(Role.ADMIN) || actor.roles().contains(Role.DIRECTOR);
        boolean reviewer = actor.roles().contains(Role.REVIEWER)
                && actor.reviewProgramIds().stream().anyMatch(user.programIds()::contains);
        if (!manager && !reviewer) {
            throw new ForbiddenException("Баллы сотрудника видят он сам, администратор, директор и РОП его программы");
        }
    }
}
