package ru.fa.kpi.achievement;

import java.util.Locale;

import ru.fa.kpi.common.Category;

/** Фильтры реестра. Применяются к готовой карточке: там уже есть категория и имена участников. */
record AchievementFilter(AchievementScope scope, ResultStatus status, Long periodId, Category category,
                         Long indicatorId, Long userId, String q) {

    boolean matches(AchievementDto dto) {
        return (status == null || dto.status() == status)
                && (periodId == null || periodId.equals(dto.periodId()))
                && (category == null || dto.category() == category)
                && (indicatorId == null || indicatorId.equals(dto.indicatorId()))
                && (userId == null || dto.participants().stream().anyMatch(p -> userId.equals(p.userId())))
                && matchesText(dto);
    }

    /** Поиск по названию, идентификатору и ФИО участников без учёта регистра. */
    private boolean matchesText(AchievementDto dto) {
        if (q == null || q.isBlank()) {
            return true;
        }
        String needle = q.trim().toLowerCase(Locale.ROOT);
        return contains(dto.title(), needle)
                || contains(dto.identifier(), needle)
                || dto.participants().stream().anyMatch(p -> contains(p.fullName(), needle));
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }
}
