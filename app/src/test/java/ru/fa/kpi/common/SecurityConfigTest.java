package ru.fa.kpi.common;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CsrfController.class)
@Import(SecurityConfig.class)
class SecurityConfigTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    void csrfEndpointIsOpenAndSetsCookie() throws Exception {
        mvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
    }

    @Test
    void apiWithoutSessionReturns401Problem() throws Exception {
        mvc.perform(get("/api/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.title").value("Нужно войти в систему"));
    }

    @Test
    void changingRequestWithoutCsrfReturns403Problem() throws Exception {
        mvc.perform(post("/api/auth/login"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.title").value("Нет CSRF-токена"));
    }

    @Test
    void swaggerContractIsOpenWithoutLogin() throws Exception {
        mvc.perform(get("/openapi.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("openapi: 3.1.0")));
    }

    @Test
    @WithMockUser
    void logoutEndsSessionWith204() throws Exception {
        mvc.perform(post("/api/auth/logout").with(csrf()))
                .andExpect(status().isNoContent());
    }
}
