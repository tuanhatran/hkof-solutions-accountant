package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;

@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles({"test", "e2e"})
class E2eResetIntegrationTest {

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private static final String CUSTOM_SIGNATURE_NAME = "Signature personnalisée e2e";
    private static final String E2E_EMAIL = "e2e@homeofficeexpenses.local";
    private static final String E2E_PASSWORD = "e2e-password";
    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String CSRF_HEADER = "X-XSRF-TOKEN";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("The e2e profile resets the database and files to its initial state owned by the e2e account")
    void resetsData() throws Exception {
        // Cypress calls the reset before logging in: it must stay open and leave e2e-owned seed data.
        mockMvc.perform(post("/api/e2e/reset")).andExpect(status().isNoContent());
        Session e2e = loginE2e();
        long companyId = firstId("/api/companies", e2e);
        String seedLeases = getJson("/api/leases", e2e);
        long leaseId = ((Number) JsonPath.read(seedLeases, "$[0].id")).longValue();
        mockMvc.perform(mutation(put("/api/companies/{id}", companyId), e2e)
                        .contentType(JSON)
                        .content("""
                                {"name":"Test E2E","legalForm":"EURL","siren":"123 456 789",
                                 "address":"1 rue du Test, 75001 Paris","managerName":"Testeur",
                                 "leaseId":%d,"issuePlace":"Paris"}
                                """.formatted(leaseId)))
                .andExpect(status().isOk());

        String landlord = mockMvc.perform(mutation(post("/api/persons"), e2e)
                        .contentType(JSON)
                        .content("""
                                {"name":"Bailleur Test e2e","address":"1 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String tenant = mockMvc.perform(mutation(post("/api/persons"), e2e)
                        .contentType(JSON)
                        .content("""
                                {"name":"Locataire Test e2e","address":"2 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        mockMvc.perform(mutation(post("/api/leases"), e2e)
                        .contentType(JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"9 rue du Test, 75001 Paris","rentExclCharges":"800.00"}
                                """.formatted(((Number) JsonPath.read(landlord, "$.id")).longValue(),
                        ((Number) JsonPath.read(tenant, "$.id")).longValue())))
                .andExpect(status().isCreated());

        mockMvc.perform(mutation(post("/api/expense-items"), e2e)
                        .contentType(JSON)
                        .content("""
                                {"companyId":%d,"code":"test-e2e","label":"Poste e2e","proRataPct":"35.71",
                                 "periodicity":"MONTHLY","active":true,"sortOrder":99,
                                 "multipleLinesAllowed":false}
                                """.formatted(companyId)))
                .andExpect(status().isCreated());

        MockMultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain",
                "Justificatif de test e2e avec un contenu suffisant.".getBytes());
        String receipt = mockMvc.perform(mutation(multipart("/api/receipts").file(file), e2e))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int receiptId = JsonPath.read(receipt, "$.id");

        mockMvc.perform(mutation(put("/api/drafts/rent-receipts"), e2e)
                        .contentType(JSON)
                        .content("""
                                {"month":"2026-01","landlordId":4,"tenantId":7,
                                 "periodStart":"2026-01-01","periodEnd":"2026-01-31",
                                 "rentExclCharges":"1300.00","charges":"50.00",
                                 "paymentDate":"2026-01-05","issueDate":"2026-01-05","templateId":9}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/e2e/reset")).andExpect(status().isNoContent());
        Session reset = loginE2e();

        mockMvc.perform(get("/api/companies").session(reset.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("HKOF"));
        String persons = getJson("/api/persons", reset);
        assertThat((List<?>) JsonPath.read(persons, "$[?(@.name == 'Nom du bailleur')]")).isNotEmpty();
        assertThat((List<?>) JsonPath.read(persons, "$[?(@.name == 'Nom du locataire')]")).isNotEmpty();
        assertThat((List<?>) JsonPath.read(persons, "$[?(@.name == 'Bailleur Test e2e')]")).isEmpty();
        List<String> seededPlaces = JsonPath.read(persons, "$[?(@.name == 'Nom du bailleur')].issuePlace");
        assertThat(seededPlaces).containsExactly("Paris");
        long landlordId = idByName(persons, "Nom du bailleur");
        long tenantId = idByName(persons, "Nom du locataire");

        String resetAddresses = getJson("/api/addresses", reset);
        assertThat((List<?>) JsonPath.read(resetAddresses, "$[*]")).hasSize(1);
        assertThat(JsonPath.<String>read(resetAddresses, "$[0].label"))
                .isEqualTo("12 rue de la République, 75000 Paris");
        long addressId = ((Number) JsonPath.read(resetAddresses, "$[0].id")).longValue();

        String leases = getJson("/api/leases", reset);
        assertThat((List<?>) JsonPath.read(leases, "$[*]")).hasSize(2);
        assertThat((List<?>) JsonPath.read(leases, "$[?(@.companyLease == true && @.landlordId == "
                + landlordId + " && @.tenantId == null)]")).isNotEmpty();
        assertThat((List<?>) JsonPath.read(leases, "$[?(@.companyLease == false && @.landlordId == "
                + landlordId + " && @.tenantId == " + tenantId + ")]")).isNotEmpty();
        List<Number> companyLeaseAddresses = JsonPath.read(leases,
                "$[?(@.companyLease == true)].addressId");
        assertThat(companyLeaseAddresses.stream().map(Number::longValue).toList()).containsExactly(addressId);
        assertThat(JsonPath.<List<String>>read(leases, "$[*].propertyAddress"))
                .containsOnly("12 rue de la République, 75000 Paris");

        mockMvc.perform(get("/api/rent-receipts").session(reset.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/expense-items").param("companyId", String.valueOf(firstId("/api/companies", reset)))
                        .session(reset.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[?(@.code == 'test-e2e')]").isEmpty());
        mockMvc.perform(get("/api/receipts/" + receiptId).session(reset.session()))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/drafts/rent-receipts")
                        .param("month", "2026-01")
                        .param("landlordId", "4")
                        .param("tenantId", "7")
                        .session(reset.session()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("The e2e reset drops custom signatures and seeds one signature per seeded person")
    void resetSeedsDefaultSignatures() throws Exception {
        mockMvc.perform(post("/api/e2e/reset")).andExpect(status().isNoContent());
        Session e2e = loginE2e();
        String persons = getJson("/api/persons", e2e);
        long landlordId = idByName(persons, "Nom du bailleur");

        mockMvc.perform(mutation(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature-personnalisee.png", "image/png", PNG))
                        .param("personId", String.valueOf(landlordId))
                        .param("name", CUSTOM_SIGNATURE_NAME), e2e))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/e2e/reset")).andExpect(status().isNoContent());
        Session reset = loginE2e();

        String resetPersons = getJson("/api/persons", reset);
        long landlordPersonId = idByName(resetPersons, "Nom du bailleur");
        long tenantPersonId = idByName(resetPersons, "Nom du locataire");
        long ceoId = ceoEmployeeId(reset);

        List<Long> seededPersonIds = new ArrayList<>();
        List<String> seededPersonNames = new ArrayList<>();
        for (long personId : List.of(landlordPersonId, tenantPersonId, ceoId)) {
            String signatures = mockMvc.perform(get("/api/signatures")
                            .param("personId", String.valueOf(personId)).session(reset.session()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[?(@.name == '" + CUSTOM_SIGNATURE_NAME + "')]").isEmpty())
                    .andExpect(jsonPath("$[?(@.mimeType != 'image/png')]").isEmpty())
                    .andReturn().getResponse().getContentAsString();
            seededPersonIds.addAll(signaturePersonIds(signatures));
            seededPersonNames.addAll(JsonPath.read(signatures, "$[*].personName"));
        }
        assertThat(seededPersonIds)
                .containsExactlyInAnyOrder(landlordPersonId, tenantPersonId, ceoId);
        assertThat(seededPersonNames)
                .contains("Nom du bailleur", "Nom du locataire", "Gérant");
    }

    private List<Long> signaturePersonIds(String signatures) {
        return JsonPath.<List<Number>>read(signatures, "$[*].personId").stream().map(Number::longValue).toList();
    }

    private long idByName(String body, String name) {
        List<Number> ids = JsonPath.read(body, "$[?(@.name == '" + name + "')].id");
        return ids.get(0).longValue();
    }

    private String getJson(String path, Session session) throws Exception {
        return mockMvc.perform(get(path).session(session.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private long firstId(String path, Session session) throws Exception {
        return ((Number) JsonPath.read(getJson(path, session), "$[0].id")).longValue();
    }

    private long ceoEmployeeId(Session session) throws Exception {
        String body = mockMvc.perform(get("/api/companies/{companyId}/employees", firstId("/api/companies", session))
                        .session(session.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$[0].id")).longValue();
    }

    private MockHttpServletRequestBuilder mutation(MockHttpServletRequestBuilder builder, Session session) {
        return builder.session(session.session())
                .cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
    }

    private MockMultipartHttpServletRequestBuilder mutation(MockMultipartHttpServletRequestBuilder builder,
            Session session) {
        return builder.session(session.session())
                .cookie(session.csrf())
                .header(CSRF_HEADER, session.csrf().getValue());
    }

    private Session loginE2e() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + E2E_EMAIL + "\",\"password\":\"" + E2E_PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertThat(session).isNotNull();
        Cookie csrf = login.getResponse().getCookie("XSRF-TOKEN");
        if (csrf == null) {
            MvcResult me = mockMvc.perform(get("/api/auth/me").session(session))
                    .andExpect(status().isOk())
                    .andReturn();
            csrf = me.getResponse().getCookie("XSRF-TOKEN");
        }
        assertThat(csrf).isNotNull();
        return new Session(session, csrf);
    }

    private record Session(MockHttpSession session, Cookie csrf) {
    }
}
