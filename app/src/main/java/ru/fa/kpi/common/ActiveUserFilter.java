package ru.fa.kpi.common;

import java.io.IOException;

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

/**
 * На каждый запрос сверяет вошедшего пользователя с базой. Деактивация сразу завершает его сессию,
 * а изменение ролей действует со следующего запроса, а не после нового входа.
 */
class ActiveUserFilter extends OncePerRequestFilter {

    private final UserDetailsService users;

    ActiveUserFilter(UserDetailsService users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CurrentUser current) {
            UserDetails actual = load(current.getUsername());
            if (actual != null && actual.isEnabled()) {
                useForThisRequest(actual);
            } else {
                endSession(request);
            }
        }
        chain.doFilter(request, response);
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
