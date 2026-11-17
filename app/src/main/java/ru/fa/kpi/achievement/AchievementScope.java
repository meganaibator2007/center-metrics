package ru.fa.kpi.achievement;

import java.util.Locale;

import ru.fa.kpi.common.FieldValidationException;

/** Какой список нужен: свои, очередь РОП, очередь директора или весь доступный реестр. */
enum AchievementScope {
    MY,
    REVIEW,
    APPROVAL,
    REGISTRY;

    static AchievementScope parse(String value) {
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new FieldValidationException("scope", "Допустимо: my, review, approval, registry");
        }
    }
}
