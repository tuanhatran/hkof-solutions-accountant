package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

/**
 * Regression guard for the active statement endpoint: the DTO is mapped outside the
 * original transaction ({@code spring.jpa.open-in-view} is disabled), so the active query
 * must return a fully initialized statement.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExpenseStatementActiveIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @BeforeEach
    void ensureSignature() throws Exception {
        String list = mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<?> existing = JsonPath.read(list, "$[?(@.type == 'ENTREPRISE_CEO')]");
        if (existing.isEmpty()) {
            mockMvc.perform(multipart("/api/signatures")
                            .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                            .param("type", "ENTREPRISE_CEO")
                            .param("employeeId", String.valueOf(ceoEmployeeId()))
                            .param("name", "Signature gérant"))
                    .andExpect(status().isCreated());
        }
    }

    private long ceoEmployeeId() throws Exception {
        String companies = mockMvc.perform(get("/api/companies"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long companyId = ((Number) JsonPath.read(companies, "$[0].id")).longValue();
        String body = mockMvc.perform(get("/api/companies/{companyId}/employees", companyId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$[0].id")).longValue();
    }

    @Test
    @DisplayName("Returns the active statement with its lines and amounts")
    void activeStatementReturnsLines() throws Exception {
        String companies = mockMvc.perform(get("/api/companies"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long companyId = ((Number) JsonPath.read(companies, "$[0].id")).longValue();

        mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-05","lines":[
                                  {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/expense-statements/active")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-05"))
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.total").value("950.00"))
                .andExpect(jsonPath("$.lines.length()").value(1))
                .andExpect(jsonPath("$.lines[0].itemCode").value("loyer"))
                .andExpect(jsonPath("$.lines[0].claimedAmount").value("950.00"));
    }
}
