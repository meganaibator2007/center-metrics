package ru.fa.kpi.common;

/** Пароль выдан администратором и ещё не сменён: до смены доступны только вход, выход, профиль и смена пароля. */
public class PasswordChangeRequiredException extends RuntimeException {

    public PasswordChangeRequiredException() {
        super("Сначала смените выданный пароль: POST /api/auth/password");
    }
}
