package ru.fa.kpi.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class CsrfController {

    /**
     * Клиент вызывает перед входом. Обращение к токену заставляет Spring Security
     * записать его в cookie XSRF-TOKEN, тело ответа не нужно.
     */
    @GetMapping("/api/auth/csrf")
    ResponseEntity<Void> csrf(HttpServletRequest request) {
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (token != null) {
            token.getToken();
        }
        return ResponseEntity.noContent().build();
    }
}
