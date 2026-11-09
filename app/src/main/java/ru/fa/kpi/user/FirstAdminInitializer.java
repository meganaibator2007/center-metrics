package ru.fa.kpi.user;

import java.util.Locale;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import ru.fa.kpi.common.ConflictException;
import ru.fa.kpi.common.FieldValidationException;

/** При старте создаёт первого администратора из ADMIN_LOGIN и ADMIN_PASSWORD, если администраторов нет. */
@Component
@RequiredArgsConstructor
@Slf4j
class FirstAdminInitializer implements ApplicationRunner {

    private final UserService userService;

    @Value("${app.admin.login:}")
    private String login;

    @Value("${app.admin.password:}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (userService.hasAdmin()) {
            return;
        }
        if (login.isBlank() || password.isBlank()) {
            log.warn("Администратора нет, а ADMIN_LOGIN или ADMIN_PASSWORD не заданы: войти в систему будет некому");
            return;
        }
        String normalized = login.trim().toLowerCase(Locale.ROOT);
        try {
            userService.createFirstAdmin(normalized, password);
            log.info("Создан первый администратор: {}", normalized);
        } catch (ConflictException | FieldValidationException e) {
            log.warn("Первый администратор не создан: {}", e.getMessage());
        }
    }
}
