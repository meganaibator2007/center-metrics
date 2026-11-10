package ru.fa.kpi.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.fa.kpi.TestcontainersConfiguration;

/**
 * Весь путь на настоящем PostgreSQL: первый администратор, вход, сотрудник, перевод, смена пароля, деактивация.
 * Проверяет и то, что сущности сходятся со схемой. Без Docker тест пропускается, в CI Docker есть.
 */
@SpringBootTest(properties = {"app.admin.login=admin", "app.admin.password=first-admin-pass"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class UserFlowTests {

    @Autowired
    private MockMvc mvc;

    private MockHttpSession login(String login, String password) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\": \"%s\", \"password\": \"%s\"}".formatted(login, password)))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    private static String user(String position, String password) {
        return """
                {"lastName": "Иванова", "firstName": "Анна", "middleName": null, "login": "a.ivanova",
                 "roles": ["EMPLOYEE"], "categories": ["PPS"], "departmentId": null, "position": %s,
                 "programIds": [], "reviewProgramIds": [], "permissions": [], "managerId": null,
                 "externalId": null, "password": %s}
                """.formatted(position, password);
    }

    @Test
    void userLifecycle() throws Exception {
        MockHttpSession admin = login("admin", "first-admin-pass");
        mvc.perform(get("/api/auth/me").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles[0]").value("ADMIN"))
                .andExpect(jsonPath("$.mustChangePassword").value(true));

        String created = mvc.perform(post("/api/users").session(admin).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(user("null", "\"secret-123\"")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        assertThat(created).contains("a.ivanova");
        long id = Long.parseLong(created.replaceAll(".*?\"id\":(\\d+).*", "$1"));

        mvc.perform(post("/api/users").session(admin).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(user("null", "\"secret-123\"")))
                .andExpect(status().isConflict());

        mvc.perform(put("/api/users/" + id).session(admin).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(user("\"Доцент\"", "null")))
                .andExpect(status().isOk());
        mvc.perform(get("/api/users/" + id + "/history").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].position").value("Доцент"))
                .andExpect(jsonPath("$[0].validTo").isEmpty());

        mvc.perform(get("/api/users").param("q", "ивАНОВА ан").param("role", "EMPLOYEE").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page.totalElements").value(1));
        mvc.perform(get("/api/employees").session(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        MockHttpSession employee = login("a.ivanova", "secret-123");
        mvc.perform(get("/api/users").session(employee)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/password").session(employee).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\": \"secret-123\", \"newPassword\": \"new-secret-1\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/auth/me").session(employee))
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        mvc.perform(patch("/api/users/" + id + "/active").session(admin).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"active\": false}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/auth/me").session(employee)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\": \"a.ivanova\", \"password\": \"new-secret-1\"}"))
                .andExpect(status().isUnauthorized());
    }
}
