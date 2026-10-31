package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

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

import fr.hkof.homeofficeexpenses.domain.AppUser;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.UserRole;
import fr.hkof.homeofficeexpenses.repository.AppUserRepository;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;

@SpringBootTest(properties = "app.security.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ModuleAccessIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;
    private static final String PASSWORD = "motdepasse-module";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository users;

    @Autowired
    private CompanyRepository companies;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JavaMailSender mailSender;

    @Test
    @DisplayName("A company module disabled account is stopped on every company route")
    void blocksCompanyRoutes() throws Exception {
        MockHttpSession session = sessionFor("company.off@example.test", false, true);

        for (String path : new String[] {"/api/companies", "/api/expense-statements", "/api/expense-items"}) {
            mockMvc.perform(get(path).session(session))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"))
                    .andExpect(jsonPath("$.detail")
                            .value("Le module entreprise est désactivé pour ce compte."));
        }

        mockMvc.perform(get("/api/persons").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/landlords").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/leases").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/agency").session(session))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("A company-only account keeps the LMNP-only routes closed")
    void companyOnlyAccountKeepsLmnpOnlyRoutesClosed() throws Exception {
        MockHttpSession session = sessionFor("company.only@example.test", true, false);

        for (String path : new String[] {"/api/persons", "/api/tenants", "/api/rent-receipts",
                "/api/agency"}) {
            mockMvc.perform(get(path).session(session))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MODULE_LMNP_DISABLED"))
                    .andExpect(jsonPath("$.detail")
                            .value("Le module LMNP est désactivé pour ce compte."));
        }

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("A company-only account can create its landlord and its company lease")
    void companyOnlyAccountCanUseSharedRoutes() throws Exception {
        MockHttpSession session = sessionFor("company.shared@example.test", true, false);

        mockMvc.perform(get("/api/landlords").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/leases").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/rent-receipts/received").session(session))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("An LMNP-only account keeps its landlord and lease routes open")
    void lmnpOnlyAccountKeepsSharedRoutesOpen() throws Exception {
        MockHttpSession session = sessionFor("lmnp.shared@example.test", false, true);

        mockMvc.perform(get("/api/landlords").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/leases").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/persons").session(session))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/agency").session(session))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
    }

    @Test
    @DisplayName("An account without any module is stopped on the shared routes")
    void blocksSharedRoutesWithoutAnyModule() throws Exception {
        MockHttpSession session = sessionFor("no.module@example.test", false, false);

        for (String path : new String[] {"/api/landlords", "/api/leases", "/api/persons", "/api/tenants",
                "/api/rent-receipts", "/api/agency"}) {
            mockMvc.perform(get(path).session(session))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.code").value("MODULE_LMNP_DISABLED"));
        }

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
    }

    @Test
    @DisplayName("A module switched off after login is enforced on the next request")
    void enforcesFreshFlagsAfterLogin() throws Exception {
        MockHttpSession session = sessionFor("toggled.after@example.test", true, true);

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isOk());

        AppUser user = users.findByEmailIgnoreCase("toggled.after@example.test").orElseThrow();
        user.setCompanyEnabled(false);
        users.save(user);

        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
    }

    @Test
    @DisplayName("An LMNP-only landlord can look up a company by SIREN but keeps the company module closed")
    void lmnpOnlyLandlordCanLookupCompany() throws Exception {
        sessionFor("lookup.owner@example.test", true, true);
        AppUser owner = users.findByEmailIgnoreCase("lookup.owner@example.test").orElseThrow();
        Company company = new Company();
        company.setUserId(owner.getId());
        company.setName("Société recherchée");
        company.setSiren("555 666 777");
        company.setDeleted(false);
        company.setCreatedAt(Instant.now());
        long companyId = companies.save(company).getId();

        MockHttpSession session = sessionFor("lmnp.lookup@example.test", false, true);

        mockMvc.perform(get("/api/companies/lookup").param("siren", "555666777").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Société recherchée"))
                .andExpect(jsonPath("$.siren").value("555 666 777"))
                .andExpect(jsonPath("$.id").doesNotExist());
        mockMvc.perform(get("/api/companies").session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
        mockMvc.perform(get("/api/companies/{id}", companyId).session(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("MODULE_COMPANY_DISABLED"));
    }

    private MockHttpSession sessionFor(String email, boolean companyEnabled, boolean lmnpEnabled)
            throws Exception {
        AppUser user = users.findByEmailIgnoreCase(email).orElseGet(AppUser::new);
        Instant now = Instant.now();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setConfirmed(true);
        user.setMustChangePassword(false);
        user.setRole(UserRole.USER);
        user.setCompanyEnabled(companyEnabled);
        user.setLmnpEnabled(lmnpEnabled);
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(now);
        }
        user.setUpdatedAt(now);
        users.save(user);

        MvcResult result = mockMvc.perform(post("/api/auth/login").contentType(JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(session).isNotNull();
        return session;
    }
}
