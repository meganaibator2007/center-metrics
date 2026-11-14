package ru.fa.kpi.achievement;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.junit.jupiter.Testcontainers;
import ru.fa.kpi.TestcontainersConfiguration;

/**
 * Путь «запись → балл» на настоящем PostgreSQL: черновик с соавторами, подтверждение, отправка,
 * проверка РОП, утверждение директором, начисления и личные баллы, закрытие периода.
 * Свои настройки первого администратора — отдельный контекст и отдельная база, данные не пересекаются с UserFlowTests.
 */
@SpringBootTest(properties = {"app.admin.login=root", "app.admin.password=root-pass-123"})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
class AchievementFlowTests {

    private static final String PASSWORD = "secret-123";

    @Autowired
    private MockMvc mvc;

    private MockHttpSession login(String login, String password) throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\": \"%s\", \"password\": \"%s\"}".formatted(login, password)))
                .andExpect(status().isOk())
                .andReturn().getRequest().getSession(false);
    }

    private ResultActions send(MockHttpSession session, String url, String body) throws Exception {
        return mvc.perform(post(url).session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long create(MockHttpSession session, String url, String body) throws Exception {
        String response = send(session, url, body).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(response, "$.id")).longValue();
    }

    private static String user(String login, String lastName, String roles, String categories, long program,
                               String reviewPrograms) {
        return """
                {"lastName": "%s", "firstName": "Анна", "middleName": null, "login": "%s", "roles": %s,
                 "categories": %s, "departmentId": null, "position": null, "programIds": [%d],
                 "reviewProgramIds": %s, "permissions": [], "managerId": null, "externalId": null, "password": "%s"}
                """.formatted(lastName, login, roles, categories, program, reviewPrograms, PASSWORD);
    }

    private static String achievement(long indicator, long period, String doi, String coauthors) {
        return """
                {"indicatorId": %d, "periodId": %d, "title": "Метрики эффективности университета",
                 "eventDate": "2026-10-15", "identifierType": "DOI", "identifier": "%s", "programId": null,
                 "discipline": null, "description": null, "quantity": null, "coauthors": %s,
                 "ownerId": null, "basis": null}
                """.formatted(indicator, period, doi, coauthors);
    }

    @Test
    void achievementGoesFromDraftToScore() throws Exception {
        MockHttpSession admin = login("root", "root-pass-123");
        long program = create(admin, "/api/programs", """
                {"code": "09.03.03", "name": "Прикладная информатика", "topIt": true}""");
        long ivanov = create(admin, "/api/users", user("ivanov", "Иванов", "[\"EMPLOYEE\"]", "[\"PPS\"]", program, "[]"));
        long petrov = create(admin, "/api/users", user("petrov", "Петров", "[\"EMPLOYEE\"]", "[\"PPS\"]", program, "[]"));
        create(admin, "/api/users", user("rop", "Сидорова", "[\"REVIEWER\"]", "[\"ROP\"]", program, "[" + program + "]"));
        create(admin, "/api/users", user("director", "Кузнецов", "[\"DIRECTOR\"]", "[]", program, "[]"));
        long indicator = create(admin, "/api/indicators", """
                {"code": "П-1", "name": "Статья в журнале из перечня ВАК", "category": "PPS", "evaluationType": "POINTS",
                 "unit": "статья", "basePoints": 20, "accrualMethod": "SHARED", "achievementType": "PUBLICATION",
                 "coefficient": 1, "maxPoints": 30, "requiresProgram": false, "evidence": "Ссылка на статью",
                 "evidenceRequired": true, "validFrom": "2026-09-01"}""");
        long period = create(admin, "/api/periods", """
                {"name": "Осенний семестр 2026/27", "type": "SEMESTER", "startDate": "2026-09-01", "endDate": "2027-01-31"}""");

        // Черновик: заявитель вес 1, коллега вес 1, внешний автор вес 2 → 20 × 1/4, 1/4, 2/4
        MockHttpSession employee = login("ivanov", PASSWORD);
        String coauthors = """
                [{"userId": %d, "fullName": null, "weight": 1, "basis": null},
                 {"userId": null, "fullName": "Smith J.", "weight": 2, "basis": null}]""".formatted(petrov);
        String draft = send(employee, "/api/achievements",
                        achievement(indicator, period, "https://doi.org/10.1000/ABC.1", coauthors))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.owner.id").value(ivanov))
                .andExpect(jsonPath("$.participants.length()").value(3))
                .andExpect(jsonPath("$.participants[0].points").value(5.0))
                .andExpect(jsonPath("$.participants[1].points").value(5.0))
                .andExpect(jsonPath("$.participants[2].external").value(true))
                .andExpect(jsonPath("$.participants[2].points").value(10.0))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(draft, "$.id")).longValue();
        String url = "/api/achievements/" + id;

        // Без подтверждающего документа отправить нельзя
        send(employee, url + "/submit", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.evidence").exists());
        send(employee, url + "/evidence", """
                {"docType": "Статья", "url": "https://journal.example/article/1", "requisites": null}""")
                .andExpect(status().isCreated());
        send(employee, url + "/submit", "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ON_REVIEW"))
                .andExpect(jsonPath("$.reviewer").value("ROP"));

        // Тот же DOI в другой записи — строгий дубль, соавтору предлагают присоединиться
        MockHttpSession coauthor = login("petrov", PASSWORD);
        send(coauthor, "/api/achievements", achievement(indicator, period, "doi: 10.1000/abc.1", "[]"))
                .andExpect(status().isConflict());
        send(coauthor, "/api/achievements/check-duplicates", """
                {"indicatorId": %d, "identifierType": "DOI", "identifier": "10.1000/ABC.1"}""".formatted(indicator))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].achievementId").value(id))
                .andExpect(jsonPath("$[0].match").value("STRICT"));
        mvc.perform(get("/api/achievements").param("scope", "my").session(coauthor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Своё не проверяют; утверждение только после проверки
        send(employee, url + "/review", "{}").andExpect(status().isForbidden());
        MockHttpSession director = login("director", PASSWORD);
        send(director, url + "/approve", "{}").andExpect(status().isConflict());
        mvc.perform(get("/api/achievements").param("scope", "approval").session(director))
                .andExpect(jsonPath("$.length()").value(0));

        MockHttpSession rop = login("rop", PASSWORD);
        mvc.perform(get("/api/achievements").param("scope", "review").session(rop))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        send(rop, url + "/review", "{\"comment\": \"Проверено по сайту журнала\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REVIEWED"));

        mvc.perform(get("/api/achievements").param("scope", "approval").session(director))
                .andExpect(jsonPath("$.length()").value(1));
        send(director, url + "/approve", "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.history.length()").value(4));
        send(director, url + "/return", "{\"comment\": \"Поздно\"}").andExpect(status().isConflict());

        // Баллы: утверждённые доли сотрудников, внешнему автору ничего не начисляется
        mvc.perform(get("/api/scores/my").param("periodId", String.valueOf(period)).session(employee))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedTotal").value(5.0))
                .andExpect(jsonPath("$.onReviewTotal").value(0.0))
                .andExpect(jsonPath("$.rows[0].indicatorCode").value("П-1"))
                .andExpect(jsonPath("$.rows[0].count").value(1));
        mvc.perform(get("/api/scores/my").param("periodId", String.valueOf(period)).session(coauthor))
                .andExpect(jsonPath("$.approvedTotal").value(5.0));
        mvc.perform(get("/api/scores/users/" + ivanov).param("periodId", String.valueOf(period)).session(director))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedTotal").value(5.0));
        mvc.perform(get("/api/scores/users/" + ivanov).param("periodId", String.valueOf(period)).session(coauthor))
                .andExpect(status().isForbidden());

        // Закрытый период: новых записей нет
        send(admin, "/api/periods/" + period + "/close", "").andExpect(status().isOk());
        send(employee, "/api/achievements", achievement(indicator, period, "10.1000/other", "[]"))
                .andExpect(status().isConflict());
    }
}
