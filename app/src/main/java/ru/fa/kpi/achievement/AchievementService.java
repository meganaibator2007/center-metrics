package ru.fa.kpi.achievement;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fa.kpi.common.Category;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;
import ru.fa.kpi.common.ForbiddenException;
import ru.fa.kpi.common.NotFoundException;
import ru.fa.kpi.indicator.AccrualMethod;
import ru.fa.kpi.indicator.IndicatorRule;
import ru.fa.kpi.indicator.IndicatorService;
import ru.fa.kpi.period.PeriodDto;
import ru.fa.kpi.period.PeriodService;
import ru.fa.kpi.user.OrgService;
import ru.fa.kpi.user.Permission;
import ru.fa.kpi.user.ProgramDto;
import ru.fa.kpi.user.Role;
import ru.fa.kpi.user.UserDto;
import ru.fa.kpi.user.UserService;

/**
 * Единый реестр достижений: списки по областям доступа, черновик с соавторами и долями, проверка дублей.
 * Маршрут согласования — в {@link AchievementWorkflowService}, подтверждения — в {@link EvidenceService}.
 */
@Service
@RequiredArgsConstructor
public class AchievementService {

    private static final Comparator<Achievement> NEWEST_FIRST =
            Comparator.comparing(Achievement::getEventDate).thenComparing(Achievement::getId).reversed();

    private final AchievementRepository achievements;
    private final AchievementAssembler assembler;
    private final AchievementAccess access;
    private final DuplicateFinder duplicates;
    private final UserService users;
    private final IndicatorService indicators;
    private final PeriodService periods;
    private final OrgService org;

    @Transactional(readOnly = true)
    List<AchievementDto> list(AchievementFilter filter, Long actorId) {
        Viewer viewer = access.viewer(actorId);
        List<Achievement> candidates = switch (filter.scope()) {
            case MY -> achievements.findInvolving(actorId);
            case REVIEW -> achievements.findByStatusIn(EnumSet.of(ResultStatus.ON_REVIEW));
            case APPROVAL -> achievements.findByStatusIn(EnumSet.of(ResultStatus.ON_REVIEW, ResultStatus.REVIEWED));
            case REGISTRY -> achievements.findAll();
        };
        Map<Long, UserDto> owners = users.getByIds(
                candidates.stream().map(Achievement::getOwnerId).collect(Collectors.toSet()));
        List<Achievement> visible = candidates.stream()
                .filter(achievement -> switch (filter.scope()) {
                    case MY -> true;
                    case REVIEW -> access.inReviewQueue(viewer, achievement, owners.get(achievement.getOwnerId()));
                    case APPROVAL -> access.inApprovalQueue(viewer, achievement);
                    case REGISTRY -> access.canView(viewer, achievement, owners.get(achievement.getOwnerId()));
                })
                .sorted(NEWEST_FIRST)
                .toList();
        return assembler.toDtos(visible).stream().filter(filter::matches).toList();
    }

    @Transactional(readOnly = true)
    AchievementDto get(Long id, Long actorId) {
        Achievement achievement = find(id);
        if (!access.canView(access.viewer(actorId), achievement, users.getById(achievement.getOwnerId()))) {
            throw new ForbiddenException("Нет доступа к этому достижению");
        }
        return assembler.toDto(achievement);
    }

    @Transactional
    AchievementDto create(AchievementRequest request, Long actorId) {
        Viewer actor = access.viewer(actorId);
        UserDto owner = resolveOwner(request, actor);
        IndicatorRule rule = ruleFor(request);
        validate(request, rule, owner, actor);
        String identifierNorm = normalizedIdentifier(request);
        ensureNoStrictDuplicate(rule, request.identifierType(), identifierNorm, null);

        Achievement achievement = new Achievement();
        achievement.setOwnerId(owner.id());
        if (!owner.id().equals(actorId)) {
            achievement.setEnteredBy(actorId);
            achievement.setBasis(request.basis().trim());
        }
        apply(achievement, request, rule, owner.id(), identifierNorm);
        achievement.decide(DecisionAction.CREATED, actorId,
                achievement.getEnteredBy() == null ? null : "Ввод за сотрудника. Основание: " + achievement.getBasis());
        return assembler.toDto(achievements.save(achievement));
    }

