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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
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
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @BeforeEach
    void ensureSignatures() throws Exception {
        ensureSignature("LANDLORD", "Signature bailleur", seededId("/api/landlords"));
        ensureSignature("ENTREPRISE_CEO", "Signature gérant", null);
    }

    private void ensureSignature(String type, String name, Long landlordId) throws Exception {
        String list = mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<?> existing = JsonPath.read(list, "$[?(@.type == '" + type + "')]");
        if (existing.isEmpty()) {
            var request = multipart("/api/signatures")
                    .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                    .param("type", type)
                    .param("name", name);
            if (landlordId != null) {
                request.param("landlordId", String.valueOf(landlordId));
            }
            mockMvc.perform(request).andExpect(status().isCreated());
        }
    }

    @Test
    @DisplayName("Covers the full flow: settings, rent receipt, expense statement, receipt, templates, LLM")
    void fullFlow() throws Exception {
        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proRataBase").value("35.71"))
                .andExpect(jsonPath("$.rentExclCharges").doesNotExist())
                .andExpect(jsonPath("$.landlordName").doesNotExist())
                .andExpect(jsonPath("$.tenantName").doesNotExist());
                .andExpect(jsonPath("$.rentExclCharges").doesNotExist())
                .andExpect(jsonPath("$.landlordName").doesNotExist())
                .andExpect(jsonPath("$.tenantName").doesNotExist());

        mockMvc.perform(get("/api/expense-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));

        mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Nom du bailleur"));
        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Nom du locataire"));
        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].landlordName").value("Nom du bailleur"))
                .andExpect(jsonPath("$[0].tenantName").value("Nom du locataire"))
                .andExpect(jsonPath("$[0].propertyAddress").value("12 rue de la République, 75000 Paris"))
                .andExpect(jsonPath("$[0].rentExclCharges").value("1300.00"))
                .andExpect(jsonPath("$[0].charges").value("0.00"));
        long landlordId = seededId("/api/landlords");
        long tenantId = seededId("/api/tenants");

        String rentReceipt = mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2026-11","landlordId":%d,"tenantId":%d}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.total").value("1300.00"))
                .andExpect(jsonPath("$.landlordId").value(landlordId))
                .andExpect(jsonPath("$.tenantId").value(tenantId))
                .andExpect(jsonPath("$.landlordName").value("Nom du bailleur"))
                .andExpect(jsonPath("$.tenantName").value("Nom du locataire"))
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
                                {"month":"2026-12","landlordId":%d,"tenantId":%d}
                                """.formatted(landlordId, tenantId)))
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

    @Test
    @DisplayName("An expense line is claimed in full for the statement month, whatever its length")
    void monthlyAmountDoesNotDependOnMonthLength() throws Exception {
        for (String month : List.of("2026-02", "2028-02", "2026-04", "2026-11")) {
            mockMvc.perform(post("/api/expense-statements/calculation")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"month":"%s","lines":[
                                      {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71",
                                       "periodStart":"2026-09-01","periodEnd":"2026-10-31"}
                                    ]}
                                    """.formatted(month)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.lines[0].monthlyAmount").value("80.00"))
                    .andExpect(jsonPath("$.lines[0].claimedAmount").value("28.57"))
                    .andExpect(jsonPath("$.lines[0].periodStart").doesNotExist())
                    .andExpect(jsonPath("$.lines[0].periodEnd").doesNotExist())
                    .andExpect(jsonPath("$.total").value("28.57"));
        }
    }

    @Test
    @DisplayName("Expense lines follow the configured expense item order, not the request order")
    void expenseLinesFollowConfiguredOrder() throws Exception {
        String statementJson = """
                {
                  "month":"2027-03",
                  "lines":[
                    {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71"},
                    {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"}
                  ]
                }
                """;

        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statementJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].itemCode").value("loyer"))
                .andExpect(jsonPath("$.lines[0].claimedAmount").value("950.00"))
                .andExpect(jsonPath("$.lines[1].itemCode").value("gaz"))
                .andExpect(jsonPath("$.lines[1].claimedAmount").value("28.57"))
                .andExpect(jsonPath("$.total").value("978.57"));

        mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statementJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.lines[0].itemCode").value("loyer"))
                .andExpect(jsonPath("$.lines[0].claimedAmount").value("950.00"))
                .andExpect(jsonPath("$.lines[1].itemCode").value("gaz"))
                .andExpect(jsonPath("$.lines[1].claimedAmount").value("28.57"));
    }

    @Test
    @DisplayName("The complete ZIP bundles the note, the active rent receipt and each original justificatif once")
    void expenseStatementZipBundlesDocuments() throws Exception {
        long landlordId = seededId("/api/landlords");
        long tenantId = seededId("/api/tenants");
        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-05","landlordId":%d,"tenantId":%d}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated());

        byte[] originalReceipt = "EDF - Gaz\nTotal TTC : 78,00 EUR\n".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "facture-gaz.txt", "text/plain", originalReceipt);
        String receipt = mockMvc.perform(multipart("/api/receipts").file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long receiptId = ((Number) JsonPath.read(receipt, "$.id")).longValue();

        // The same receipt is attached to two lines: it must appear once in the archive.
        String statementJson = """
                {
                  "month":"2027-05",
                  "lines":[
                    {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71","receiptId":%d},
                    {"itemCode":"electricite","amountInclVat":"50.00","proRataPct":"35,71","receiptId":%d}
                  ]
                }
                """.formatted(receiptId, receiptId);
        String statement = mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statementJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long statementId = ((Number) JsonPath.read(statement, "$.id")).longValue();

        MvcResult zipResult = mockMvc.perform(get("/api/expense-statements/{id}/zip", statementId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/zip"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers
                        .containsString("attachment; filename=\"note_frais_2027-05_complet.zip\"")))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();

        Map<String, byte[]> entries = unzip(zipResult.getResponse().getContentAsByteArray());
        assertThat(entries).containsKeys(
                "note_frais_2027-05.pdf",
                "quittance_2027-05.pdf",
                "justificatifs/01_facture-gaz.txt");
        assertThat(entries.keySet().stream().filter(name -> name.startsWith("justificatifs/")).count()).isEqualTo(1);
        assertThat(entries.get("note_frais_2027-05.pdf")).startsWith("%PDF".getBytes(StandardCharsets.US_ASCII));
        assertThat(entries.get("quittance_2027-05.pdf")).startsWith("%PDF".getBytes(StandardCharsets.US_ASCII));
        assertThat(entries.get("justificatifs/01_facture-gaz.txt")).isEqualTo(originalReceipt);
        assertThat(pdfText(entries.get("note_frais_2027-05.pdf")))
                .contains("NOTE DE FRAIS D'OCCUPATION")
                .doesNotContain("QUITTANCE DE LOYER");
        assertThat(pdfText(entries.get("quittance_2027-05.pdf"))).contains("QUITTANCE DE LOYER");

        // The archive holds the note-only PDF, not the merged full PDF used by "Ouvrir".
        MvcResult noteOnly = mockMvc.perform(get("/api/expense-statements/{id}/pdf", statementId))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(entries.get("note_frais_2027-05.pdf"))
                .isEqualTo(noteOnly.getResponse().getContentAsByteArray());
        MvcResult complete = mockMvc.perform(get("/api/expense-statements/{id}/pdf", statementId)
                        .param("complete", "true"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(entries.get("note_frais_2027-05.pdf"))
                .isNotEqualTo(complete.getResponse().getContentAsByteArray());
    }

    @Test
    @DisplayName("Several receipts stay ACTIVE in one month and versions are per landlord and tenant pair")
    void multipleActiveRentReceipts() throws Exception {
        long landlordId = seededId("/api/landlords");
        long tenantId = seededId("/api/tenants");

        String first = mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-09","landlordId":%d,"tenantId":%d}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn().getResponse().getContentAsString();
        long firstId = ((Number) JsonPath.read(first, "$.id")).longValue();

        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-09","landlordId":%d,"tenantId":%d}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // The first generation is not archived any more: both receipts stay ACTIVE.
        mockMvc.perform(get("/api/rent-receipts/{id}", firstId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.version").value(1));

        mockMvc.perform(get("/api/rent-receipts/active")
                        .param("month", "2027-09")
                        .param("landlordId", String.valueOf(landlordId))
                        .param("tenantId", String.valueOf(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/rent-receipts/active").param("month", "2027-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(2));

        // A second pair gets its own version sequence in the same month.
        String secondLandlord = mockMvc.perform(post("/api/landlords")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bailleur quittance multiple","address":"8 rue du Test, 75003 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long secondLandlordId = ((Number) JsonPath.read(secondLandlord, "$.id")).longValue();
        String secondTenant = mockMvc.perform(post("/api/tenants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Locataire quittance multiple","address":"8 rue du Test, 75003 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long secondTenantId = ((Number) JsonPath.read(secondTenant, "$.id")).longValue();
        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"landlordId":%d,"tenantId":%d,"propertyAddress":"8 rue du Test, 75003 Paris",
                                 "rentExclCharges":"700.00"}
                                """.formatted(secondLandlordId, secondTenantId)))
                .andExpect(status().isCreated());

        String secondSignature = mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature-bailleur-2.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("landlordId", String.valueOf(secondLandlordId))
                        .param("name", "Signature autre bailleur"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long secondSignatureId = ((Number) JsonPath.read(secondSignature, "$.id")).longValue();

        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-09","landlordId":%d,"tenantId":%d}
                                """.formatted(secondLandlordId, secondTenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/rent-receipts").param("month", "2027-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.status != 'ACTIVE')]").isEmpty());

        mockMvc.perform(get("/api/rent-receipts/active")
                        .param("month", "2027-09")
                        .param("landlordId", String.valueOf(secondLandlordId))
                        .param("tenantId", String.valueOf(secondTenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.total").value("700.00"));

        // A signature linked to another landlord is refused in French.
        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-09","landlordId":%d,"tenantId":%d,"signatureId":%d}
                                """.formatted(landlordId, tenantId, secondSignatureId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "La signature sélectionnée n'appartient pas à ce bailleur."));

        // Keep the other integration tests isolated from the directory created here.
        String leases = mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> secondLeaseIds = JsonPath.read(leases,
                "$[?(@.landlordId == " + secondLandlordId + ")].id");
        for (Number leaseId : secondLeaseIds) {
            mockMvc.perform(delete("/api/leases/{id}", leaseId.longValue()))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(delete("/api/signatures/{id}", secondSignatureId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/tenants/{id}", secondTenantId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/landlords/{id}", secondLandlordId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Landlord, tenant and lease CRUD enforces logical deletion and one active lease per pair")
    void rentConfigurationCrud() throws Exception {
        String landlord = mockMvc.perform(post("/api/landlords")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bailleur secondaire","address":"2 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bailleur secondaire"))
                .andReturn().getResponse().getContentAsString();
        long newLandlordId = ((Number) JsonPath.read(landlord, "$.id")).longValue();

        mockMvc.perform(put("/api/landlords/{id}", newLandlordId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bailleur secondaire","address":"4 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address").value("4 rue du Test, 75001 Paris"));

        mockMvc.perform(post("/api/tenants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Locataire secondaire","address":"5 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated());
        long newTenantId = seededId("/api/tenants", "Locataire secondaire");

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"landlordId":999999,"tenantId":%d,"propertyAddress":"3 rue du Bail",
                                 "rentExclCharges":"1000.00","charges":"80.00"}
                                """.formatted(newTenantId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bailleur introuvable."));

        String lease = mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"landlordId":%d,"tenantId":%d,"propertyAddress":"3 rue du Bail, 75002 Paris",
                                 "rentExclCharges":"1000.00","charges":"80.00"}
                                """.formatted(newLandlordId, newTenantId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.propertyAddress").value("3 rue du Bail, 75002 Paris"))
                .andExpect(jsonPath("$.rentExclCharges").value("1000.00"))
                .andExpect(jsonPath("$.charges").value("80.00"))
                .andReturn().getResponse().getContentAsString();
        long leaseId = ((Number) JsonPath.read(lease, "$.id")).longValue();

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"landlordId":%d,"tenantId":%d,"propertyAddress":"Autre bien",
                                 "rentExclCharges":"1200.00"}
                                """.formatted(newLandlordId, newTenantId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Un bail actif existe déjà pour ce bailleur et ce locataire."));

        mockMvc.perform(delete("/api/landlords/{id}", newLandlordId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé."));
        mockMvc.perform(delete("/api/tenants/{id}", newTenantId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Ce locataire est utilisé par un bail actif et ne peut pas être supprimé."));

        mockMvc.perform(delete("/api/leases/{id}", leaseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-08","landlordId":%d,"tenantId":%d}
                                """.formatted(newLandlordId, newTenantId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Aucun bail actif pour ce bailleur et ce locataire. Créez un bail dans la page Configuration."));
        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2027-08"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Sélectionnez un bailleur et un locataire."));

        mockMvc.perform(delete("/api/landlords/{id}", newLandlordId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/tenants/{id}", newTenantId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/landlords/{id}", newLandlordId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bailleur introuvable."));

        mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Bailleur secondaire')]").isEmpty());
        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Locataire secondaire')]").isEmpty());
        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.propertyAddress == '3 rue du Bail, 75002 Paris')]").isEmpty());
    }

    private long seededId(String path) throws Exception {
        String body = mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$[0].id")).longValue();
    }

    private long seededId(String path, String name) throws Exception {
        String body = mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Map<String, Object>> matches = JsonPath.read(body, "$[?(@.name == '" + name + "')]");
        return ((Number) matches.get(0).get("id")).longValue();
    }

    private static Map<String, byte[]> unzip(byte[] archive) throws IOException {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(archive), StandardCharsets.UTF_8)) {
            ZipEntry entry = in.getNextEntry();
            while (entry != null) {
                entries.put(entry.getName(), in.readAllBytes());
                entry = in.getNextEntry();
            }
        }
        return entries;
    }

    private static String pdfText(byte[] pdf) throws IOException {
        try (PDDocument document = PDDocument.load(pdf)) {
            return new PDFTextStripper().getText(document);
        }
    }
}
