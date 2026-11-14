package ru.fa.kpi.achievement;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.fa.kpi.indicator.IndicatorRule;
import ru.fa.kpi.indicator.IndicatorService;
import ru.fa.kpi.period.PeriodDto;
import ru.fa.kpi.period.PeriodService;
import ru.fa.kpi.user.OrgService;
import ru.fa.kpi.user.PersonShort;
import ru.fa.kpi.user.UserService;

/**
 * Собирает карточки достижений. Имена людей, показатели, периоды и программы живут в других пакетах,
 * поэтому для списка они загружаются одним запросом на пакет, а не по запросу на каждую карточку.
 */
@Component
@RequiredArgsConstructor
class AchievementAssembler {

    private final UserService users;
    private final IndicatorService indicators;
    private final PeriodService periods;
    private final OrgService org;

    private record Lookups(Map<Long, PersonShort> people, Map<Long, IndicatorRule> rules,
                           Map<Long, PeriodDto> periods, Map<Long, String> programs) {

        PersonShort person(Long id) {
            return people.getOrDefault(id, new PersonShort(id, "Сотрудник #" + id, null));
        }

        String name(Long id) {
            return id == null ? null : person(id).fullName();
        }
    }

    AchievementDto toDto(Achievement achievement) {
        return toDtos(List.of(achievement)).getFirst();
    }

    List<AchievementDto> toDtos(List<Achievement> achievements) {
        Lookups lookups = lookups(achievements);
        return achievements.stream().map(achievement -> toDto(achievement, lookups)).toList();
    }

    EvidenceDto toDto(Evidence evidence) {
        return toDto(evidence, lookups(List.of(evidence.getAchievement())));
    }

    List<DuplicateDto> toDuplicates(List<DuplicateFinder.Hit> hits) {
        Lookups lookups = lookups(hits.stream().map(DuplicateFinder.Hit::achievement).toList());
        return hits.stream().map(hit -> {
            Achievement found = hit.achievement();
            return new DuplicateDto(
                    found.getId(),
                    found.getTitle(),
                    lookups.rules().get(found.getIndicatorVersionId()).code(),
                    found.getEventDate(),
                    found.getParticipants().stream().map(participant -> participantName(participant, lookups)).toList(),
                    found.getStatus(),
                    hit.match());
        }).toList();
    }

    private Lookups lookups(Collection<Achievement> achievements) {
        Set<Long> people = new HashSet<>();
        for (Achievement achievement : achievements) {
            people.add(achievement.getOwnerId());
            people.add(achievement.getEnteredBy());
            achievement.getParticipants().forEach(participant -> people.add(participant.getUserId()));
            achievement.getDecisions().forEach(decision -> people.add(decision.getActorId()));
            achievement.getEvidence().forEach(evidence -> people.add(evidence.getUploadedBy()));
        }
        people.remove(null);
        return new Lookups(
                users.people(people),
                indicators.rules(ids(achievements.stream().map(Achievement::getIndicatorVersionId))),
                periods.byIds(ids(achievements.stream().map(Achievement::getPeriodId))),
                org.programNames(ids(achievements.stream().map(Achievement::getProgramId))));
    }

    private static Set<Long> ids(Stream<Long> values) {
        return values.filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet());
    }

    private static AchievementDto toDto(Achievement achievement, Lookups lookups) {
        IndicatorRule rule = lookups.rules().get(achievement.getIndicatorVersionId());
        PeriodDto period = lookups.periods().get(achievement.getPeriodId());
        return new AchievementDto(
                achievement.getId(),
                achievement.getIndicatorId(),
                rule.code(),
                rule.name(),
                rule.category(),
                achievement.getAchievementType(),
                achievement.getPeriodId(),
                period == null ? null : period.name(),
                achievement.getTitle(),
                achievement.getEventDate(),
                achievement.getIdentifierType(),
                achievement.getIdentifier(),
                achievement.getProgramId(),
                achievement.getProgramId() == null ? null : lookups.programs().get(achievement.getProgramId()),
                achievement.getDiscipline(),
                achievement.getDescription(),
                achievement.getQuantity(),
                lookups.person(achievement.getOwnerId()),
                lookups.name(achievement.getEnteredBy()),
                achievement.getBasis(),
                achievement.getParticipants().stream().map(participant -> new ParticipantDto(
                        participant.getUserId(),
                        participantName(participant, lookups),
                        participant.isExternal(),
                        participant.getWeight(),
                        participant.getShare(),
                        participant.getPoints())).toList(),
                rule.basePoints(),
                rule.coefficient(),
                achievement.getStatus(),
                achievement.getReviewerKind(),
                achievement.isPossibleDuplicate(),
                achievement.getLastComment(),
                achievement.activeEvidence().stream().map(evidence -> toDto(evidence, lookups)).toList(),
                achievement.getDecisions().stream().map(decision -> new DecisionDto(
                        decision.getId(),
                        decision.getAction(),
                        lookups.name(decision.getActorId()),
                        decision.getComment(),
                        decision.getDecidedAt())).toList(),
                achievement.getRevision(),
                achievement.getCreatedAt(),
                achievement.getUpdatedAt());
    }

    private static EvidenceDto toDto(Evidence evidence, Lookups lookups) {
        return new EvidenceDto(
                evidence.getId(),
                evidence.getDocType(),
                evidence.getRequisites(),
                evidence.getOriginalName(),
                evidence.getSizeBytes(),
                evidence.getUrl(),
                evidence.getVersionNo(),
                evidence.getUploadedAt(),
                lookups.name(evidence.getUploadedBy()));
    }

    private static String participantName(Participant participant, Lookups lookups) {
        return participant.isExternal() ? participant.getExternalName() : lookups.name(participant.getUserId());
    }
}
