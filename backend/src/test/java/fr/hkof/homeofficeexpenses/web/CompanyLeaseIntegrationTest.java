package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyLeaseIntegrationTest {

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Two colocation leases share one address, link their co-tenants and reject invalid lists")
    void multiTenantLeasesShareAddress() throws Exception {
        long landlordId = id("/api/persons", """
                {"name":"Bailleur colocation test"}
                """);
        long aliceId = id("/api/persons", """
                {"name":"Alice DUPONT"}
                """);
        long bobId = id("/api/persons", """
                {"name":"Bob MARTIN"}
                """);

        long firstLease = id("/api/leases", """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"tenantIds":[%d,%d],
                 "propertyAddress":"6 rue de la Colocation, 75003 Paris","rentExclCharges":"900.00"}
                """.formatted(landlordId, aliceId, aliceId, bobId));
        long secondLease = id("/api/leases", """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"tenantIds":[%d,%d],
                 "propertyAddress":"6 rue de la Colocation, 75003 Paris","rentExclCharges":"900.00"}
                """.formatted(landlordId, bobId, bobId, aliceId));

        String leases = mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> firstFirst = JsonPath.read(leases, "$[?(@.id == " + firstLease + ")].tenantIds[0]");
        List<Number> firstSecond = JsonPath.read(leases, "$[?(@.id == " + firstLease + ")].tenantIds[1]");
        assertThat(firstFirst.get(0).longValue()).isEqualTo(aliceId);
        assertThat(firstSecond.get(0).longValue()).isEqualTo(bobId);
        List<Number> secondFirst = JsonPath.read(leases, "$[?(@.id == " + secondLease + ")].tenantIds[0]");
        assertThat(secondFirst.get(0).longValue()).isEqualTo(bobId);
        List<Number> firstAddress = JsonPath.read(leases, "$[?(@.id == " + firstLease + ")].addressId");
        List<Number> secondAddress = JsonPath.read(leases, "$[?(@.id == " + secondLease + ")].addressId");
        assertThat(firstAddress.get(0).longValue()).isEqualTo(secondAddress.get(0).longValue());

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantIds":[%d,%d],
                                 "propertyAddress":"7 rue de la Colocation","rentExclCharges":"700.00"}
                                """.formatted(landlordId, aliceId, aliceId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un locataire ne peut être sélectionné qu'une seule fois."));
        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantIds":[],
                                 "propertyAddress":"7 rue de la Colocation","rentExclCharges":"700.00"}
                                """.formatted(landlordId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Sélectionnez un locataire."));

        mockMvc.perform(delete("/api/leases/{id}", firstLease)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", secondLease)).andExpect(status().isNoContent());
        for (long personId : new long[]{aliceId, bobId, landlordId}) {
            mockMvc.perform(delete("/api/persons/{id}", personId)).andExpect(status().isNoContent());
        }
    }

    @Test
    @DisplayName("An enterprise lease uses a company tenant, one link per company and a guarded deletion")
    void enterpriseLeaseCascadesEmployeeDeletion() throws Exception {
        long tenantCompanyId = id("/api/companies", """
                {"name":"Société locataire test"}
                """);
        long emptyCompanyId = id("/api/companies", """
                {"name":"Société salariés test"}
                """);
        long landlordId = id("/api/persons", """
                {"name":"Bailleur société test","address":"1 rue du Bail"}
                """);
        long leaseId = id("/api/leases", """
                {"companyLease":true,"landlordId":%d,"companyId":%d,
                 "propertyAddress":"3 rue du Bail, 75002 Paris","rentExclCharges":"800.00",
                 "totalArea":"80","businessArea":"20"}
                """.formatted(landlordId, tenantCompanyId));

        mockMvc.perform(put("/api/companies/{id}", tenantCompanyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société locataire test","leaseId":%d}
                                """.formatted(leaseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.proRataBase").value("25.00"));

        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.tenantId == null"
                        + " && @.companyId == " + tenantCompanyId + ")]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.tenantName == 'Société locataire test')]")
                        .isNotEmpty());

        long tenantEmployeeId = employee(tenantCompanyId, "Alice", "Martin");
        long emptyEmployeeId = employee(emptyCompanyId, "Bob", "Durand");
        signature(tenantEmployeeId);
        signature(emptyEmployeeId);

        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Autre société test","leaseId":%d}
                                """.formatted(leaseId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ce bail est déjà lié à une autre société."));

        mockMvc.perform(delete("/api/companies/{id}", tenantCompanyId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Cette société est locataire d'un bail actif et ne peut pas être supprimée."));

        mockMvc.perform(delete("/api/companies/{id}", emptyCompanyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/companies/{id}/employees", emptyCompanyId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(emptyEmployeeId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Personne introuvable."));
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(tenantEmployeeId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.personId == " + tenantEmployeeId + ")]").isNotEmpty());

        mockMvc.perform(delete("/api/leases/{id}", leaseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", tenantCompanyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/companies/{id}/employees", tenantCompanyId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(tenantEmployeeId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Personne introuvable."));

        mockMvc.perform(delete("/api/persons/{id}", landlordId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("A normal lease keeps two natural persons and an optional pro-rata company link")
    void normalLeaseUsesPersonsAndOptionalCompanyLink() throws Exception {
        long companyId = id("/api/companies", """
                {"name":"Société pro-rata test"}
                """);
        long landlordId = id("/api/persons", """
                {"name":"Bailleur normal test","address":"1 rue du Bail"}
                """);
        long tenantId = id("/api/persons", """
                {"name":"Locataire normal test","address":"2 rue du Bail"}
                """);

        long leaseId = id("/api/leases", """
                {"companyLease":false,"landlordId":%d,"tenantId":%d,"companyId":%d,
                 "propertyAddress":"4 rue du Bail, 75002 Paris","rentExclCharges":"800.00",
                 "totalArea":"80","businessArea":"20"}
                """.formatted(landlordId, tenantId, companyId));

        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.tenantId == " + tenantId
                        + " && @.companyLease == false && @.companyId == " + companyId + ")]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.tenantName == 'Locataire normal test')]")
                        .isNotEmpty())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.totalArea == null)]").isNotEmpty());

        mockMvc.perform(put("/api/companies/{id}", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société pro-rata test","leaseId":%d}
                                """.formatted(leaseId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.proRataBase").value("0.00"));

        mockMvc.perform(delete("/api/companies/{id}", companyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.companyId == null)]").isNotEmpty());

        mockMvc.perform(delete("/api/leases/{id}", leaseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", tenantId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/persons/{id}", landlordId))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("An employee can never be a lease party and a company lease needs its company")
    void rejectsEmployeePartiesAndMissingCompany() throws Exception {
        long companyId = id("/api/companies", """
                {"name":"Société parties test"}
                """);
        long employeeId = employee(companyId, "Alice", "Martin");
        long landlordId = id("/api/persons", """
                {"name":"Bailleur parties test"}
                """);

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"5 rue du Bail","rentExclCharges":"700.00"}
                                """.formatted(employeeId, landlordId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Un salarié ne peut pas être partie à un bail."));

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":true,"landlordId":%d,
                                 "propertyAddress":"5 rue du Bail","rentExclCharges":"700.00",
                                 "totalArea":"80","businessArea":"20"}
                                """.formatted(landlordId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Sélectionnez la société locataire."));

        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"5 rue du Bail","rentExclCharges":"700.00"}
                                """.formatted(landlordId, landlordId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Le bailleur et le locataire doivent être deux personnes distinctes."));

        mockMvc.perform(delete("/api/persons/{id}", landlordId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/companies/{id}", companyId))
                .andExpect(status().isNoContent());
    }

    private long employee(long companyId, String firstName, String lastName) throws Exception {
        return id("/api/companies/" + companyId + "/employees", """
                {"companyId":%d,"firstName":"%s","lastName":"%s","title":"CEO"}
                """.formatted(companyId, firstName, lastName));
    }

    private void signature(long personId) throws Exception {
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("personId", String.valueOf(personId))
                        .param("name", "Signature salarié"))
                .andExpect(status().isCreated());
    }

    private long id(String path, String body) throws Exception {
        String created = mockMvc.perform(post(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(created, "$.id")).longValue();
    }
}
