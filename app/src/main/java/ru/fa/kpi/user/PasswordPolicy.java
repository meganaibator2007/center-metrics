package ru.fa.kpi.user;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Требования к паролю. Одни для пароля, который задаёт сам сотрудник, и для временного, который выдаёт администратор.
 * <p>
 * Не больше 72 байт: BCrypt дальше не читает, а Spring Security на более длинный пароль бросает исключение.
 * Русская буква в UTF-8 — 2 байта, поэтому кириллицей влезает около 36 символов.
 */
final class PasswordPolicy {

    static final int MIN_LENGTH = 8;
    static final int MAX_BYTES = 72;

    /** Популярные пароли, которые проходят остальные правила. Короткие и без цифр отсекаются раньше. */
    private static final Set<String> COMMON = Set.of(
            "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "p@ssword1",
            "qwerty12", "qwerty123", "qwerty1234", "qwer1234", "1234qwer", "qwe12345", "123qwe123", "qweasd123",
            "1q2w3e4r", "1q2w3e4r5t", "q1w2e3r4", "q1w2e3r4t5", "1qaz2wsx", "1qaz2wsx3edc", "zaq12wsx", "qazwsx123",
            "abc12345", "abcd1234", "abc123456", "a1234567", "a12345678", "12345678a", "123456789a", "asdf1234",
            "admin123", "admin1234", "admin12345", "administrator1", "test1234", "test12345", "user1234",
            "welcome1", "welcome123", "letmein1", "iloveyou1", "monkey123", "dragon123", "changeme1", "secret123",
            "student1", "student123", "parol123", "parol1234", "privet123");

    private PasswordPolicy() {
    }

    /** Нельзя сохранить вообще: пусто или длиннее, чем умеет BCrypt. */
    static Optional<String> unusable(String password) {
        if (password == null || password.isBlank()) {
            return Optional.of("Укажите пароль");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            return Optional.of("Слишком длинный: не больше " + MAX_BYTES + " байт — около 70 латинских или 36 русских символов");
        }
        return Optional.empty();
    }

    /** Первое нарушенное правило или пусто, если пароль подходит. */
    static Optional<String> violation(String password, String login) {
        Optional<String> unusable = unusable(password);
        if (unusable.isPresent()) {
            return unusable;
        }
        if (password.length() < MIN_LENGTH) {
            return Optional.of("Не короче " + MIN_LENGTH + " символов");
        }
        if (password.chars().noneMatch(Character::isLetter) || password.chars().noneMatch(Character::isDigit)) {
            return Optional.of("Нужны хотя бы одна буква и одна цифра");
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (login != null && !login.isBlank() && lower.contains(login.trim().toLowerCase(Locale.ROOT))) {
            return Optional.of("Пароль не должен содержать логин");
        }
        if (COMMON.contains(lower)) {
            return Optional.of("Слишком простой: такой пароль есть в списках популярных");
        }
        return Optional.empty();
    }
}
