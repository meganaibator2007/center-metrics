package ru.fa.kpi.common;

import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Вход по сессии в cookie (HttpOnly), без JWT. Все адреса /api, кроме открытых,
 * требуют входа. Роль проверяется в контроллерах через {@code @PreAuthorize}.
 * Ошибки 401 и 403 отдаются в формате ProblemDetail через {@link ApiExceptionHandler}.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final String[] OPEN_API = {"/api/auth/csrf", "/api/auth/login", "/api/health"};

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver,
            UserDetailsService users) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(OPEN_API).permitAll()
                        .requestMatchers("/api/**").authenticated()
                        // Остальное — Swagger UI и openapi.yaml. Клиент React раздаёт nginx
                        .anyRequest().permitAll())
                // Токен в cookie XSRF-TOKEN, клиент возвращает его в заголовке X-XSRF-TOKEN
                .csrf(csrf -> csrf.spa())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(logout -> logout
                        .logoutUrl("/api/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, e) ->
                                exceptionResolver.resolveException(request, response, null, e))
                        .accessDeniedHandler((request, response, e) ->
                                exceptionResolver.resolveException(request, response, null, e)))
                .addFilterBefore(new ActiveUserFilter(users, exceptionResolver), AnonymousAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Проверяет логин и пароль при входе. Пользователей берёт из UserDetailsService пакета user. */
    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /** После входа меняются ID сессии и CSRF-токен: значения, полученные до входа, больше не действуют. */
    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy() {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(CookieCsrfTokenRepository.withHttpOnlyFalse())));
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }
}
