package ru.fa.kpi.common;

import java.io.IOException;
import java.util.Set;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * На каждый запрос сверяет вошедшего пользователя с базой. Деактивация сразу завершает его сессию,
 * а изменение ролей действует со следующего запроса, а не после нового входа.
 * <p>
 * Пока не сменён пароль, выданный администратором, к API пускает только за профилем и сменой пароля.
 * Проверка на сервере, а не только в клиенте: иначе выданным паролем можно было бы пользоваться напрямую через API.
 */
class ActiveUserFilter extends OncePerRequestFilter {

    private static final Set<String> OPEN_BEFORE_PASSWORD_CHANGE = Set.of(
            "/api/auth/csrf", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/password", "/api/health");

    private final UserDetailsService users;
    private final HandlerExceptionResolver errors;

    ActiveUserFilter(UserDetailsService users, HandlerExceptionResolver errors) {
        this.users = users;
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CurrentUser current) {
            UserDetails actual = load(current.getUsername());
            if (actual != null && actual.isEnabled()) {
                useForThisRequest(actual);
                if (actual instanceof CurrentUser fresh && fresh.isMustChangePassword() && closedUntilPasswordChange(request)) {
                    rejectUntilPasswordChange(request, response);
                    return;
                }
            } else {
                endSession(request);
            }
        }
        chain.doFilter(request, response);
    }

    private static boolean closedUntilPasswordChange(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return path.startsWith("/api/") && !OPEN_BEFORE_PASSWORD_CHANGE.contains(path);
    }

    /** Ответ в том же формате ProblemDetail, что и у контроллеров. */
    private void rejectUntilPasswordChange(HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (errors.resolveException(request, response, null, new PasswordChangeRequiredException()) == null) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
        }
    }

    private UserDetails load(String login) {
        try {
            return users.loadUserByUsername(login);
        } catch (UsernameNotFoundException e) {
            return null;
        }
    }

    private static void useForThisRequest(UserDetails actual) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(actual, null, actual.getAuthorities()));
        SecurityContextHolder.setContext(context);
    }

    private static void endSession(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }
}