    @Transactional
    AchievementDto update(Long id, AchievementRequest request, Long actorId) {
        Achievement achievement = lock(id);
        requireAuthor(achievement, actorId);
        if (!achievement.isEditable()) {
            throw new ConflictException("Изменить можно только черновик, возвращённое или отправленное на пересмотр достижение");
        }
        UserDto owner = users.getById(achievement.getOwnerId());
        IndicatorRule rule = ruleFor(request);
        validate(request, rule, owner, access.viewer(actorId));
        String identifierNorm = normalizedIdentifier(request);
        ensureNoStrictDuplicate(rule, request.identifierType(), identifierNorm, id);

        if (achievement.getEnteredBy() != null && !isBlank(request.basis())) {
            achievement.setBasis(request.basis().trim());
        }
        apply(achievement, request, rule, owner.id(), identifierNorm);
        return assembler.toDto(achievement);
    }

    @Transactional
    void delete(Long id, Long actorId) {
        Achievement achievement = lock(id);
        requireAuthor(achievement, actorId);
        if (achievement.getStatus() != ResultStatus.DRAFT) {
            throw new ConflictException("Удалить можно только черновик");
        }
        achievements.delete(achievement);
    }

    @Transactional(readOnly = true)
    List<DuplicateDto> checkDuplicates(DuplicateQuery query) {
        IndicatorRule rule = indicators.currentRule(query.indicatorId());
        String identifierNorm = query.identifierType() == null || isBlank(query.identifier())
                ? null
                : IdentifierNormalizer.identifier(query.identifierType(), query.identifier());
        DuplicateFinder.Key key = new DuplicateFinder.Key(
                rule.achievementType(),
                query.indicatorId(),
                identifierNorm == null ? null : query.identifierType(),
                identifierNorm,
                isBlank(query.title()) ? null : IdentifierNormalizer.title(query.title()),
                query.eventDate(),
                query.excludeId());
        return assembler.toDuplicates(duplicates.find(key));
    }

    /** Доли сотрудника в достижениях периода: для личных итогов. */
    @Transactional(readOnly = true)
    public List<Participation> participations(Long userId, Long periodId) {
        return achievements.findInvolving(userId).stream()
                .filter(achievement -> achievement.getPeriodId().equals(periodId))
                .flatMap(achievement -> achievement.getParticipants().stream()
                        .filter(participant -> userId.equals(participant.getUserId()))
                        .map(participant -> new Participation(achievement.getId(), achievement.getIndicatorId(),
                                achievement.getStatus(), participant.getPoints())))
                .toList();
    }

    private Achievement find(Long id) {
        return achievements.findById(id).orElseThrow(() -> new NotFoundException("Достижение " + id + " не найдено"));
    }

    private Achievement lock(Long id) {
        return achievements.findForUpdate(id).orElseThrow(() -> new NotFoundException("Достижение " + id + " не найдено"));
    }

    private static void requireAuthor(Achievement achievement, Long actorId) {
        if (!achievement.isAuthor(actorId)) {
            throw new ForbiddenException("Менять достижение может заявитель или тот, кто внёс его за сотрудника");
        }
    }

    /** Свой результат вносит сотрудник; за другого — администратор или обладатель полномочия ENTER_FOR_OTHERS. */
    private UserDto resolveOwner(AchievementRequest request, Viewer actor) {
        if (request.ownerId() == null || request.ownerId().equals(actor.id())) {
            if (!actor.has(Role.EMPLOYEE)) {
                throw new ForbiddenException("Вносить свои результаты может сотрудник");
            }
            return actor.user();
        }
        if (!actor.has(Role.ADMIN) && !actor.user().permissions().contains(Permission.ENTER_FOR_OTHERS)) {
            throw new ForbiddenException("Вводить результаты за других может администратор или обладатель полномочия ENTER_FOR_OTHERS");
        }
        if (isBlank(request.basis())) {
            throw new FieldValidationException("basis", "Укажите основание для ввода за сотрудника");
        }
        UserDto owner = users.getByIds(Set.of(request.ownerId())).get(request.ownerId());
        if (owner == null || !owner.active()) {
            throw new FieldValidationException("ownerId", "Сотрудник не найден или деактивирован");
        }
        return owner;
    }

