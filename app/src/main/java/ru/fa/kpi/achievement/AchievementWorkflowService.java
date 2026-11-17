package ru.fa.kpi.achievement;

import static ru.fa.kpi.achievement.AchievementService.isBlank;
import static ru.fa.kpi.achievement.AchievementService.trimToNull;

import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.common.ForbiddenException;
import ru.fa.kpi.common.NotFoundException;
import ru.fa.kpi.indicator.IndicatorRule;
import ru.fa.kpi.indicator.IndicatorService;
import ru.fa.kpi.period.PeriodService;
import ru.fa.kpi.user.Role;
import ru.fa.kpi.user.UserDto;
import ru.fa.kpi.user.UserService;

/**
 * Маршрут согласования (ТЗ 4.1): DRAFT → ON_REVIEW → REVIEWED → APPROVED, с проверки можно вернуть
 * или отклонить. Проверка и утверждение — отдельные решения, участник не принимает решений по своему.
 * В закрытом периоде решения не принимаются: после закрытия итоги зафиксированы снимком.
 */
@Service
@RequiredArgsConstructor
class AchievementWorkflowService {

    /** Статусы, которые считаются в лимит повторений показателя за период. */
    private static final Set<ResultStatus> COUNTED = EnumSet.of(
            ResultStatus.ON_REVIEW, ResultStatus.REVIEWED, ResultStatus.APPROVED, ResultStatus.REVISION);

    private final AchievementRepository achievements;
    private final AchievementAccess access;
    private final AchievementAssembler assembler;
    private final DuplicateFinder duplicates;
    private final IndicatorService indicators;
    private final PeriodService periods;
    private final UserService users;
    private final ApplicationEventPublisher events;

    @Transactional
    AchievementDto submit(Long id, Long actorId) {
        Achievement achievement = lock(id);
        if (!achievement.isAuthor(actorId)) {
            throw new ForbiddenException("Отправить может заявитель или тот, кто внёс достижение за него");
        }
        if (!achievement.isEditable()) {
            throw new ConflictException("Отправить можно черновик или возвращённое достижение");
        }
        requireOpenPeriod(achievement);
        IndicatorRule rule = indicators.rule(achievement.getIndicatorVersionId());
        if (rule.evidenceRequired() && achievement.activeEvidence().isEmpty()) {
            throw new FieldValidationException("evidence", "Приложите подтверждающий документ"
                    + (rule.evidence().isBlank() ? "" : ": " + rule.evidence()));
        }
        duplicates.strict(achievement.getAchievementType(), achievement.getIdentifierType(),
                achievement.getIdentifierNorm(), achievement.getId()).ifPresent(found -> {
            throw new ConflictException("Такое достижение уже зарегистрировано (#" + found.getId() + ")");
        });
        checkRepeats(achievement, rule);

        UserDto owner = users.getById(achievement.getOwnerId());
        achievement.setPossibleDuplicate(!duplicates.find(DuplicateFinder.Key.of(achievement)).isEmpty());
        achievement.setReviewerKind(reviewerFor(achievement, owner));
        achievement.setStatus(ResultStatus.ON_REVIEW);
        achievement.setLastComment(null);
        achievement.decide(DecisionAction.SUBMITTED, actorId, achievement.getReviewerKind() == ReviewerKind.DIRECTOR
                ? "Проверку и утверждение выполняет директор" : null);
        return assembler.toDto(achievement);
    }

    @Transactional
    AchievementDto review(Long id, Long actorId, String comment) {
        Achievement achievement = lock(id);
        if (achievement.getStatus() != ResultStatus.ON_REVIEW) {
            throw new ConflictException("Проверить можно только результат на проверке");
        }
        requireOpenPeriod(achievement);
        requireNotParticipant(achievement, actorId);
        if (!access.canReview(access.viewer(actorId), achievement, users.getById(achievement.getOwnerId()))) {
            throw new ForbiddenException(achievement.getReviewerKind() == ReviewerKind.ROP
                    ? "Проверяет РОП программы, к которой относится достижение"
                    : "Это достижение проверяет директор");
        }
        if (achievement.isPossibleDuplicate() && isBlank(comment)) {
            throw new FieldValidationException("comment", "Найдены похожие записи: обоснуйте, что это не повтор");
        }
        achievement.setStatus(ResultStatus.REVIEWED);
        achievement.decide(DecisionAction.REVIEWED, actorId, trimToNull(comment));
        return assembler.toDto(achievement);
    }

    @Transactional
    AchievementDto returnToAuthor(Long id, Long actorId, String comment) {
        Achievement achievement = lockForCorrection(id, actorId);
        achievement.setStatus(ResultStatus.RETURNED);
        achievement.setLastComment(comment.trim());
        achievement.decide(DecisionAction.RETURNED, actorId, comment.trim());
        return assembler.toDto(achievement);
    }

