package ru.fa.kpi.user;

import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ru.fa.kpi.common.CurrentUser;
import ru.fa.kpi.common.SecurityConfig;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
class AuthControllerTest {

    private static final String CREDENTIALS = "{\"login\": \"a.ivanova\", \"password\": \"secret-123\"}";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AuthenticationManager authenticationManager;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private UserService userService;

    private final CurrentUser employee = new CurrentUser(1L, "a.ivanova", null, true, Set.of("EMPLOYEE"));

    private static UserDto dto() {
        return new UserDto(1L, "a.ivanova", "Иванова Анна", "Иванова", "Анна", null, null, List.of(Role.EMPLOYEE),
                List.of(Category.PPS), List.of(), null, null, null, null, List.of(), List.of(), true, true);
    }

    @Test
    void loginCreatesSessionAndReturnsUser() throws Exception {
        when(authenticationManager.authenticate(any())).thenReturn(
                UsernamePasswordAuthenticationToken.authenticated(employee, null, employee.getAuthorities()));
        when(userService.recordLogin(1L)).thenReturn(dto());

        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(CREDENTIALS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("a.ivanova"))
                .andExpect(jsonPath("$.roles[0]").value("EMPLOYEE"))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(request().sessionAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, notNullValue()));
    }

    @Test
    void wrongPasswordReturns401() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad"));

        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(CREDENTIALS))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Неверный логин или пароль"));
    }

    @Test
    void deactivatedAccountLooksLikeWrongPassword() throws Exception {
        when(authenticationManager.authenticate(any())).thenThrow(new DisabledException("off"));

        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(CREDENTIALS))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Неверный логин или пароль"));
    }

    @Test
    void emptyLoginIsFieldError() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\": \" \", \"password\": \"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.login").exists());
    }

    @Test
    void meReturnsCurrentUser() throws Exception {
        when(userDetailsService.loadUserByUsername("a.ivanova")).thenReturn(employee);
        when(userService.getById(1L)).thenReturn(dto());

        mvc.perform(get("/api/auth/me").with(user(employee)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void meWithoutSessionReturns401() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void deactivatedUserLosesSessionOnNextRequest() throws Exception {
        when(userDetailsService.loadUserByUsername("a.ivanova"))
                .thenReturn(new CurrentUser(1L, "a.ivanova", null, false, Set.of("EMPLOYEE")));

        mvc.perform(get("/api/auth/me").with(user(employee))).andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordCallsService() throws Exception {
        when(userDetailsService.loadUserByUsername("a.ivanova")).thenReturn(employee);

        mvc.perform(post("/api/auth/password").with(user(employee)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"old\", \"newPassword\": \"new-secret-1\"}"))
                .andExpect(status().isNoContent());

        verify(userService).changePassword(1L, "old", "new-secret-1");
    }

    @Test
    void shortNewPasswordIsFieldError() throws Exception {
        when(userDetailsService.loadUserByUsername("a.ivanova")).thenReturn(employee);

        mvc.perform(post("/api/auth/password").with(user(employee)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"old\", \"newPassword\": \"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.newPassword").exists());
    }
}
