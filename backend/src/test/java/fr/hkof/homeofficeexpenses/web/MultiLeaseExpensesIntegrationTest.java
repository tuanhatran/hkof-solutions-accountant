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
    @DisplayName("Statements are versioned, active and drafted per lease")
    void statementsAreScopedToLease() throws Exception {
        long companyId = createCompany("Société notes par bail");
        long landlordA = createLandlord("Bailleur notes A");
        long landlordB = createLandlord("Bailleur notes B");
        long leaseA = createCompanyLease(companyId, landlordA, "80", "20");
        long leaseB = createCompanyLease(companyId, landlordB, "60", "10");
        long itemId = createItem(companyId, "loyer", "Loyer");
        long ceoId = createCeo(companyId);
        uploadSignature(ceoId);

        long firstA = generateStatement(companyId, leaseA, "2026-08");
        long firstB = generateStatement(companyId, leaseB, "2026-08");
        activeStatement(companyId, leaseA, firstA, 1);
        activeStatement(companyId, leaseB, firstB, 1);

        long secondA = generateStatement(companyId, leaseA, "2026-08");
        activeStatement(companyId, leaseA, secondA, 2);
        activeStatement(companyId, leaseB, firstB, 1);

        saveDraft(companyId, leaseA, "Brouillon A");
        saveDraft(companyId, leaseB, "Brouillon B");
        findDraft(companyId, leaseA, "Brouillon A");
        findDraft(companyId, leaseB, "Brouillon B");

        long thirdA = generateStatement(companyId, leaseA, "2026-08");
        activeStatement(companyId, leaseA, thirdA, 3);
        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-08")
                        .param("leaseId", String.valueOf(leaseA)))
                .andExpect(status().isNoContent());
        findDraft(companyId, leaseB, "Brouillon B");

        mockMvc.perform(delete("/api/expense-items/{id}", itemId)).andExpect(status().isNoContent());
        statements.deleteById(firstA);
        statements.deleteById(firstB);
        statements.deleteById(secondA);
        statements.deleteById(thirdA);
        mockMvc.perform(delete("/api/leases/{id}", leaseA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", leaseB)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordB)).andExpect(status().isNoContent());
    }

    private long generateStatement(long companyId, long leaseId, String month) throws Exception {
        return id(post("/api/expense-statements")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"leaseId":%d,"month":"%s","lines":[
                          {"itemCode":"loyer","amountInclVat":"950.00","proRataPct":"100"}
                        ]}
                        """.formatted(companyId, leaseId, month)));
    }

    private void activeStatement(long companyId, long leaseId, long id, int version) throws Exception {
        mockMvc.perform(get("/api/expense-statements/active")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-08")
                        .param("leaseId", String.valueOf(leaseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.version").value(version))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    private void saveDraft(long companyId, long leaseId, String code) throws Exception {
        mockMvc.perform(put("/api/drafts/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"month":"2026-08","leaseId":%d,"complete":true,"lines":[
                                  {"itemCode":"%s","amountInclVat":"10.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId, leaseId, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.lines[0].itemCode").value(code));
    }

    private void findDraft(long companyId, long leaseId, String code) throws Exception {
        mockMvc.perform(get("/api/drafts/expense-statements")
                        .param("companyId", String.valueOf(companyId))
                        .param("month", "2026-08")
                        .param("leaseId", String.valueOf(leaseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.lines[0].itemCode").value(code));
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

    @Test
    @DisplayName("The same expense code is allowed on two leases and calculation uses the selected one")
    void sameCodeIsScopedPerLease() throws Exception {
        long companyId = createCompany("Société postes même code");
        long landlordA = createLandlord("Bailleur code A");
        long landlordB = createLandlord("Bailleur code B");
        long leaseA = createCompanyLease(companyId, landlordA, "80", "20");
        long leaseB = createCompanyLease(companyId, landlordB, "60", "10");

        long loyerA = id(post("/api/expense-items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"leaseId":%d,"code":"loyer","label":"Loyer du bail A","proRataPct":"100"}
                        """.formatted(companyId, leaseA)));

        // The reported payload: « loyer » already exists on lease A, creating it on lease B works.
        long loyerB = id(post("/api/expense-items")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"companyId":%d,"leaseId":%d,"label":"Quittance de loyer","supplier":"Vivian",
                         "proRataPct":"23","periodicity":"MONTHLY","sortOrder":10,"active":true,
                         "multipleLinesAllowed":false,"code":"Loyer"}
                        """.formatted(companyId, leaseB)));

        mockMvc.perform(get("/api/expense-items")
                        .param("companyId", String.valueOf(companyId))
                        .param("leaseId", String.valueOf(leaseA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.leaseId == " + leaseA + " && @.label == 'Loyer du bail A')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.leaseId == " + leaseB + ")]").isEmpty());
        mockMvc.perform(get("/api/expense-items")
                        .param("companyId", String.valueOf(companyId))
                        .param("leaseId", String.valueOf(leaseB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.leaseId == " + leaseB + " && @.supplier == 'Vivian')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.leaseId == " + leaseA + ")]").isEmpty());

        // The same code twice on one lease is rejected in French.
        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"code":"loyer","label":"Doublon","proRataPct":"10"}
                                """.formatted(companyId, leaseB)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un poste avec le code « loyer » existe déjà."));

        // An inherited item blocks the code on every lease and cannot be created over a lease one.
        long gazId = createItem(companyId, "gaz", "Gaz");
        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"code":"gaz","label":"Gaz bail A","proRataPct":"10"}
                                """.formatted(companyId, leaseA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un poste avec le code « gaz » existe déjà."));
        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"code":"loyer","label":"Loyer hérité","proRataPct":"10"}
                                """.formatted(companyId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un poste avec le code « loyer » existe déjà."));

        // Moving an item to a lease that already owns its code is a 400, not a database error.
        mockMvc.perform(put("/api/expense-items/{id}", loyerA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"label":"Loyer du bail A","proRataPct":"100"}
                                """.formatted(companyId, leaseB)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un poste avec le code « loyer » existe déjà."));

        // The calculation of lease B uses lease B's item, never lease A's.
        mockMvc.perform(post("/api/expense-statements/calculation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"leaseId":%d,"month":"2026-06","lines":[
                                  {"itemCode":"loyer","amountInclVat":"100.00","proRataPct":"100"}
                                ]}
                                """.formatted(companyId, leaseB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].itemLabel").value("Quittance de loyer"))
                .andExpect(jsonPath("$.lines[0].supplier").value("Vivian"));

        mockMvc.perform(delete("/api/expense-items/{id}", loyerA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/expense-items/{id}", loyerB)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/expense-items/{id}", gazId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", leaseA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", leaseB)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordA)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordB)).andExpect(status().isNoContent());
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
