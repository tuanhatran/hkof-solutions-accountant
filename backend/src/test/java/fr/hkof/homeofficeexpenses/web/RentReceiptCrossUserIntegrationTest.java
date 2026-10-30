package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;

/**
 * A landlord (LMNP only) issues a rent receipt for a corporate tenant owned by another account
 * (company only). The company owner must see and download exactly that receipt through the
 * received routes, have it detected in the statement draft and bundled in the ZIP, while every
 * landlord-scoped receipt route stays module-locked and every foreign identifier answers 404.
 */
@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RentReceiptCrossUserIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String PASSWORD = "motdepasse-croise";
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
    @DisplayName("A company-only owner receives, downloads and bundles the landlord receipt of its company")
    void companyOwnerReceivesCrossUserReceipt() throws Exception {
        Session landlord = sessionFor("cross.landlord.84@example.test", false, true);
        Session owner = sessionFor("cross.owner.84@example.test", true, false);

        long companyId = id(created(owner, "/api/companies", """
                {"name":"Société Croisée","legalForm":"SARL","siren":"741 852 963",
                 "address":"5 rue Croisée, 75009 Paris","managerName":"Gérante","leaseId":null,
                 "issuePlace":"Paris"}
                """));
        long employeeId = id(created(owner, "/api/companies/" + companyId + "/employees", """
                {"firstName":"Gérante","lastName":"Croisée","title":"CEO","address":"5 rue Croisée",
                 "issuePlace":"Paris"}
                """));
        signature(owner, employeeId, "Signature gérante croisée");
        created(owner, "/api/expense-items", """
                {"companyId":%d,"leaseId":null,"code":"loyer","label":"Loyer","supplier":"Bailleur",
                 "proRataPct":"100","periodicity":"MONTHLY","active":true,"sortOrder":1,
                 "multipleLinesAllowed":false}
                """.formatted(companyId));

        long landlordPersonId = id(created(landlord, "/api/persons",
                "{\"name\":\"Bailleur Croisé\",\"address\":\"5 rue Bailleur\"}"));
        signature(landlord, landlordPersonId, "Signature bailleur croisé");
        created(landlord, "/api/leases", """
                {"companyLease":true,"landlordId":%d,"companySiren":"741852963","tenantId":null,
                 "propertyAddress":"5 rue Croisée, 75009 Paris","rentExclCharges":"900.00",
                 "charges":"50.00","totalArea":"100","businessArea":"100"}
                """.formatted(landlordPersonId));
        long receiptId = id(created(landlord, "/api/rent-receipts", """
                {"month":"2026-09","landlordId":%d,"tenantCompanyId":%d}
                """.formatted(landlordPersonId, companyId)));
        assertThat(jdbc.queryForObject("SELECT tenant_company_id FROM rent_receipt WHERE id = ?", Long.class, receiptId))
                .isEqualTo(companyId);

        // A second receipt of the same landlord for a private tenant must stay invisible to the owner.
        long tenantPersonId = id(created(landlord, "/api/persons",
                "{\"name\":\"Locataire Privé\",\"address\":\"6 rue Privée\"}"));
        created(landlord, "/api/leases", """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"companyId":null,
                 "propertyAddress":"7 rue Privée, 75010 Paris","rentExclCharges":"700.00","charges":"0.00"}
                """.formatted(landlordPersonId, tenantPersonId));
        long privateReceiptId = id(created(landlord, "/api/rent-receipts", """
                {"month":"2026-09","landlordId":%d,"tenantId":%d}
                """.formatted(landlordPersonId, tenantPersonId)));

        // The company-only owner lists and downloads the received receipt despite LMNP being off.
        mockMvc.perform(get("/api/rent-receipts/received").session(owner.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(receiptId))
                .andExpect(jsonPath("$[0].tenantCompanyId").value(companyId))
                .andExpect(jsonPath("$[0].landlordName").value("Bailleur Croisé"))
                .andExpect(jsonPath("$[0].total").value("950.00"));
        mockMvc.perform(get("/api/rent-receipts/received")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-09").session(owner.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(receiptId));
        mockMvc.perform(get("/api/rent-receipts/received").param("month", "2026-08").session(owner.http()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/rent-receipts/received/{id}/pdf", receiptId).session(owner.http()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        byte[] receiptPdf = mockMvc.perform(get("/api/rent-receipts/received/{id}/pdf", receiptId)
                        .session(owner.http()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        // A private receipt, a guessed id and a foreign company filter never resolve for the owner.
        mockMvc.perform(get("/api/rent-receipts/received/{id}/pdf", privateReceiptId).session(owner.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RENT_RECEIPT_NOT_FOUND"));
        mockMvc.perform(get("/api/rent-receipts/received/999999/pdf").session(owner.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RENT_RECEIPT_NOT_FOUND"));
        mockMvc.perform(get("/api/rent-receipts/received").param("companyId", "999999").session(owner.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));

        // Every landlord-scoped receipt route keeps the LMNP module gate for a company-only account.
        for (String path : new String[]{"/api/rent-receipts", "/api/rent-receipts/" + receiptId,
                "/api/rent-receipts/" + receiptId + "/pdf", "/api/rent-receipts/active?month=2026-09"}) {
            mockMvc.perform(get(path).session(owner.http()))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MODULE_LMNP_DISABLED"));
        }

        // The draft auto-detects the received receipt and its amount through the calculation.
        mockMvc.perform(mutation(post("/api/expense-statements/draft"), owner)
                        .param("companyId", String.valueOf(companyId)).param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rentReceipt.id").value(receiptId))
                .andExpect(jsonPath("$.rentReceipt.total").value("950.00"))
                .andExpect(jsonPath("$.lines[0].itemCode").value("loyer"))
                .andExpect(jsonPath("$.lines[0].amountInclVat").value("950.00"))
                .andExpect(jsonPath("$.lines[0].claimedAmount").value("950.00"));

        long statementId = id(created(owner, "/api/expense-statements", """
                {"companyId":%d,"month":"2026-09",
                 "lines":[{"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"}]}
                """.formatted(companyId)));

        byte[] zip = mockMvc.perform(get("/api/expense-statements/{id}/zip", statementId).session(owner.http()))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/zip"))
                .andReturn().getResponse().getContentAsByteArray();
        Map<String, byte[]> entries = unzip(zip);
        assertThat(entries).containsKey("note_frais_2026-09.pdf").containsKey("quittance_2026-09.pdf");
        assertThat(entries.get("quittance_2026-09.pdf")).isEqualTo(receiptPdf);

        byte[] simple = mockMvc.perform(get("/api/expense-statements/{id}/pdf", statementId)
                        .session(owner.http()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        byte[] complete = mockMvc.perform(get("/api/expense-statements/{id}/pdf", statementId)
                        .param("complete", "true").session(owner.http()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(Arrays.equals(simple, complete))
                .as("the complete statement PDF merges the received rent receipt")
                .isFalse();

        // The landlord cannot read the company's statement or company record (company module closed).
        mockMvc.perform(get("/api/expense-statements/{id}", statementId).session(landlord.http()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
        mockMvc.perform(get("/api/companies/{id}", companyId).session(landlord.http()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
        mockMvc.perform(get("/api/persons").session(owner.http()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_LMNP_DISABLED"));
    }

    private static Map<String, byte[]> unzip(byte[] archive) throws Exception {
        Map<String, byte[]> entries = new LinkedHashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                entries.put(entry.getName(), zip.readAllBytes());
            }
        }
        return entries;
    }

    private long signature(Session session, long personId, String name) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/signatures");
        request.file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                .param("personId", String.valueOf(personId))
                .param("name", name)
                .session(session.http())
                .cookie(session.csrf())
                .header("X-XSRF-TOKEN", session.csrf().getValue());
        MvcResult result = mockMvc.perform(request).andExpect(status().isCreated()).andReturn();
        return id(result);
    }

    private Session sessionFor(String email, boolean companyEnabled, boolean lmnpEnabled) throws Exception {
        AppUser user = users.findByEmailIgnoreCase(email).orElseGet(AppUser::new);
        Instant now = Instant.now();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setConfirmed(true);
        user.setMustChangePassword(false);
        user.setRole(UserRole.ADMIN);
        user.setCompanyEnabled(companyEnabled);
        user.setLmnpEnabled(lmnpEnabled);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        users.save(user);
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

    private MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder builder, Session session) {
        return builder.session(session.http()).cookie(session.csrf())
                .header("X-XSRF-TOKEN", session.csrf().getValue());
    }

    private MvcResult created(Session session, String path, String body) throws Exception {
        return mockMvc.perform(mutation(post(path), session).contentType(JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private long id(MvcResult result) throws Exception {
        Number value = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        return value.longValue();
    }

    private record Session(MockHttpSession http, Cookie csrf) {
    }
}
