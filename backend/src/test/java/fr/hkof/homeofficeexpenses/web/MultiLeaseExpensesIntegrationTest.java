package fr.hkof.homeofficeexpenses.web;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Base64;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import fr.hkof.homeofficeexpenses.repository.ExpenseStatementRepository;

/**
 * Multi-lease company expenses: expense items and statements carry a {@code leaseId} filtered
 * against the company's active leases (legacy unassigned rows stay visible), a second active
 * company lease for the same company is accepted, and the lease pro-rata base is shared by the
 * calculation response and the lease DTO.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MultiLeaseExpensesIntegrationTest {

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ExpenseStatementRepository statements;

    @Test
    @DisplayName("A company can hold two active leases and both are listed with their pro-rata")
    void twoActiveCompanyLeasesAreAllowed() throws Exception {
        long companyId = createCompany("Société multi-baux");
        long landlordA = createLandlord("Bailleur multi A");
        long landlordB = createLandlord("Bailleur multi B");

        long firstLease = createCompanyLease(companyId, landlordA, "80", "20");
        long secondLease = createCompanyLease(companyId, landlordB, "60", "10");

        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + firstLease + " && @.proRataBase == '25.00'"
                        + " && @.proRataBaseDetail != null)]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id == " + secondLease + " && @.proRataBase == '16.67')]").isNotEmpty());

        mockMvc.perform(delete("/api/leases/{id}", firstLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", secondLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordB)).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("An expense item is created with its lease and filtered per lease with legacy rows kept")
    void expenseItemsAreScopedToLeases() throws Exception {
        long companyId = createCompany("Société postes multi-baux");
        long otherCompanyId = createCompany("Société voisine");
        long landlordId = createLandlord("Bailleur postes");
        long otherLandlord = createLandlord("Bailleur voisine");
        long leaseA = createCompanyLease(companyId, landlordId, "80", "20");
        long otherLease = createCompanyLease(otherCompanyId, otherLandlord, "50", "10");

        long eauId = id(post("/api/expense-items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"leaseId":%d,"code":"eau","label":"Eau","proRataPct":"20"}
                        """.formatted(companyId, leaseA)));

        long heritageId = id(post("/api/expense-items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"code":"heritage","label":"Poste hérité","proRataPct":"50"}
                        """.formatted(companyId)));

        mockMvc.perform(get("/api/expense-items")
                        .param("companyId", String.valueOf(companyId))
                        .param("leaseId", String.valueOf(leaseA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'eau' && @.leaseId == " + leaseA + ")]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.code == 'heritage' && @.leaseId == null)]").isNotEmpty());

        mockMvc.perform(get("/api/expense-items")
                        .param("companyId", String.valueOf(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'eau')]").isNotEmpty());

        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"code":"vol","label":"Poste volé","proRataPct":"10"}
                                """.formatted(companyId, otherLease)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ce bail n'appartient pas à la société."));

        mockMvc.perform(delete("/api/expense-items/{id}", eauId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/expense-items/{id}", heritageId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", leaseA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", otherLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", otherCompanyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", otherLandlord)).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("The calculation uses the selected lease pro-rata base, not the first lease")
    void calculationUsesSelectedLease() throws Exception {
        long companyId = createCompany("Société calcul multi-baux");
        long landlordA = createLandlord("Bailleur calc A");
        long landlordB = createLandlord("Bailleur calc B");
        long firstLease = createCompanyLease(companyId, landlordA, "80", "20");
        long secondLease = createCompanyLease(companyId, landlordB, "60", "30");
        long loyerItemId = createItem(companyId, "loyer", "Loyer");

        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"month":"2026-06","lines":[
                                  {"itemCode":"loyer","amountInclVat":"100.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId, secondLease)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proRataBase").value("50.00"))
                .andExpect(jsonPath("$.proRataBaseDetail").value(containsString("60")));

        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-06","lines":[
                                  {"itemCode":"loyer","amountInclVat":"100.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proRataBase").value("25.00"));

        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":999999999,"month":"2026-06","lines":[]}
                                """.formatted(companyId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bail introuvable."));

        mockMvc.perform(post("/api/expense-statements/draft")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-06")
                        .param("leaseId", String.valueOf(firstLease)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proRataBase").value("25.00"));

        mockMvc.perform(delete("/api/expense-items/{id}", loyerItemId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", firstLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", secondLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordB)).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("A generated statement stores its lease and the list filters per lease with legacy rows kept")
    void generatedStatementStoresLease() throws Exception {
        long companyId = createCompany("Société notes multi-baux");
        long landlordId = createLandlord("Bailleur notes");
        long leaseId = createCompanyLease(companyId, landlordId, "80", "20");
        long itemId = createItem(companyId, "loyer", "Loyer");
        long ceoId = createCeo(companyId);
        uploadSignature(ceoId);

        String generatedStatement = mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"month":"2026-07","lines":[
                                  {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId, leaseId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andReturn().getResponse().getContentAsString();
        long statementId = ((Number) JsonPath.read(generatedStatement, "$.id")).longValue();

        mockMvc.perform(get("/api/expense-statements")
                        .param("companyId", String.valueOf(companyId))
                        .param("leaseId", String.valueOf(leaseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.month == '2026-07' && @.leaseId == " + leaseId + ")]").isNotEmpty());

        mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":999999999,"month":"2026-07","lines":[
                                  {"itemCode":"loyer","amountInclVat":"100.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bail introuvable."));

        mockMvc.perform(delete("/api/leases/{id}", leaseId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isBadRequest());

        // Test-only physical cleanup: a statement-bearing company can never be deleted through
        // the API, and the shared H2 suite would otherwise leak it into other integration tests.
        mockMvc.perform(delete("/api/expense-items/{id}", itemId)).andExpect(status().isNoContent());
        statements.deleteById(statementId);
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordId)).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Selecting another company lease persists the active lease and switches its pro-rata")
    void switchingActiveLeasePersistsAndDrivesProRata() throws Exception {
        long companyId = createCompany("Société bail actif");
        long landlordA = createLandlord("Bailleur actif A");
        long landlordB = createLandlord("Bailleur actif B");
        long otherCompanyId = createCompany("Société étrangère active");
        long otherLandlord = createLandlord("Bailleur étranger actif");
        long firstLease = createCompanyLease(companyId, landlordA, "80", "20");
        long secondLease = createCompanyLease(companyId, landlordB, "60", "30");
        long foreignLease = createCompanyLease(otherCompanyId, otherLandlord, "50", "10");

        mockMvc.perform(get("/api/companies/{id}", companyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(firstLease))
                .andExpect(jsonPath("$.proRataBase").value("25.00"));

        mockMvc.perform(put("/api/companies/{id}", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société bail actif","leaseId":%d}
                                """.formatted(secondLease)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(secondLease))
                .andExpect(jsonPath("$.proRataBase").value("50.00"));

        mockMvc.perform(get("/api/companies/{id}", companyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(secondLease))
                .andExpect(jsonPath("$.proRataBase").value("50.00"));

        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + firstLease + " && @.companyId == " + companyId + ")]")
                        .isNotEmpty());

        mockMvc.perform(put("/api/companies/{id}", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société bail actif","leaseId":%d}
                                """.formatted(foreignLease)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ce bail est déjà lié à une autre société."));

        mockMvc.perform(get("/api/companies/{id}", companyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(secondLease));

        mockMvc.perform(delete("/api/leases/{id}", firstLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", secondLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", foreignLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", otherCompanyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordB)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", otherLandlord)).andExpect(status().isNoContent());
    }

    private long createCompany(String name) throws Exception {
        return id(post("/api/companies")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"%s"}
                        """.formatted(name)));
    }

    private long createLandlord(String name) throws Exception {
        return id(post("/api/persons")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"%s","address":"1 rue du Test"}
                        """.formatted(name)));
    }

    private long createCompanyLease(long companyId, long landlordId, String totalArea, String businessArea)
            throws Exception {
        return id(post("/api/leases")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyLease":true,"landlordId":%d,"companyId":%d,
                         "propertyAddress":"10 rue des Baux multiples, 75002 Paris","rentExclCharges":"800.00",
                         "totalArea":"%s","businessArea":"%s"}
                        """.formatted(landlordId, companyId, totalArea, businessArea)));
    }

    private long createItem(long companyId, String code, String label) throws Exception {
        return id(post("/api/expense-items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"code":"%s","label":"%s","proRataPct":"100"}
                        """.formatted(companyId, code, label)));
    }

    private long createCeo(long companyId) throws Exception {
        return id(post("/api/companies/{companyId}/employees", companyId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"firstName":"Laurent","lastName":"Gérant","title":"CEO"}
                        """.formatted(companyId)));
    }

    private void uploadSignature(long personId) throws Exception {
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("personId", String.valueOf(personId))
                        .param("name", "Signature gérant"))
                .andExpect(status().isCreated());
    }

    private long id(MockHttpServletRequestBuilder request) throws Exception {
        String created = mockMvc.perform(request).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(created, "$.id")).longValue();
    }
}