    /** Редакция показателя, действующая на дату начала периода. В закрытый период вносить нельзя. */
    private IndicatorRule ruleFor(AchievementRequest request) {
        PeriodDto period = periods.byIds(Set.of(request.periodId())).get(request.periodId());
        if (period == null) {
            throw new FieldValidationException("periodId", "Период не найден");
        }
        if (period.closed()) {
            throw new ConflictException("Период «" + period.name() + "» закрыт");
        }
        try {
            return indicators.ruleOn(request.indicatorId(), period.startDate());
        } catch (NotFoundException e) {
            throw new FieldValidationException("indicatorId", "Показатель не найден");
        }
    }

    private void validate(AchievementRequest request, IndicatorRule rule, UserDto owner, Viewer actor) {
        boolean selfEntry = owner.id().equals(actor.id());
        if (rule.category() == Category.AUP && selfEntry && !owner.permissions().contains(Permission.AUP_SELF_ENTRY)) {
            throw new ForbiddenException("Результаты АУП вносит уполномоченный пользователь (ТЗ 4.2)");
        }
        Map<String, String> errors = new LinkedHashMap<>();
        if (!rule.isPoints()) {
            errors.put("indicatorId", "Это целевой показатель РОП: его значения вносятся на странице целей");
        } else if (rule.archived()) {
            errors.put("indicatorId", "Показатель в архиве");
        } else if (!owner.categories().contains(rule.category())) {
            errors.put("indicatorId", "Показатель не относится к категории оценки сотрудника");
        }
        if ((request.identifierType() == null) != isBlank(request.identifier())) {
            errors.put("identifier", "Укажите вид идентификатора и его значение вместе");
        }
        validateProgram(request, rule, errors);
        validateCoauthors(request, rule, owner.id(), errors);
        if (!errors.isEmpty()) {
            throw new FieldValidationException(errors);
        }
    }

    private void validateProgram(AchievementRequest request, IndicatorRule rule, Map<String, String> errors) {
        if (request.programId() == null) {
            if (rule.requiresProgram()) {
                errors.put("programId", "Выберите образовательную программу топ-ИТ");
            }
        } else {
            Optional<ProgramDto> program = org.program(request.programId());
            if (program.isEmpty()) {
                errors.put("programId", "Программа не найдена");
            } else if (rule.requiresProgram() && !program.get().topIt()) {
                errors.put("programId", "Учитываются только дисциплины программ топ-ИТ");
            }
        }
        if (rule.requiresProgram() && isBlank(request.discipline())) {
            errors.put("discipline", "Укажите дисциплину учебного плана");
        }
    }

    private void validateCoauthors(AchievementRequest request, IndicatorRule rule, Long ownerId, Map<String, String> errors) {
        List<ParticipantRequest> coauthors = request.coauthors();
        if (coauthors.isEmpty()) {
            return;
        }
        if (rule.accrualMethod() == AccrualMethod.INDIVIDUAL) {
            errors.put("coauthors", "Показатель начисляется индивидуально: соавторов не указывают");
            return;
        }
        Set<Long> active = users.activeIds(
                coauthors.stream().map(ParticipantRequest::userId).filter(Objects::nonNull).collect(Collectors.toSet()));
        Set<Long> seen = new HashSet<>(Set.of(ownerId));
        for (ParticipantRequest coauthor : coauthors) {
            boolean employee = coauthor.userId() != null;
            if (employee == !isBlank(coauthor.fullName())) {
                errors.putIfAbsent("coauthors", "У соавтора укажите либо сотрудника, либо ФИО внешнего автора");
            } else if (employee && !seen.add(coauthor.userId())) {
                errors.putIfAbsent("coauthors", "Сотрудник указан дважды или совпадает с заявителем");
            } else if (employee && !active.contains(coauthor.userId())) {
                errors.putIfAbsent("coauthors", "Соавтор не найден или деактивирован");
            }
        }
    }

