package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Parcourt le flux complet : paramètres, quittance, note de frais, justificatif, templates, LLM")
    void fluxComplete() throws Exception {
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proRataBase").value("35.71"))
                .andExpect(jsonPath("$.rentExclCharges").value("900.00"));

        mockMvc.perform(get("/api/expense-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));

        String rentReceipt = mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2026-11"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.total").value("950.00"))
                .andExpect(jsonPath("$.periodStart").value("2026-11-01"))
                .andExpect(jsonPath("$.periodEnd").value("2026-11-30"))
                .andReturn().getResponse().getContentAsString();
        long rentReceiptId = ((Number) JsonPath.read(rentReceipt, "$.id")).longValue();

        MvcResult pdf = mockMvc.perform(get("/api/rent-receipts/{id}/pdf", rentReceiptId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("quittance_2026-11.pdf")))
                .andReturn();
        assertThat(pdf.getResponse().getContentAsByteArray()).startsWith("%PDF".getBytes(StandardCharsets.US_ASCII));

        mockMvc.perform(post("/api/rent-receipts/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2026-12"}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        mockMvc.perform(get("/api/rent-receipts").param("month", "2026-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        MockMultipartFile file = new MockMultipartFile("file", "facture-gaz.txt", "text/plain",
                "EDF - Gaz\nTotal TTC : 78,00 EUR\n".getBytes(StandardCharsets.UTF_8));
        String receipt = mockMvc.perform(multipart("/api/receipts").file(file))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("facture-gaz.txt"))
                .andReturn().getResponse().getContentAsString();
        long receiptId = ((Number) JsonPath.read(receipt, "$.id")).longValue();

        mockMvc.perform(get("/api/receipts/{id}/file", receiptId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN));

        String statementJson = """
                {
                  "month":"2026-11",
                  "lines":[
                    {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"},
                    {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71","receiptId":%d}
                  ]
                }
                """.formatted(receiptId);

        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statementJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value("978.57"))
                .andExpect(jsonPath("$.lines[1].claimedAmount").value("28.57"))
                .andExpect(jsonPath("$.lines[1].receiptName").value("facture-gaz.txt"))
                .andExpect(jsonPath("$.totalInWords")
                        .value("neuf cent soixante-dix-huit euros et cinquante-sept centimes"));

        mockMvc.perform(post("/api/expense-statements/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2026-11","complete":true,"lines":[
                                  {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"},
                                  {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71"}
                                ]}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        String statement = mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statementJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.number").value("NF-2026-11"))
                .andExpect(jsonPath("$.total").value("978.57"))
                .andExpect(jsonPath("$.fullPdfAvailable").value(true))
                .andReturn().getResponse().getContentAsString();
        long statementId = ((Number) JsonPath.read(statement, "$.id")).longValue();

        MvcResult complete = mockMvc.perform(get("/api/expense-statements/{id}/pdf", statementId)
                        .param("complete", "true"))
                .andExpect(status().isOk())
                .andReturn();
        try (PDDocument document = PDDocument.load(complete.getResponse().getContentAsByteArray())) {
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(3);
        }

        mockMvc.perform(delete("/api/receipts/{id}", receiptId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé."));

        mockMvc.perform(get("/api/templates").param("type", "EXPENSE_STATEMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].builtIn").value(true))
                .andExpect(jsonPath("$[0].active").value(true));

        mockMvc.perform(get("/api/templates/default/RENT_RECEIPT"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("QUITTANCE DE LOYER")));

        mockMvc.perform(post("/api/templates/{id}/preview", 1))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        mockMvc.perform(get("/api/admin/llm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(false))
                .andExpect(jsonPath("$.apiKeyConfigured").value(false));

        mockMvc.perform(put("/api/admin/llm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"https://llm.exemple.fr","apiKey":"secret-de-test"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(true))
                .andExpect(jsonPath("$.warning").isNotEmpty())
                .andExpect(jsonPath("$.apiKeyConfigured").value(true));

        String config = mockMvc.perform(get("/api/admin/llm"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(config).doesNotContain("secret-de-test");

        mockMvc.perform(put("/api/admin/llm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"http://localhost:11434","apiKey":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remoteUrl").value(false))
                .andExpect(jsonPath("$.apiKeyConfigured").value(false));

        mockMvc.perform(get("/api/rent-receipts/{id}", 999_999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Ressource introuvable"))
                .andExpect(jsonPath("$.detail").value("Quittance introuvable."));
    }
}
