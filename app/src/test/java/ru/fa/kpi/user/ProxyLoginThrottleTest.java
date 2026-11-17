package ru.fa.kpi.user;

import java.nio.file.Files;
import java.nio.file.Path;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.ForwardedHeaderFilter;
import ru.fa.kpi.common.TooManyRequestsException;
import static org.assertj.core.api.Assertions.*;

class ProxyLoginThrottleTest {
    /** Проверяет контракт nginx и Spring. Полный сетевой прогон требует Docker. */
    @Test
    void normalizedProxyHeadersKeepAddressLimitAcrossDifferentLogins() throws Exception {
        Path root = Files.exists(Path.of("frontend/nginx.conf")) ? Path.of(".") : Path.of("..");
        String config = Files.readString(root.resolve("frontend/nginx.conf"));
        assertThat(config).contains("proxy_set_header X-Forwarded-For $remote_addr;",
                "proxy_set_header Forwarded \"\";").doesNotContain("$proxy_add_x_forwarded_for");
        LoginThrottle throttle = new LoginThrottle();
        for (int i = 0; i <= LoginThrottle.MAX_ADDRESS_FAILURES; i++) {
            String login = "different-user-" + i;
            // После nginx оба клиентских заголовка заменены независимо от присланного значения.
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr("172.18.0.2");
            request.addHeader("X-Forwarded-For", "203.0.113.9");
            boolean blocked = i == LoginThrottle.MAX_ADDRESS_FAILURES;
            new ForwardedHeaderFilter().doFilter(request, new MockHttpServletResponse(), (req, res) -> {
                String address = ((HttpServletRequest) req).getRemoteAddr();
                assertThat(address).isEqualTo("203.0.113.9");
                if (blocked) {
                    assertThatThrownBy(() -> throttle.check(login, address))
                            .isInstanceOf(TooManyRequestsException.class);
                } else {
                    throttle.check(login, address);
                    throttle.failed(login, address);
                }
            });
        }
    }
}