    @Transactional
    AchievementDto reject(Long id, Long actorId, String comment) {
        Achievement achievement = lockForCorrection(id, actorId);
        achievement.setStatus(ResultStatus.REJECTED);
        achievement.setLastComment(comment.trim());
        achievement.decide(DecisionAction.REJECTED, actorId, comment.trim());
        events.publishEvent(new AchievementRejected(achievement.getId(), actorId));
        return assembler.toDto(achievement);
    }

    /** Только из REVIEWED. Начисления создаёт scoring по событию AchievementApproved в этой же транзакции. */
    @Transactional
    AchievementDto approve(Long id, Long actorId, String comment) {
        Achievement achievement = lock(id);
        if (achievement.getStatus() != ResultStatus.REVIEWED) {
            throw new ConflictException("Утвердить можно только проверенный результат: проверка и утверждение — отдельные решения");
        }
        requireOpenPeriod(achievement);
        requireNotParticipant(achievement, actorId);
        if (!access.canApprove(access.viewer(actorId), achievement)) {
            throw new ForbiddenException("Утверждает директор");
        }
        achievement.setStatus(ResultStatus.APPROVED);
        achievement.setLastComment(null);
        achievement.decide(DecisionAction.APPROVED, actorId, trimToNull(comment));
        events.publishEvent(approved(achievement, actorId));
        return assembler.toDto(achievement);
    }

    private Achievement lock(Long id) {
        return achievements.findForUpdate(id).orElseThrow(() -> new NotFoundException("Достижение " + id + " не найдено"));
    }

    private Achievement lockForCorrection(Long id, Long actorId) {
        Achievement achievement = lock(id);
        if (achievement.getStatus() != ResultStatus.ON_REVIEW && achievement.getStatus() != ResultStatus.REVIEWED) {
            throw new ConflictException("Вернуть или отклонить можно только результат на проверке или утверждении");
        }
        requireOpenPeriod(achievement);
        requireNotParticipant(achievement, actorId);
        if (!access.canReturnOrReject(access.viewer(actorId), achievement, users.getById(achievement.getOwnerId()))) {
            throw new ForbiddenException("Вернуть или отклонить может проверяющий РОП или директор");
        }
        return achievement;
    }

    private static void requireNotParticipant(Achievement achievement, Long actorId) {
        if (achievement.involves(actorId)) {
            throw new ForbiddenException("Нельзя проверять и утверждать собственное достижение");
        }
    }

    private void requireOpenPeriod(Achievement achievement) {
        if (periods.get(achievement.getPeriodId()).closed()) {
            throw new ConflictException("Период закрыт: решения по нему возможны только после переоткрытия");
        }
    }

    private void checkRepeats(Achievement achievement, IndicatorRule rule) {
        if (rule.maxRepeats() == null) {
            return;
        }
        long counted = achievements.countByOwnerIdAndIndicatorIdAndPeriodIdAndStatusInAndIdNot(achievement.getOwnerId(),
                achievement.getIndicatorId(), achievement.getPeriodId(), COUNTED, achievement.getId());
        if (counted >= rule.maxRepeats()) {
            throw new ConflictException("По показателю " + rule.code() + " за период можно начислить не больше "
                    + rule.maxRepeats() + " раз");
        }
    }

    /** Директор проверяет, если заявитель сам РОП или в области нет РОП, который не участвует в достижении. */
    private ReviewerKind reviewerFor(Achievement achievement, UserDto owner) {
        if (owner.roles().contains(Role.REVIEWER)) {
            return ReviewerKind.DIRECTOR;
        }
        Set<Long> reviewers = new HashSet<>(users.reviewersOf(AchievementAccess.area(achievement, owner)));
        reviewers.removeIf(achievement::involves);
        return reviewers.isEmpty() ? ReviewerKind.DIRECTOR : ReviewerKind.ROP;
    }

    private AchievementApproved approved(Achievement achievement, Long actorId) {
        IndicatorRule rule = indicators.rule(achievement.getIndicatorVersionId());
        List<AchievementApproved.Share> shares = achievement.getParticipants().stream()
                .filter(participant -> !participant.isExternal())
                .map(participant -> new AchievementApproved.Share(participant.getUserId(), participant.getShare(),
                        participant.getPointsExact(), participant.getPoints()))
                .toList();
        return new AchievementApproved(achievement.getId(), achievement.getRevision(), achievement.getIndicatorId(),
                achievement.getIndicatorVersionId(), achievement.getPeriodId(), rule.basePoints(), rule.coefficient(),
                rule.maxPoints(), actorId, shares);
    }
}
