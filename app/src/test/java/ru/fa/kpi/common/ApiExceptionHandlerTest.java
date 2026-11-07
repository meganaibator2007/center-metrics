package ru.fa.kpi.common;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Формат ошибок, который ждёт клиент: ProblemDetail, ошибки полей в errors. */
@WebMvcTest(ApiExceptionHandlerTest.TestController.class)
@Import({SecurityConfig.class, ApiExceptionHandlerTest.TestController.class})
@WithMockUser(roles = "TEACHER")
class ApiExceptionHandlerTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void notFoundReturns404() throws Exception {
        mvc.perform(get("/api/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Запись 15 не найдена"));
    }

    @Test
    void conflictReturns409() throws Exception {
        mvc.perform(get("/api/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Период закрыт"));
    }

    @Test
    void wrongRoleReturns403() throws Exception {
        mvc.perform(get("/api/test/admin-only"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Недостаточно прав"));
    }

    @Test
    void invalidFieldsReturn400WithErrors() throws Exception {
        mvc.perform(post("/api/test/validation").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.name").value("Укажите название"));
    }

    @Test
    void unknownApiAddressReturns404() throws Exception {
        mvc.perform(get("/api/no-such-address"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @RestController
    static class TestController {

        @GetMapping("/api/test/not-found")
        void notFound() {
            throw new NotFoundException("Запись 15 не найдена");
        }

        @GetMapping("/api/test/conflict")
        void conflict() {
            throw new ConflictException("Период закрыт");
        }

        @GetMapping("/api/test/admin-only")
        @PreAuthorize("hasRole('ADMIN')")
        void adminOnly() {
        }

        @PostMapping("/api/test/validation")
        void validation(@Valid @RequestBody TestRequest request) {
        }
    }

    record TestRequest(@NotBlank(message = "Укажите название") String name) {
    }
}
