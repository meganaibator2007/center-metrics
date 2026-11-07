package ru.fa.kpi.common;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/** Экраны React открываются по прямой ссылке. В тестах index.html — заглушка из test/resources. */
@WebMvcTest(CsrfController.class)
@Import(SecurityConfig.class)
class SpaConfigTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void clientRouteReturnsIndexHtml() throws Exception {
        mvc.perform(get("/admin/users"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("test-index")));
    }

    @Test
    void existingFileIsServedAsIs() throws Exception {
        mvc.perform(get("/openapi.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("openapi: 3.1.0")));
    }

    @Test
    void missingFileWithExtensionReturns404() throws Exception {
        mvc.perform(get("/assets/missing.js"))
                .andExpect(status().isNotFound());
    }
}