    private static String normalizedIdentifier(AchievementRequest request) {
        if (request.identifierType() == null || isBlank(request.identifier())) {
            return null;
        }
        String normalized = IdentifierNormalizer.identifier(request.identifierType(), request.identifier());
        if (normalized.isEmpty()) {
            throw new FieldValidationException("identifier", "Идентификатор пустой после нормализации");
        }
        return normalized;
    }

    private void ensureNoStrictDuplicate(IndicatorRule rule, IdentifierType type, String norm, Long excludeId) {
        duplicates.strict(rule.achievementType(), type, norm, excludeId).ifPresent(found -> {
            throw new ConflictException("Такое достижение уже зарегистрировано (#" + found.getId()
                    + "). Если вы соавтор, присоединитесь к нему, а не вносите заново");
        });
    }

    private void apply(Achievement achievement, AchievementRequest request, IndicatorRule rule, Long ownerId,
                       String identifierNorm) {
        achievement.setIndicatorId(rule.indicatorId());
        achievement.setIndicatorVersionId(rule.versionId());
        achievement.setPeriodId(request.periodId());
        achievement.setAchievementType(rule.achievementType());
        achievement.setTitle(request.title().trim());
        achievement.setTitleNorm(IdentifierNormalizer.title(request.title()));
        achievement.setEventDate(request.eventDate());
        achievement.setIdentifierType(identifierNorm == null ? null : request.identifierType());
        achievement.setIdentifier(identifierNorm == null ? null : request.identifier().trim());
        achievement.setIdentifierNorm(identifierNorm);
        achievement.setProgramId(request.programId());
        achievement.setDiscipline(trimToNull(request.discipline()));
        achievement.setDescription(trimToNull(request.description()));
        achievement.setQuantity(request.quantity());
        replaceParticipants(achievement, request.coauthors(), rule, ownerId);
    }

    /** Заявитель всегда первый с весом 1, за ним соавторы в порядке из запроса. Доли считаются заново. */
    private void replaceParticipants(Achievement achievement, List<ParticipantRequest> coauthors, IndicatorRule rule,
                                     Long ownerId) {
        List<ParticipantRequest> others = rule.accrualMethod() == AccrualMethod.SHARED ? coauthors : List.of();
        List<BigDecimal> weights = new ArrayList<>();
        weights.add(BigDecimal.ONE);
        others.forEach(coauthor -> weights.add(coauthor.weight()));
        List<ShareCalculator.Share> shares = ShareCalculator.split(rule.basePoints(), rule.coefficient(), weights);

        if (!achievement.getParticipants().isEmpty()) {
            achievement.getParticipants().clear();
            // Сотрудник в достижении один раз (уникальный индекс): прежние строки удаляются раньше вставки новых
            achievements.flush();
        }
        achievement.getParticipants().add(participant(achievement, ownerId, null, BigDecimal.ONE, null, shares.getFirst()));
        for (int i = 0; i < others.size(); i++) {
            ParticipantRequest coauthor = others.get(i);
            String externalName = coauthor.userId() == null ? coauthor.fullName().trim() : null;
            achievement.getParticipants().add(participant(achievement, coauthor.userId(), externalName,
                    coauthor.weight(), trimToNull(coauthor.basis()), shares.get(i + 1)));
        }
    }

    private static Participant participant(Achievement achievement, Long userId, String externalName, BigDecimal weight,
                                           String basis, ShareCalculator.Share share) {
        Participant participant = new Participant();
        participant.setAchievement(achievement);
        participant.setUserId(userId);
        participant.setExternalName(externalName);
        participant.setWeight(weight);
        participant.setBasis(basis);
        participant.setShare(share.share());
        participant.setPointsExact(share.pointsExact());
        participant.setPoints(share.points());
        return participant;
    }

    static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    static String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
