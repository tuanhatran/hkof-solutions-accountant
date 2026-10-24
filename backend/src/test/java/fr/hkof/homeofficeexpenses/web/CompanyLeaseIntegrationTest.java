package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyLeaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("A company links one lease, rejects a lease of another company and deletes its employees")
    void linksLeaseAndCascadesDeletion() throws Exception {
        long landlordId = id("/api/landlords", """
                {"name":"Bailleur société test","address":"1 rue du Bail"}
                """);
        long tenantId = id("/api/tenants", """
                {"name":"Locataire société test","address":"2 rue du Bail"}
                """);
        long leaseId = id("/api/leases", """
                {"companyLease":true,"landlordId":%d,"tenantId":%d,
                 "propertyAddress":"3 rue du Bail, 75002 Paris","rentExclCharges":"800.00",
                 "totalArea":"80","businessArea":"20"}
                """.formatted(landlordId, tenantId));

        String company = mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société bail test","leaseId":%d}
                                """.formatted(leaseId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.leaseId").value(leaseId))
                .andExpect(jsonPath("$.proRataBase").value("25.00"))
                .andReturn().getResponse().getContentAsString();
        long companyId = ((Number) JsonPath.read(company, "$.id")).longValue();

        mockMvc.perform(post("/api/companies/{id}/employees", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"firstName":"Alice","lastName":"Martin","title":"CEO"}
                                """.formatted(companyId)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Autre société test","leaseId":%d}
                                """.formatted(leaseId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ce bail est déjà lié à une autre société."));

        String empty = mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Société sans bail test"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.leaseId").doesNotExist())
                .andExpect(jsonPath("$.proRataBase").value("0.00"))
                .andExpect(jsonPath("$.proRataBaseDetail").value("Surfaces non configurées"))
                .andReturn().getResponse().getContentAsString();
        long emptyCompanyId = ((Number) JsonPath.read(empty, "$.id")).longValue();

        mockMvc.perform(delete("/api/companies/{id}", companyId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.companyId == null)]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id == " + leaseId + " && @.companyLease == true)]").isNotEmpty());

        mockMvc.perform(get("/api/companies/{id}/employees", companyId))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/companies/{id}", emptyCompanyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/leases/{id}", leaseId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/tenants/{id}", tenantId))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/landlords/{id}", landlordId))
                .andExpect(status().isNoContent());
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
