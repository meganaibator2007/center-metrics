package ru.fa.kpi.achievement;

import java.util.Set;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.fa.kpi.user.Role;
import ru.fa.kpi.user.UserDto;
import ru.fa.kpi.user.UserService;

/**
 * Кто что может делать с достижением. Роль проверяется здесь, а не в {@code @PreAuthorize}:
 * права зависят от самой записи — области программы и того, участвует ли человек в достижении.
 * Участник никогда не проверяет и не утверждает своё (ТЗ 2.2).
 */
@Component
@RequiredArgsConstructor
class AchievementAccess {

    private final UserService users;

    Viewer viewer(Long userId) {
        return new Viewer(users.getById(userId));
    }

    /** Область достижения: его программа, а если её нет — программы заявителя. */
    static Set<Long> area(Achievement achievement, UserDto owner) {
        if (achievement.getProgramId() != null) {
            return Set.of(achievement.getProgramId());
        }
        return owner == null ? Set.of() : Set.copyOf(owner.programIds());
    }

    boolean canView(Viewer viewer, Achievement achievement, UserDto owner) {
        return viewer.has(Role.ADMIN)
                || viewer.has(Role.DIRECTOR)
                || achievement.involves(viewer.id())
                || viewer.id().equals(achievement.getEnteredBy())
                || viewer.reviews(area(achievement, owner));
    }

    /** Проверка: РОП области, а для результатов РОП и тех, кого некому проверить, — директор. */
    boolean canReview(Viewer viewer, Achievement achievement, UserDto owner) {
        if (achievement.getStatus() != ResultStatus.ON_REVIEW || achievement.involves(viewer.id())) {
            return false;
        }
        return achievement.getReviewerKind() == ReviewerKind.ROP
                ? viewer.reviews(area(achievement, owner))
                : viewer.has(Role.DIRECTOR);
    }

    /** Вернуть или отклонить может тот, кто сейчас проверяет, а директор — и проверенное. */
    boolean canReturnOrReject(Viewer viewer, Achievement achievement, UserDto owner) {
        if (achievement.involves(viewer.id())) {
            return false;
        }
        boolean directorTurn = viewer.has(Role.DIRECTOR)
                && (achievement.getStatus() == ResultStatus.ON_REVIEW || achievement.getStatus() == ResultStatus.REVIEWED);
        return directorTurn || canReview(viewer, achievement, owner);
    }

    boolean canApprove(Viewer viewer, Achievement achievement) {
        return achievement.getStatus() == ResultStatus.REVIEWED
                && viewer.has(Role.DIRECTOR)
                && !achievement.involves(viewer.id());
    }

    /** Очередь РОП: ждёт проверки именно в его области. */
    boolean inReviewQueue(Viewer viewer, Achievement achievement, UserDto owner) {
        return achievement.getReviewerKind() == ReviewerKind.ROP && canReview(viewer, achievement, owner);
    }

    /** Очередь директора: проверенное ждёт утверждения, а результаты РОП — сначала его проверки. */
    boolean inApprovalQueue(Viewer viewer, Achievement achievement) {
        boolean waitsDirectorCheck = achievement.getStatus() == ResultStatus.ON_REVIEW
                && achievement.getReviewerKind() == ReviewerKind.DIRECTOR;
        return viewer.has(Role.DIRECTOR)
                && !achievement.involves(viewer.id())
                && (achievement.getStatus() == ResultStatus.REVIEWED || waitsDirectorCheck);
    }
}
