package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import ru.fa.kpi.indicator.AchievementType;

/** Достижение в едином реестре: вносится один раз и связывается со всеми авторами. */
@Entity
@Table(name = "ach_achievement")
@Getter
@Setter
class Achievement {

    /** Статусы, в которых автор может менять карточку. */
    static final Set<ResultStatus> EDITABLE = EnumSet.of(ResultStatus.DRAFT, ResultStatus.RETURNED, ResultStatus.REVISION);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long indicatorId;

    private Long indicatorVersionId;

    private Long periodId;

    @Enumerated(EnumType.STRING)
    private AchievementType achievementType;

    private Long ownerId;

    private Long enteredBy;

    private String basis;

    private String title;

    private String titleNorm;

    private LocalDate eventDate;

    @Enumerated(EnumType.STRING)
    private IdentifierType identifierType;

    private String identifier;

    private String identifierNorm;

    private Long programId;

    private String discipline;

    private String description;

    private BigDecimal quantity;

    @Enumerated(EnumType.STRING)
    private ResultStatus status = ResultStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    private ReviewerKind reviewerKind = ReviewerKind.ROP;

    private boolean possibleDuplicate;

    private String lastComment;

    private int revision = 1;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @OneToMany(mappedBy = "achievement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<Participant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "achievement", cascade = CascadeType.ALL)
    @OrderBy("id")
    private List<Evidence> evidence = new ArrayList<>();

    @OneToMany(mappedBy = "achievement", cascade = CascadeType.ALL)
    @OrderBy("id")
    private List<Decision> decisions = new ArrayList<>();

    /** Заявитель или соавтор: такой человек не может проверять и утверждать это достижение. */
    boolean involves(Long userId) {
        return ownerId.equals(userId) || participants.stream().anyMatch(participant -> userId.equals(participant.getUserId()));
    }

    /** Заявитель или тот, кто внёс достижение за него. */
    boolean isAuthor(Long userId) {
        return ownerId.equals(userId) || userId.equals(enteredBy);
    }

    boolean isEditable() {
        return EDITABLE.contains(status);
    }

    List<Evidence> activeEvidence() {
        return evidence.stream().filter(Evidence::isActive).toList();
    }

    void decide(DecisionAction action, Long actorId, String comment) {
        Decision decision = new Decision();
        decision.setAchievement(this);
        decision.setRevision(revision);
        decision.setAction(action);
        decision.setActorId(actorId);
        decision.setComment(comment);
        decisions.add(decision);
    }
}
