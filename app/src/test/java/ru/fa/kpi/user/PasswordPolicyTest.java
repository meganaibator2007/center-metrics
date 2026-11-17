package ru.fa.kpi.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = {"secret-123", "Зима2026года", "k7#pLm2q", "new-secret-1"})
    void acceptsReasonablePasswords(String password) {
        assertThat(PasswordPolicy.violation(password, "a.ivanova")).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "abc1234       | Не короче 8 символов",
            "12345678      | Нужны хотя бы одна буква и одна цифра",
            "password      | Нужны хотя бы одна буква и одна цифра",
            "a.ivanova2026 | Пароль не должен содержать логин",
            "A.Ivanova-1   | Пароль не должен содержать логин",
            "Qwerty123     | Слишком простой: такой пароль есть в списках популярных",
            "1q2w3e4r      | Слишком простой: такой пароль есть в списках популярных"
    })
    void rejectsWeakPasswords(String password, String message) {
        assertThat(PasswordPolicy.violation(password, "a.ivanova")).contains(message);
    }

    @Test
    void rejectsPasswordLongerThanBcryptReads() {
        String cyrillic = "Пароль1" + "ж".repeat(30); // 37 символов, 73 байта
        String latin = "a1".repeat(36);                 // 72 символа, 72 байта

        assertThat(PasswordPolicy.violation(cyrillic, "a.ivanova")).get().asString().startsWith("Слишком длинный");
        assertThat(PasswordPolicy.violation(latin, "a.ivanova")).isEmpty();
    }

    @Test
    void blankIsUnusable() {
        assertThat(PasswordPolicy.unusable("  ")).contains("Укажите пароль");
        assertThat(PasswordPolicy.unusable("admin")).isEmpty();
    }
}
