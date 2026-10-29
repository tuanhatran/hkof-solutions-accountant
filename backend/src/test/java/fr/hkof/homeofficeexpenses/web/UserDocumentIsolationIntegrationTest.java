package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    private void signature(Session session, long personId, String name) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/signatures");
        request.file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                .param("personId", String.valueOf(personId))
                .param("name", name)
                .session(session.http())
                .cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
        mockMvc.perform(request).andExpect(status().isCreated());
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
