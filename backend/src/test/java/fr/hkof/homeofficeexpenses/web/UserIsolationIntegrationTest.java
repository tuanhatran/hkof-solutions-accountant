package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;

/**
 * Two authenticated accounts share one API: each one only sees and mutates its own company
 * tree, and a guessed foreign identifier answers 404 without leaking the row.
 */
@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserIsolationIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String CSRF_HEADER = "X-XSRF-TOKEN";
    private static final String PASSWORD = "motdepasse-test";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    @DisplayName("Companies, leases and addresses stay per account, including per-account uniqueness")
    void isolatesCompaniesLeasesAndAddresses() throws Exception {
        Session a = sessionFor("owner.a@example.test");
        Session b = sessionFor("owner.b@example.test");

        long aCompany = id(created(a, "/api/companies", company("Alpha Société", "111 222 333")));
        long bCompany = id(created(b, "/api/companies", company("Bêta Société", "111 222 333")));
        assertThat(bCompany).isNotEqualTo(aCompany);

        long aLandlord = id(created(a, "/api/persons", person("Bailleur A")));
        long aTenant = id(created(a, "/api/persons", person("Locataire A")));
        long bLandlord = id(created(b, "/api/persons", person("Bailleur B")));
        long bTenant = id(created(b, "/api/persons", person("Locataire B")));

        MvcResult aLeaseResult = created(a, "/api/leases",
                lease(aLandlord, aTenant, aCompany, "12 rue Partagée, 75002 Paris"));
        MvcResult bLeaseResult = created(b, "/api/leases",
                lease(bLandlord, bTenant, bCompany, "12 rue Partagée, 75002 Paris"));
        long aLease = id(aLeaseResult);
        long bLease = id(bLeaseResult);
        long aAddress = number(aLeaseResult, "$.addressId");
        long bAddress = number(bLeaseResult, "$.addressId");
        assertThat(aAddress).isNotEqualTo(bAddress);

        mockMvc.perform(get("/api/companies/{id}", aCompany).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(put("/api/companies/{id}", aCompany), b)
                        .contentType(JSON).content(company("Société usurpée", null)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/companies/{id}", aCompany), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));

        mockMvc.perform(mutation(put("/api/leases/{id}", aLease), b)
                        .contentType(JSON).content(lease(bLandlord, bTenant, null, "9 rue Interdite")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LEASE_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/leases/{id}", aLease), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LEASE_NOT_FOUND"));

        assertThat(listedIds(b, "/api/companies")).contains(bCompany).doesNotContain(aCompany);
        assertThat(listedIds(b, "/api/leases")).contains(bLease).doesNotContain(aLease);
        assertThat(listedIds(b, "/api/addresses")).contains(bAddress).doesNotContain(aAddress);
        assertThat(listedIds(a, "/api/addresses")).contains(aAddress).doesNotContain(bAddress);
    }

    @Test
    @DisplayName("Employees and expense items stay per account and reject a foreign identifier")
    void isolatesEmployeesAndExpenseItems() throws Exception {
        Session a = sessionFor("worker.a@example.test");
        Session b = sessionFor("worker.b@example.test");

        long aCompany = id(created(a, "/api/companies", company("Employeur A", null)));
        long bCompany = id(created(b, "/api/companies", company("Employeur B", null)));

        long aEmployee = id(created(a, "/api/companies/" + aCompany + "/employees", employee("Alice", "Martin")));
        long bEmployee = id(created(b, "/api/companies/" + bCompany + "/employees", employee("Bob", "Durand")));

        mockMvc.perform(get("/api/companies/{id}/employees", aCompany).session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(put("/api/employees/{id}", aEmployee), b)
                        .contentType(JSON).content(employee("Usurpateur", "Test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/employees/{id}", aEmployee), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));

        long aItem = id(created(a, "/api/expense-items", expenseItem(aCompany, "Gaz A")));
        long bItem = id(created(b, "/api/expense-items", expenseItem(bCompany, "Gaz B")));

        mockMvc.perform(get("/api/expense-items").param("companyId", String.valueOf(aCompany))
                        .param("all", "true").session(b.http()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mockMvc.perform(mutation(put("/api/expense-items/{id}", aItem), b)
                        .contentType(JSON).content(expenseItem(bCompany, "Gaz usurpé")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPENSE_ITEM_NOT_FOUND"));
        mockMvc.perform(mutation(delete("/api/expense-items/{id}", aItem), b))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EXPENSE_ITEM_NOT_FOUND"));

        assertThat(listedIds(a, "/api/companies/" + aCompany + "/employees"))
                .contains(aEmployee).doesNotContain(bEmployee);
        assertThat(listedIds(b, "/api/companies/" + bCompany + "/employees"))
                .contains(bEmployee).doesNotContain(aEmployee);
        assertThat(listedIds(b, "/api/expense-items?companyId=" + bCompany + "&all=true"))
                .contains(bItem).doesNotContain(aItem);
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
        return number(result, "$.id");
    }

    private long number(MvcResult result, String path) throws Exception {
        Number value = JsonPath.read(result.getResponse().getContentAsString(), path);
        return value.longValue();
    }

    private static String company(String name, String siren) {
        return """
                {"name":"%s","legalForm":"SARL","siren":%s,"address":"1 rue de la Paix",
                 "managerName":"Gérant","leaseId":null,"issuePlace":"Paris"}
                """.formatted(name, siren == null ? "null" : "\"" + siren + "\"");
    }

    private static String person(String name) {
        return """
                {"name":"%s","address":"1 rue des Personnes","issuePlace":"Paris"}
                """.formatted(name);
    }

    private static String lease(Long landlordId, Long tenantId, Long companyId, String address) {
        return """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"companyId":%s,
                 "propertyAddress":"%s","rentExclCharges":"900.00","charges":"50.00"}
                """.formatted(landlordId, tenantId, companyId == null ? "null" : companyId.toString(), address);
    }

    private static String employee(String firstName, String lastName) {
        return """
                {"firstName":"%s","lastName":"%s","email":null,"address":"2 rue des Salariés",
                 "title":"CEO","issuePlace":"Paris"}
                """.formatted(firstName, lastName);
    }

    private static String expenseItem(Long companyId, String label) {
        return """
                {"companyId":%d,"leaseId":null,"code":"gaz","label":"%s","supplier":null,
                 "proRataPct":"35.71","periodicity":"MONTHLY","active":true,"sortOrder":10,
                 "multipleLinesAllowed":false}
                """.formatted(companyId, label);
    }

    private record Session(MockHttpSession http, Cookie csrf) {
    }
}
