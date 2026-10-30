package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;

/**
 * Two authenticated accounts each generate a rent receipt and an expense statement: every
 * list, active lookup, read and download stays inside the owner account, and a guessed
 * foreign document or company identifier answers 404.
 */
@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserDocumentIsolationIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String CSRF_HEADER = "X-XSRF-TOKEN";
    private static final String PASSWORD = "motdepasse-documents";
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    @DisplayName("Rent receipts and expense statements stay owned, listed and downloadable per account")
    void isolatesGeneratedDocuments() throws Exception {
        Session a = sessionFor("documents.a@example.test");
        Session b = sessionFor("documents.b@example.test");
        long aOwner = ownerId("documents.a@example.test");
        long bOwner = ownerId("documents.b@example.test");

        Documents aDocs = generate(a, "Alpha", "2026-03");
        Documents bDocs = generate(b, "Bêta", "2026-03");

        // Each creation stamps the account on the root, its additional charges and its lines.
        assertThat(ownedRows("rent_receipt", "id", aDocs.rentReceiptId(), aOwner)).isEqualTo(1);
        assertThat(ownedRows("rent_receipt_additional_charge", "rent_receipt_id", aDocs.rentReceiptId(), aOwner))
                .isEqualTo(1);
        assertThat(ownedRows("expense_statement", "id", aDocs.statementId(), aOwner)).isEqualTo(1);
        assertThat(ownedRows("expense_line", "statement_id", aDocs.statementId(), aOwner)).isEqualTo(1);

        // Lists and counts only expose the owner rows, with and without the company filter.
        assertThat(listedIds(a, "/api/rent-receipts")).containsExactly(aDocs.rentReceiptId());
        assertThat(listedIds(b, "/api/rent-receipts")).containsExactly(bDocs.rentReceiptId());
        assertThat(listedIds(a, "/api/rent-receipts?month=2026-03&companyId=" + aDocs.companyId()))
                .containsExactly(aDocs.rentReceiptId());
        assertThat(listedIds(b, "/api/expense-statements?companyId=" + bDocs.companyId()))
                .containsExactly(bDocs.statementId());
        assertThat(listedIds(a, "/api/expense-statements?companyId=" + aDocs.companyId()))
                .containsExactly(aDocs.statementId());

        // A foreign document id is a 404 on every read and download path.
        mockMvc.perform(get("/api/rent-receipts/{id}", aDocs.rentReceiptId()).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RENT_RECEIPT_NOT_FOUND"));
        mockMvc.perform(get("/api/rent-receipts/{id}/pdf", aDocs.rentReceiptId()).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RENT_RECEIPT_NOT_FOUND"));
        mockMvc.perform(get("/api/expense-statements/{id}", aDocs.statementId()).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STATEMENT_NOT_FOUND"));
        mockMvc.perform(get("/api/expense-statements/{id}/pdf", aDocs.statementId()).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STATEMENT_NOT_FOUND"));
        mockMvc.perform(get("/api/expense-statements/{id}/zip", aDocs.statementId()).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("STATEMENT_NOT_FOUND"));

        // The owner still reads and downloads its own documents.
        mockMvc.perform(get("/api/rent-receipts/{id}/pdf", aDocs.rentReceiptId()).session(a.http()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        mockMvc.perform(get("/api/expense-statements/{id}/pdf", aDocs.statementId()).session(a.http()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        mockMvc.perform(get("/api/expense-statements/{id}/zip", aDocs.statementId()).session(a.http()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/zip"));

        // Active lookups of a foreign company and the draft read path answer 404.
        mockMvc.perform(get("/api/rent-receipts/active").param("month", "2026-03")
                        .param("companyId", String.valueOf(aDocs.companyId())).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(get("/api/expense-statements/active").param("month", "2026-03")
                        .param("companyId", String.valueOf(aDocs.companyId())).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/expense-statements/draft"), b)
                        .param("companyId", String.valueOf(aDocs.companyId())).param("month", "2026-03"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));

        // Generation cannot attach to a foreign company or a foreign lease pair.
        mockMvc.perform(mutation(post("/api/expense-statements"), b).contentType(JSON)
                        .content(statementBody(aDocs.companyId(), "2026-04")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/rent-receipts"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-04","landlordId":%d,"tenantId":%d}
                                """.formatted(aDocs.landlordId(), aDocs.tenantId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("LEASE_ACTIVE_NOT_FOUND"));

        // The owner sees its own active documents.
        mockMvc.perform(get("/api/rent-receipts/active").param("month", "2026-03")
                        .param("companyId", String.valueOf(bDocs.companyId())).session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bDocs.rentReceiptId()));
        mockMvc.perform(get("/api/expense-statements/active").param("month", "2026-03")
                        .param("companyId", String.valueOf(bDocs.companyId())).session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bDocs.statementId()));
    }

    @Test
    @DisplayName("Signatures and person-scoped document generation stay isolated per account")
    void isolatesSignaturesAndPersonsInDocuments() throws Exception {
        Session a = sessionFor("documents.shared.a@example.test");
        Session b = sessionFor("documents.shared.b@example.test");

        long aCompanyId = id(created(a, "/api/companies", """
                {"name":"Alpha Partagée","legalForm":"SARL","address":"1 rue Alpha","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """));
        long aLandlordId = id(created(a, "/api/persons",
                "{\"name\":\"Bailleur Alpha\",\"address\":\"1 rue Bailleur\"}"));
        long aTenantId = id(created(a, "/api/persons",
                "{\"name\":\"Locataire Alpha\",\"address\":\"2 rue Locataire\"}"));
        created(a, "/api/leases",
                leaseBody(aLandlordId, aTenantId, aCompanyId, "12 rue Alpha, 75002 Paris"));
        long aEmployeeId = id(created(a, "/api/companies/" + aCompanyId + "/employees", """
                {"firstName":"Gérant","lastName":"Alpha","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """));
        long aLandlordSig = signature(a, aLandlordId, "Signature bailleur Alpha");
        long aCeoSig = signature(a, aEmployeeId, "Signature gérant Alpha");

        long bCompanyId = id(created(b, "/api/companies", """
                {"name":"Bêta Partagée","legalForm":"SARL","address":"2 rue Bêta","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """));
        long bLandlordId = id(created(b, "/api/persons",
                "{\"name\":\"Bailleur Bêta\",\"address\":\"1 rue Bailleur\"}"));
        long bTenantId = id(created(b, "/api/persons",
                "{\"name\":\"Locataire Bêta\",\"address\":\"2 rue Locataire\"}"));
        created(b, "/api/leases", leaseBody(bLandlordId, bTenantId, bCompanyId, "14 rue Bêta, 75003 Paris"));
        long bEmployeeId = id(created(b, "/api/companies/" + bCompanyId + "/employees", """
                {"firstName":"Gérant","lastName":"Bêta","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """));
        long bLandlordSig = signature(b, bLandlordId, "Signature bailleur Bêta");
        created(b, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"Gaz Bêta","supplier":"Fournisseur",
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(bCompanyId));

        // B cannot list, create, read image, or delete signatures on A's person or A's signature id.
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(aLandlordId)).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PERSON_NOT_FOUND"));
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(aEmployeeId)).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PERSON_NOT_FOUND"));
        MockMultipartHttpServletRequestBuilder foreignUpload = multipart("/api/signatures");
        foreignUpload.file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                .param("personId", String.valueOf(aLandlordId))
                .param("name", "Usurpée")
                .session(b.http())
                .cookie(b.csrf())
                .header(CSRF_HEADER, b.csrf().getValue());
        mockMvc.perform(foreignUpload)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PERSON_NOT_FOUND"));
        mockMvc.perform(get("/api/signatures/{id}/image", aLandlordSig).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SIGNATURE_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/signatures/{id}", aLandlordSig), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SIGNATURE_NOT_FOUND"));

        // B cannot pass A's signatureId to rent receipt or expense statement preview/generation.
        mockMvc.perform(mutation(post("/api/rent-receipts"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-05","companyId":%d,"landlordId":%d,"tenantId":%d,"signatureId":%d}
                                """.formatted(bCompanyId, bLandlordId, bTenantId, aLandlordSig)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SIGNATURE_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/rent-receipts/preview"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-05","companyId":%d,"landlordId":%d,"tenantId":%d,"signatureId":%d}
                                """.formatted(bCompanyId, bLandlordId, bTenantId, aLandlordSig)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SIGNATURE_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/expense-statements"), b).contentType(JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-05","signatureId":%d,
                                 "lines":[{"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71"}]}
                                """.formatted(bCompanyId, aCeoSig)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("SIGNATURE_NOT_FOUND"));

        // B sees only its own signature on its landlord.
        assertThat(listedIds(b, "/api/signatures?personId=" + bLandlordId)).containsExactly(bLandlordSig);
        assertThat(listedIds(b, "/api/signatures?personId=" + bEmployeeId)).isEmpty();
    }

    @Test
    @DisplayName("Templates stay isolated per account: uploads, activation, reset, delete, distinct files, and 404 on foreign template")
    void isolatesTemplatesAndUploads() throws Exception {
        Session a = sessionFor("templates.a@example.test");
        Session b = sessionFor("templates.b@example.test");
        long aOwner = ownerId("templates.a@example.test");
        long bOwner = ownerId("templates.b@example.test");

        created(a, "/api/companies", """
                {"name":"Alpha Templates","legalForm":"SARL","address":"1 rue Alpha","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """);

        byte[] validHtmlA = ("<!DOCTYPE html><html><body><h1>Quittance A</h1>"
                + "<p>{{bailleur.nom}}</p><p>{{locataire.nom}}</p><p>{{total}}</p></body></html>")
                .getBytes(StandardCharsets.UTF_8);
        MockMultipartFile fileA = new MockMultipartFile("file", "modele-a.html", "text/html", validHtmlA);
        MockMultipartHttpServletRequestBuilder uploadA = multipart("/api/templates");
        uploadA.file(fileA)
                .param("type", "RENT_RECEIPT")
                .param("name", "Modèle Alpha")
                .session(a.http())
                .cookie(a.csrf())
                .header(CSRF_HEADER, a.csrf().getValue());
        MvcResult resA = mockMvc.perform(uploadA).andExpect(status().isCreated()).andReturn();
        long aTemplateId = id(resA);
        int aVersion = JsonPath.read(resA.getResponse().getContentAsString(), "$.version");
        assertThat(aVersion).isEqualTo(2);

        byte[] validHtmlB = ("<!DOCTYPE html><html><body><h1>Quittance B</h1>"
                + "<p>{{bailleur.nom}}</p><p>{{locataire.nom}}</p><p>{{total}}</p></body></html>")
                .getBytes(StandardCharsets.UTF_8);
        MockMultipartFile fileB = new MockMultipartFile("file", "modele-b.html", "text/html", validHtmlB);
        MockMultipartHttpServletRequestBuilder uploadB = multipart("/api/templates");
        uploadB.file(fileB)
                .param("type", "RENT_RECEIPT")
                .param("name", "Modèle Bêta")
                .session(b.http())
                .cookie(b.csrf())
                .header(CSRF_HEADER, b.csrf().getValue());
        MvcResult resB = mockMvc.perform(uploadB).andExpect(status().isCreated()).andReturn();
        long bTemplateId = id(resB);
        int bVersion = JsonPath.read(resB.getResponse().getContentAsString(), "$.version");
        assertThat(bVersion).isEqualTo(2);

        String aFilePath = jdbc.queryForObject("SELECT file_path FROM template_document WHERE id = ?", String.class, aTemplateId);
        String bFilePath = jdbc.queryForObject("SELECT file_path FROM template_document WHERE id = ?", String.class, bTemplateId);
        assertThat(aFilePath).isNotEqualTo(bFilePath);
        assertThat(Path.of(aFilePath)).hasFileName("u" + aOwner + "_rent_receipt_v2.html").exists();
        assertThat(Path.of(bFilePath)).hasFileName("u" + bOwner + "_rent_receipt_v2.html").exists();

        assertThat(listedIds(a, "/api/templates?type=RENT_RECEIPT")).contains(aTemplateId).doesNotContain(bTemplateId);
        assertThat(listedIds(b, "/api/templates?type=RENT_RECEIPT")).contains(bTemplateId).doesNotContain(aTemplateId);

        mockMvc.perform(get("/api/templates/{id}/file", aTemplateId).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/templates/{id}/preview", aTemplateId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/templates/{id}/activate", aTemplateId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/templates/{id}", aTemplateId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));

        long bCompanyId = id(created(b, "/api/companies", """
                {"name":"Bêta Templates","legalForm":"SARL","address":"1 rue Bêta","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """));
        long bLandlordId = id(created(b, "/api/persons", "{\"name\":\"Bailleur Bêta\",\"address\":\"1 rue B\"}"));
        long bTenantId = id(created(b, "/api/persons", "{\"name\":\"Locataire Bêta\",\"address\":\"2 rue B\"}"));
        created(b, "/api/leases", leaseBody(bLandlordId, bTenantId, bCompanyId, "1 rue Bêta, 75001 Paris"));
        long bEmployeeId = id(created(b, "/api/companies/" + bCompanyId + "/employees", """
                {"firstName":"Gérant","lastName":"Bêta","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """));
        signature(b, bLandlordId, "Signature bailleur B");
        signature(b, bEmployeeId, "Signature gérant B");
        created(b, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"Gaz Bêta","supplier":"Fournisseur",
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(bCompanyId));

        mockMvc.perform(mutation(post("/api/rent-receipts"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-06","companyId":%d,"landlordId":%d,"tenantId":%d,"templateId":%d}
                                """.formatted(bCompanyId, bLandlordId, bTenantId, aTemplateId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));

        mockMvc.perform(mutation(post("/api/rent-receipts/preview"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-06","companyId":%d,"landlordId":%d,"tenantId":%d,"templateId":%d}
                                """.formatted(bCompanyId, bLandlordId, bTenantId, aTemplateId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));

        mockMvc.perform(mutation(post("/api/expense-statements"), b).contentType(JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-06","templateId":%d,
                                 "lines":[{"itemCode":"gaz","amountInclVat":"50.00","proRataPct":"35.71"}]}
                                """.formatted(bCompanyId, aTemplateId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));

        mockMvc.perform(mutation(post("/api/expense-statements/preview"), b).contentType(JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-06","templateId":%d}
                                """.formatted(bCompanyId, aTemplateId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TEMPLATE_NOT_FOUND"));

        mockMvc.perform(get("/api/templates/{id}/file", aTemplateId).session(a.http()))
                .andExpect(status().isOk());
        mockMvc.perform(mutation(post("/api/templates/{id}/preview", aTemplateId), a))
                .andExpect(status().isOk());
        mockMvc.perform(mutation(post("/api/templates/{id}/activate", aTemplateId), a))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
        mockMvc.perform(mutation(post("/api/templates/default/RENT_RECEIPT"), a))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
        mockMvc.perform(mutation(delete("/api/templates/{id}", aTemplateId), a))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Two accounts configure and read their LLM config independently")
    void isolatesLlmConfiguration() throws Exception {
        Session a = sessionFor("llm.a@example.test");
        Session b = sessionFor("llm.b@example.test");

        mockMvc.perform(mutation(put("/api/admin/llm"), a).contentType(JSON)
                        .content("""
                                {"model":"model-alpha","temperature":"0.8","active":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("model-alpha"))
                .andExpect(jsonPath("$.temperature").value("0.8"));

        mockMvc.perform(get("/api/admin/llm").session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value(org.hamcrest.Matchers.not("model-alpha")));

        mockMvc.perform(mutation(put("/api/admin/llm"), b).contentType(JSON)
                        .content("""
                                {"model":"model-beta","temperature":"1.2","active":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("model-beta"))
                .andExpect(jsonPath("$.temperature").value("1.2"));

        mockMvc.perform(get("/api/admin/llm").session(a.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.model").value("model-alpha"))
                .andExpect(jsonPath("$.temperature").value("0.8"));
    }

    @Test
    @DisplayName("Receipts, analyses and form drafts stay owned and isolated per account")
    void isolatesReceiptsAnalysesAndDrafts() throws Exception {
        Session a = sessionFor("receipts.a@example.test");
        Session b = sessionFor("receipts.b@example.test");
        long aOwner = ownerId("receipts.a@example.test");
        long bOwner = ownerId("receipts.b@example.test");

        long aCompanyId = id(created(a, "/api/companies", """
                {"name":"Alpha Justificatifs","legalForm":"SARL","address":"1 rue Alpha","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """));
        long aLandlordId = id(created(a, "/api/persons",
                "{\"name\":\"Bailleur Alpha Justif\",\"address\":\"1 rue Bailleur\"}"));
        long aTenantId = id(created(a, "/api/persons",
                "{\"name\":\"Locataire Alpha Justif\",\"address\":\"2 rue Locataire\"}"));
        created(a, "/api/leases",
                leaseBody(aLandlordId, aTenantId, aCompanyId, "12 rue Alpha Justif, 75002 Paris"));
        long aEmployeeId = id(created(a, "/api/companies/" + aCompanyId + "/employees", """
                {"firstName":"Gérant","lastName":"Alpha","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """));
        signature(a, aLandlordId, "Signature bailleur Alpha Justif");
        signature(a, aEmployeeId, "Signature gérant Alpha Justif");
        created(a, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"Gaz Alpha","supplier":"Fournisseur",
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(aCompanyId));

        long bCompanyId = id(created(b, "/api/companies", """
                {"name":"Bêta Justificatifs","legalForm":"SARL","address":"2 rue Bêta","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """));
        long bLandlordId = id(created(b, "/api/persons",
                "{\"name\":\"Bailleur Bêta Justif\",\"address\":\"1 rue Bailleur\"}"));
        long bTenantId = id(created(b, "/api/persons",
                "{\"name\":\"Locataire Bêta Justif\",\"address\":\"2 rue Locataire\"}"));
        created(b, "/api/leases",
                leaseBody(bLandlordId, bTenantId, bCompanyId, "14 rue Bêta Justif, 75003 Paris"));
        long bEmployeeId = id(created(b, "/api/companies/" + bCompanyId + "/employees", """
                {"firstName":"Gérant","lastName":"Bêta","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """));
        signature(b, bLandlordId, "Signature bailleur Bêta Justif");
        signature(b, bEmployeeId, "Signature gérant Bêta Justif");
        created(b, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"Gaz Bêta","supplier":"Fournisseur",
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(bCompanyId));

        // 1. Receipts isolation
        MockMultipartFile fileA = new MockMultipartFile("file", "facture-a.txt", "text/plain",
                "Facture Alpha pour un montant suffisant de test.".getBytes(StandardCharsets.UTF_8));
        MockMultipartHttpServletRequestBuilder uploadReceiptA = multipart("/api/receipts");
        uploadReceiptA.file(fileA).session(a.http()).cookie(a.csrf()).header(CSRF_HEADER, a.csrf().getValue());
        long aReceiptId = id(mockMvc.perform(uploadReceiptA).andExpect(status().isCreated()).andReturn());

        MockMultipartFile fileB = new MockMultipartFile("file", "facture-b.txt", "text/plain",
                "Facture Bêta pour un montant suffisant de test.".getBytes(StandardCharsets.UTF_8));
        MockMultipartHttpServletRequestBuilder uploadReceiptB = multipart("/api/receipts");
        uploadReceiptB.file(fileB).session(b.http()).cookie(b.csrf()).header(CSRF_HEADER, b.csrf().getValue());
        long bReceiptId = id(mockMvc.perform(uploadReceiptB).andExpect(status().isCreated()).andReturn());

        assertThat(ownedRows("receipt", "id", aReceiptId, aOwner)).isEqualTo(1);
        assertThat(ownedRows("receipt", "id", bReceiptId, bOwner)).isEqualTo(1);

        // B cannot read, download, delete, launch analysis, or attach A's receipt in calculation/generation
        mockMvc.perform(get("/api/receipts/{id}", aReceiptId).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
        mockMvc.perform(get("/api/receipts/{id}/file", aReceiptId).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/receipts/{id}", aReceiptId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/receipts/{id}/analysis", aReceiptId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/expense-statements/preview"), b).contentType(JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-07",
                                 "lines":[{"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35.71","receiptId":%d}]}
                                """.formatted(bCompanyId, aReceiptId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
        mockMvc.perform(mutation(post("/api/expense-statements"), b).contentType(JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-07",
                                 "lines":[{"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35.71","receiptId":%d}]}
                                """.formatted(bCompanyId, aReceiptId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));

        // A can read and download its own receipt
        mockMvc.perform(get("/api/receipts/{id}", aReceiptId).session(a.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(aReceiptId));
        mockMvc.perform(get("/api/receipts/{id}/file", aReceiptId).session(a.http()))
                .andExpect(status().isOk());

        // 2. Analyses isolation
        MvcResult analysisResA = mockMvc.perform(mutation(post("/api/receipts/{id}/analysis", aReceiptId), a))
                .andExpect(status().isAccepted())
                .andReturn();
        long aAnalysisId = ((Number) JsonPath.read(analysisResA.getResponse().getContentAsString(), "$.analysisId"))
                .longValue();
        assertThat(ownedRows("document_analysis", "id", aAnalysisId, aOwner)).isEqualTo(1);

        // B cannot read or cancel A's analysis
        mockMvc.perform(get("/api/analyses/{id}", aAnalysisId).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ANALYSIS_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/analyses/{id}", aAnalysisId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ANALYSIS_NOT_FOUND"));

        // A can read its own analysis
        mockMvc.perform(get("/api/analyses/{id}", aAnalysisId).session(a.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(aAnalysisId));

        // Both can delete their own unused receipts
        mockMvc.perform(mutation(delete("/api/receipts/{id}", bReceiptId), b))
                .andExpect(status().isNoContent());

        // 3. Form drafts isolation (including identical synthetic scope keys across accounts)
        String rentDraftA = mockMvc.perform(mutation(put("/api/drafts/rent-receipts"), a).contentType(JSON)
                        .content("""
                                {"month":"2026-07","landlordId":4,"tenantId":7,
                                 "periodStart":"2026-07-01","periodEnd":"2026-07-31",
                                 "rentExclCharges":"1100.00","charges":"40.00",
                                 "paymentDate":"2026-07-05","issueDate":"2026-07-05"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long aRentDraftId = ((Number) JsonPath.read(rentDraftA, "$.id")).longValue();

        String rentDraftB = mockMvc.perform(mutation(put("/api/drafts/rent-receipts"), b).contentType(JSON)
                        .content("""
                                {"month":"2026-07","landlordId":4,"tenantId":7,
                                 "periodStart":"2026-07-01","periodEnd":"2026-07-31",
                                 "rentExclCharges":"1400.00","charges":"60.00",
                                 "paymentDate":"2026-07-05","issueDate":"2026-07-05"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long bRentDraftId = ((Number) JsonPath.read(rentDraftB, "$.id")).longValue();

        assertThat(ownedRows("document_draft", "id", aRentDraftId, aOwner)).isEqualTo(1);
        assertThat(ownedRows("document_draft", "id", bRentDraftId, bOwner)).isEqualTo(1);

        // Each account reloads its own rent receipt draft for the shared synthetic scope
        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-07").param("landlordId", "4").param("tenantId", "7")
                        .session(a.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(aRentDraftId))
                .andExpect(jsonPath("$.rentExclCharges").value("1100.00"));
        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-07").param("landlordId", "4").param("tenantId", "7")
                        .session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bRentDraftId))
                .andExpect(jsonPath("$.rentExclCharges").value("1400.00"));

        // Statement drafts on identical synthetic companyId + month scope across accounts
        String stmtDraftA = mockMvc.perform(mutation(put("/api/drafts/expense-statements"), a).contentType(JSON)
                        .content("""
                                {"companyId":3,"month":"2026-07","complete":true,
                                 "lines":[{"itemCode":"gaz","amountInclVat":"75.00","proRataPct":"100"}]}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long aStmtDraftId = ((Number) JsonPath.read(stmtDraftA, "$.id")).longValue();

        String stmtDraftB = mockMvc.perform(mutation(put("/api/drafts/expense-statements"), b).contentType(JSON)
                        .content("""
                                {"companyId":3,"month":"2026-07","complete":false,
                                 "lines":[{"itemCode":"gaz","amountInclVat":"95.00","proRataPct":"100"}]}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long bStmtDraftId = ((Number) JsonPath.read(stmtDraftB, "$.id")).longValue();

        assertThat(ownedRows("document_draft", "id", aStmtDraftId, aOwner)).isEqualTo(1);
        assertThat(ownedRows("document_draft", "id", bStmtDraftId, bOwner)).isEqualTo(1);

        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", "3").param("month", "2026-07")
                        .session(a.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(aStmtDraftId))
                .andExpect(jsonPath("$.lines[0].amountInclVat").value("75.00"));
        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", "3").param("month", "2026-07")
                        .session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bStmtDraftId))
                .andExpect(jsonPath("$.lines[0].amountInclVat").value("95.00"));

        // B cannot delete A's draft; A can delete its own draft
        mockMvc.perform(mutation(delete("/api/drafts/{id}", aRentDraftId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DRAFT_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/drafts/{id}", aStmtDraftId), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("DRAFT_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/drafts/{id}", aRentDraftId), a))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-07").param("landlordId", "4").param("tenantId", "7")
                        .session(b.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(bRentDraftId));
    }

    private static String leaseBody(long landlordId, long tenantId, long companyId, String address) {
        return """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"companyId":%d,
                 "propertyAddress":"%s","rentExclCharges":"900.00","charges":"50.00"}
                """.formatted(landlordId, tenantId, companyId, address);
    }

    private String receiptPath(long rentReceiptId) {
        return jdbc.queryForObject("SELECT pdf_path FROM rent_receipt WHERE id = ?", String.class, rentReceiptId);
    }

    private byte[] receiptPdf(Session session, long rentReceiptId) throws Exception {
        return mockMvc.perform(get("/api/rent-receipts/{id}/pdf", rentReceiptId).session(session.http()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
    }

    private Documents generate(Session session, String label, String month) throws Exception {
        long companyId = id(created(session, "/api/companies", """
                {"name":"%s Société","legalForm":"SARL","address":"1 rue %s","managerName":"Gérant",
                 "leaseId":null,"issuePlace":"Paris"}
                """.formatted(label, label)));
        long landlordId = id(created(session, "/api/persons",
                "{\"name\":\"Bailleur " + label + "\",\"address\":\"1 rue Bailleur\"}"));
        long tenantId = id(created(session, "/api/persons",
                "{\"name\":\"Locataire " + label + "\",\"address\":\"2 rue Locataire\"}"));
        long leaseId = id(created(session, "/api/leases", """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"companyId":%d,
                 "propertyAddress":"12 rue %s, 75002 Paris","rentExclCharges":"900.00","charges":"50.00"}
                """.formatted(landlordId, tenantId, companyId, label)));
        long employeeId = id(created(session, "/api/companies/" + companyId + "/employees", """
                {"firstName":"Gérant","lastName":"%s","title":"CEO","address":"3 rue Gérant",
                 "issuePlace":"Paris"}
                """.formatted(label)));
        signature(session, landlordId, "Signature bailleur " + label);
        signature(session, employeeId, "Signature gérant " + label);
        created(session, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"Gaz %s","supplier":"Fournisseur",
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(companyId, label));

        long rentReceiptId = id(created(session, "/api/rent-receipts", """
                {"month":"%s","companyId":%d,"landlordId":%d,"tenantId":%d,
                 "additionalCharges":[{"label":"Eau","amount":"10.00"}]}
                """.formatted(month, companyId, landlordId, tenantId)));
        long statementId = id(created(session, "/api/expense-statements",
                statementBody(companyId, month)));
        return new Documents(companyId, landlordId, tenantId, leaseId, rentReceiptId, statementId);
    }

    private static String statementBody(long companyId, String month) {
        return """
                {"companyId":%d,"month":"%s","lines":[{"itemCode":"gaz","amountInclVat":"80.00",
                 "proRataPct":"35,71"}]}
                """.formatted(companyId, month);
    }

    private long signature(Session session, long personId, String name) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/signatures");
        request.file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                .param("personId", String.valueOf(personId))
                .param("name", name)
                .session(session.http())
                .cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
        MvcResult result = mockMvc.perform(request).andExpect(status().isCreated()).andReturn();
        return id(result);
    }

    private long ownerId(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow().getId();
    }

    private long ownedRows(String table, String column, long documentId, long userId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE " + column + " = ? AND user_id = ?",
                Long.class, documentId, userId);
    }

    private Session sessionFor(String email) throws Exception {
        users.findByEmailIgnoreCase(email).orElseGet(() -> {
            AppUser user = new AppUser();
            Instant now = Instant.now();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(PASSWORD));
            user.setConfirmed(true);
            user.setMustChangePassword(false);
            user.setRole(UserRole.ADMIN);
            user.setCreatedAt(now);
            user.setUpdatedAt(now);
            return users.save(user);
        });
        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        Cookie csrf = result.getResponse().getCookie("XSRF-TOKEN");
        if (csrf == null) {
            MvcResult me = mockMvc.perform(get("/api/auth/me").session(session))
                    .andExpect(status().isOk())
                    .andReturn();
            csrf = me.getResponse().getCookie("XSRF-TOKEN");
        }
        assertThat(csrf).isNotNull();
        return new Session(session, csrf);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder mutation(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder, Session session) {
        return builder.session(session.http()).cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
    }

    private MvcResult created(Session session, String path, String body) throws Exception {
        return mockMvc.perform(mutation(post(path), session).contentType(JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private List<Long> listedIds(Session session, String path) throws Exception {
        MvcResult result = mockMvc.perform(get(path).session(session.http()))
                .andExpect(status().isOk())
                .andReturn();
        List<Number> ids = JsonPath.read(result.getResponse().getContentAsString(), "$[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private long id(MvcResult result) throws Exception {
        Number value = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return value.longValue();
    }

    private record Documents(long companyId, long landlordId, long tenantId, long leaseId, long rentReceiptId,
            long statementId) {
    }

    private record Session(MockHttpSession http, Cookie csrf) {
    }
}
