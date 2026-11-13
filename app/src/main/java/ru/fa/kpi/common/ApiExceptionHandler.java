package ru.fa.kpi.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Все ошибки API в одном формате ProblemDetail (RFC 9457).
 * Ошибки по полям формы лежат в свойстве {@code errors}: имя поля → текст.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail handleNotFound(NotFoundException e) {
        return problem(HttpStatus.NOT_FOUND, "Не найдено", e.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail handleConflict(ConflictException e) {
        return problem(HttpStatus.CONFLICT, "Действие невозможно", e.getMessage());
    }

    /** Запасной случай: два одновременных запроса прошли проверку сервиса и упёрлись в ограничение базы. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataConflict(DataIntegrityViolationException e) {
        log.warn("Нарушено ограничение базы: {}", e.getMostSpecificCause().getMessage());
        return problem(HttpStatus.CONFLICT, "Действие невозможно", "Данные конфликтуют с уже сохранёнными");
    }

    @ExceptionHandler(FieldValidationException.class)
    ProblemDetail handleFieldValidation(FieldValidationException e) {
        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Ошибка в данных", "Проверьте заполнение полей");
        body.setProperty("errors", e.getErrors());
        return body;
    }

    /** Причина не уточняется: нельзя подсказывать, существует ли логин и активна ли учётная запись. */
    @ExceptionHandler({BadCredentialsException.class, AccountStatusException.class})
    ProblemDetail handleBadLogin(AuthenticationException e) {
        return problem(HttpStatus.UNAUTHORIZED, "Вход не выполнен", "Неверный логин или пароль");
    }

    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail handleUnauthorized(AuthenticationException e) {
        return problem(HttpStatus.UNAUTHORIZED, "Нужно войти в систему", null);
    }

    @ExceptionHandler(CsrfException.class)
    ProblemDetail handleCsrf(CsrfException e) {
        return problem(HttpStatus.FORBIDDEN, "Нет CSRF-токена",
                "Получите токен через GET /api/auth/csrf и передайте его в заголовке X-XSRF-TOKEN");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail handleForbidden(AccessDeniedException e) {
        return problem(HttpStatus.FORBIDDEN, "Недостаточно прав", null);
    }

    /** Право зависит от самой записи — объясняем, чего не хватает. */
    @ExceptionHandler(ForbiddenException.class)
    ProblemDetail handleForbiddenAction(ForbiddenException e) {
        return problem(HttpStatus.FORBIDDEN, "Недостаточно прав", e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception e) {
        log.error("Необработанная ошибка", e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Внутренняя ошибка сервера", null);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));

        ProblemDetail body = problem(HttpStatus.BAD_REQUEST, "Ошибка в данных", "Проверьте заполнение полей");
        body.setProperty("errors", errors);
        return handleExceptionInternal(e, body, headers, status, request);
    }

    private static ProblemDetail problem(HttpStatus status, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        problem.setDetail(detail);
        return problem;
    }
}
