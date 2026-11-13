package ru.fa.kpi.achievement;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ru.fa.kpi.indicator.AchievementType;

/**
 * Поиск повторов (ТЗ 5.2). Строгий ключ — вид достижения плюс DOI или номер документа: такой повтор
 * внести нельзя. Похожие записи — та же ссылка, то же название или тот же показатель с той же датой:
 * их показываем, решает проверяющий. Отклонённые записи не мешают.
 */
@Component
@RequiredArgsConstructor
class DuplicateFinder {

    private final AchievementRepository achievements;

    record Hit(Achievement achievement, DuplicateMatch match) {
    }

    record Key(AchievementType achievementType, Long indicatorId, IdentifierType identifierType,
               String identifierNorm, String titleNorm, LocalDate eventDate, Long excludeId) {

        static Key of(Achievement achievement) {
            return new Key(achievement.getAchievementType(), achievement.getIndicatorId(), achievement.getIdentifierType(),
                    achievement.getIdentifierNorm(), achievement.getTitleNorm(), achievement.getEventDate(), achievement.getId());
        }
    }

    Optional<Achievement> strict(AchievementType achievementType, IdentifierType identifierType, String norm, Long excludeId) {
        if (achievementType == null || identifierType == null || !identifierType.isStrictKey() || norm == null) {
            return Optional.empty();
        }
        return achievements.findByAchievementTypeAndIdentifierTypeAndIdentifierNormAndStatusNot(
                        achievementType, identifierType, norm, ResultStatus.REJECTED).stream()
                .filter(found -> !found.getId().equals(excludeId))
                .findFirst();
    }

    List<Hit> find(Key key) {
        Map<Long, Hit> hits = new LinkedHashMap<>();
        strict(key.achievementType(), key.identifierType(), key.identifierNorm(), key.excludeId())
                .ifPresent(found -> hits.put(found.getId(), new Hit(found, DuplicateMatch.STRICT)));
        if (key.identifierType() == IdentifierType.URL && key.identifierNorm() != null) {
            similar(hits, achievements.findByIdentifierTypeAndIdentifierNormAndStatusNot(
                    IdentifierType.URL, key.identifierNorm(), ResultStatus.REJECTED), key);
        }
        if (key.titleNorm() != null && !key.titleNorm().isEmpty()) {
            similar(hits, achievements.findByTitleNormAndStatusNot(key.titleNorm(), ResultStatus.REJECTED), key);
        }
        if (key.indicatorId() != null && key.eventDate() != null) {
            similar(hits, achievements.findByIndicatorIdAndEventDateAndStatusNot(
                    key.indicatorId(), key.eventDate(), ResultStatus.REJECTED), key);
        }
        return List.copyOf(hits.values());
    }

    private static void similar(Map<Long, Hit> hits, List<Achievement> found, Key key) {
        found.stream()
                .filter(achievement -> !Objects.equals(achievement.getId(), key.excludeId()))
                .forEach(achievement -> hits.putIfAbsent(achievement.getId(), new Hit(achievement, DuplicateMatch.SIMILAR)));
    }
}
