package ru.fa.kpi.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.CurrentUser;

/** Вход, текущий пользователь и смена пароля. Выход делает сам Spring Security. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionStrategy;
    private final SecurityContextRepository securityContextRepository;
    private final UserService userService;
    private final LoginThrottle throttle;

    /**
     * Проверяет пароль, меняет ID сессии и CSRF-токен и сохраняет вошедшего пользователя в сессии.
     * После серии неудач вход для логина или адреса временно закрыт: {@link LoginThrottle}.
     */
    @PostMapping("/login")
    UserDto login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        String address = request.getRemoteAddr();
        throttle.check(body.login(), address);
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(body.login(), body.password()));
        } catch (AuthenticationException e) {
            throttle.failed(body.login(), address);
            throw e;
        }
        throttle.succeeded(body.login());
        sessionStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        return userService.recordLogin(((CurrentUser) authentication.getPrincipal()).getId());
    }

    @GetMapping("/me")
    UserDto me(@AuthenticationPrincipal CurrentUser user) {
        return userService.getById(user.getId());
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody ChangePasswordRequest body) {
        userService.changePassword(user.getId(), body.currentPassword(), body.newPassword());
    }
}
