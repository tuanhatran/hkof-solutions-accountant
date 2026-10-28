package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

/**
 * Contract guard for the persisted form drafts: save, reload by scope, logical
 * replacement and deletion, with server-side validation.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentDraftIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String RENT_BODY = """
            {
              "month": "%s",
              "landlordId": 4,
              "tenantId": 7,
              "periodStart": "2026-01-01",
              "periodEnd": "2026-01-31",
              "rentExclCharges": "1 300,00",
              "charges": "50",
              "paymentDate": "2026-01-05",
              "issueDate": "2026-01-05",
              "templateId": 9
            }
            """;

    private static final String STATEMENT_BODY = """
            {
              "companyId": 3,
              "month": "%s",
              "templateId": 9,
              "complete": true,
              "lines": [
                {"itemCode": "gaz", "amountInclVat": "80,00", "proRataPct": "100",
                 "receiptId": 5, "amountSource": "MANUAL"}
              ]
            }
            """;

    private String saveRentReceipt(String month) throws Exception {
        return mockMvc.perform(put("/api/drafts/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(RENT_BODY.formatted(month)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value(month))
                .andExpect(jsonPath("$.rentExclCharges").value("1300.00"))
                .andExpect(jsonPath("$.tenantId").value(7))
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("Saves a rent receipt draft and reloads it for the same pair and month")
    void savesAndReloadsRentReceiptDraft() throws Exception {
        String created = saveRentReceipt("2026-01");
        Number id = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-01")
                        .param("landlordId", "4")
                        .param("tenantId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.intValue()))
                .andExpect(jsonPath("$.charges").value("50.00"))
                .andExpect(jsonPath("$.templateId").value(9));

        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-01")
                        .param("landlordId", "4")
                        .param("tenantCompanyId", "7"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Each save replaces the active rent receipt draft of the same scope")
    void replacesRentReceiptDraft() throws Exception {
        Number first = JsonPath.read(saveRentReceipt("2026-02"), "$.id");
        Number second = JsonPath.read(saveRentReceipt("2026-02"), "$.id");

        org.assertj.core.api.Assertions.assertThat(second.longValue()).isNotEqualTo(first.longValue());
        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-02")
                        .param("landlordId", "4")
                        .param("tenantId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(second.intValue()));
    }

    @Test
    @DisplayName("Saves, reloads and logically deletes an expense statement draft")
    void savesAndDeletesStatementDraft() throws Exception {
        String created = mockMvc.perform(put("/api/drafts/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(STATEMENT_BODY.formatted("2026-03")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyId").value(3))
                .andExpect(jsonPath("$.complete").value(true))
                .andExpect(jsonPath("$.lines[0].amountInclVat").value("80.00"))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", "3")
                        .param("month", "2026-03"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.intValue()));

        mockMvc.perform(delete("/api/drafts/{id}", id.longValue()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", "3")
                        .param("month", "2026-03"))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/drafts/{id}", id.longValue()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DRAFT_NOT_FOUND"));
    }

    @Test
    @DisplayName("Rejects a draft scope with two tenants or an invalid line amount")
    void rejectsInvalidDrafts() throws Exception {
        mockMvc.perform(put("/api/drafts/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2026-04","landlordId":4,"tenantId":7,"tenantCompanyId":8,
                                 "periodStart":"2026-04-01","periodEnd":"2026-04-30",
                                 "rentExclCharges":"900.00","charges":"0.00",
                                 "paymentDate":"2026-04-05","issueDate":"2026-04-05"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("DRAFT_TENANT_REQUIRED"));

        mockMvc.perform(put("/api/drafts/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":3,"month":"2026-04","lines":[
                                  {"itemCode":"gaz","amountInclVat":"abc","proRataPct":"100"}
                                ]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("AMOUNT_INVALID"));
    }
}
