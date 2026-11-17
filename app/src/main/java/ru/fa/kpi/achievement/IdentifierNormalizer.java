package ru.fa.kpi.achievement;

import java.util.Locale;

/**
 * Нормализация для поиска повторов (ТЗ 5.2, шаг 1): регистр, пробелы, пунктуация,
 * у DOI — префиксы вида https://doi.org/ и doi:, у ссылок — протокол, www и последний слеш.
 */
final class IdentifierNormalizer {

    private static final int MAX_LENGTH = 500;

    private IdentifierNormalizer() {
    }

    static String identifier(IdentifierType type, String raw) {
        String value = raw.trim().toLowerCase(Locale.ROOT);
        String normalized = switch (type) {
            case DOI -> value
                    .replaceFirst("^(https?://)?(dx\\.)?doi\\.org/", "")
                    .replaceFirst("^doi:\\s*", "")
                    .replaceAll("\\s+", "");
            case URL -> value
                    .replaceFirst("^https?://", "")
                    .replaceFirst("^www\\.", "")
                    .replaceAll("/+$", "");
            case DOC_NUMBER -> value
                    .replace("№", "")
                    .replaceAll("\\s+", "");
        };
        return cut(normalized);
    }

    static String title(String raw) {
        return cut(raw.toLowerCase(Locale.ROOT)
                .replace('ё', 'е')
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .trim());
    }

    private static String cut(String value) {
        return value.length() > MAX_LENGTH ? value.substring(0, MAX_LENGTH) : value;
    }
}
