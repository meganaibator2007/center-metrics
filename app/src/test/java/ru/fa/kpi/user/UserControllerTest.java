package ru.fa.kpi.user;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import ru.fa.kpi.common.Category;
import ru.fa.kpi.common.CurrentUser;
import ru.fa.kpi.common.SecurityConfig;

@WebMvcTest({UserController.class, OrgController.class})
@Import(SecurityConfig.class)
class UserControllerTest {

    private static final String NEW_USER = """
            {"lastName": "Иванова", "firstName": "Анна", "middleName": null, "login": "a.ivanova",
             "roles": ["EMPLOYEE"], "categories": ["PPS"], "departmentId": null, "position": null,
             "programIds": [], "reviewProgramIds": [], "permissions": [], "managerId": null,
             "externalId": null, "password": "secret-123"}
            """;

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private UserService userService;
    @MockitoBean
    private OrgService orgService;

    private RequestPostProcessor as(long id, String login, String role) {
        CurrentUser principal = new CurrentUser(id, login, null, true, false, Set.of(role));
        when(userDetailsService.loadUserByUsername(login)).thenReturn(principal);
        return user(principal);
    }

    private static UserDto dto() {
        return new UserDto(7L, "a.ivanova", "Иванова Анна", "Иванова", "Анна", null, null, List.of(Role.EMPLOYEE),
                List.of(Category.PPS), List.of(), null, null, null, null, List.of(), List.of(), true, true);
    }

    @Test
    void listWithoutLoginReturns401() throws Exception {
        mvc.perform(get("/api/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void employeeCannotListUsers() throws Exception {
        mvc.perform(get("/api/users").with(as(2, "emp", "EMPLOYEE"))).andExpect(status().isForbidden());
    }

    @Test
    void directorSeesPageInContractFormat() throws Exception {
        when(userService.search(any(), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of(dto()), PageRequest.of(0, 20), 1));

        mvc.perform(get("/api/users").with(as(3, "dir", "DIRECTOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].login").value("a.ivanova"))
                .andExpect(jsonPath("$.page.number").value(0))
                .andExpect(jsonPath("$.page.size").value(20))
                .andExpect(jsonPath("$.page.totalElements").value(1))
                .andExpect(jsonPath("$.page.totalPages").value(1));
    }

    @Test
    void tooLargePageSizeIsRejected() throws Exception {
        mvc.perform(get("/api/users").param("size", "101").with(as(1, "adm", "ADMIN")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void directorCannotCreateUsers() throws Exception {
        mvc.perform(post("/api/users").with(as(3, "dir", "DIRECTOR")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_USER))
                .andExpect(status().isForbidden());
        verify(userService, never()).create(any(), any());
    }

    @Test
    void adminCreatesUser() throws Exception {
        when(userService.create(any(), eq(1L))).thenReturn(dto());

        mvc.perform(post("/api/users").with(as(1, "adm", "ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_USER))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(7));
    }

    @Test
    void badLoginIsFieldError() throws Exception {
        mvc.perform(post("/api/users").with(as(1, "adm", "ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(NEW_USER.replace("a.ivanova", "A Ivanova")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.login").exists());
    }

    @Test
    void activePassesActorToService() throws Exception {
        when(userService.setActive(7L, false, 1L)).thenReturn(dto());

        mvc.perform(patch("/api/users/7/active").with(as(1, "adm", "ADMIN")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\": false}"))
                .andExpect(status().isOk());

        verify(userService).setActive(7L, false, 1L);
    }

    @Test
    void anyLoggedInUserGetsEmployees() throws Exception {
        when(userService.listEmployees()).thenReturn(List.of(new PersonShort(7L, "Иванова Анна", null)));

        mvc.perform(get("/api/employees").with(as(2, "emp", "EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fullName").value("Иванова Анна"));
    }

    @Test
    void employeeReadsDepartmentsButCannotCreate() throws Exception {
        when(orgService.listDepartments()).thenReturn(List.of(new DepartmentDto(1L, "Кафедра ИТ")));

        mvc.perform(get("/api/departments").with(as(2, "emp", "EMPLOYEE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Кафедра ИТ"));
        mvc.perform(post("/api/departments").with(as(2, "emp", "EMPLOYEE")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\": \"Новая\"}"))
                .andExpect(status().isForbidden());
    }
}
