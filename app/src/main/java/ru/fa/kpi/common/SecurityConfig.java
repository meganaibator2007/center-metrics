package ru.fa.kpi.common;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
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
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(OPEN_API).permitAll()
                        .requestMatchers("/api/**").authenticated()
                        // Остальное — файлы клиента React и Swagger UI
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
                                exceptionResolver.resolveException(request, response, null, e)));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
