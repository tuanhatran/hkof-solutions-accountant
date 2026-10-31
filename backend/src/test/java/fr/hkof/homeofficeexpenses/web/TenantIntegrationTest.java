package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class TenantIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("A tenant round-trips through create, list, update and logical deletion")
    void crud() throws Exception {
        String created = mockMvc.perform(post("/api/tenants")
                        .contentType(JSON)
                        .content("""
                                {"name":"  Locataire API  ","address":"  2 rue du Bail  ",
                                 "phone":" 07 11 22 33 44 ","email":"  locataire@example.test  ",
                                 "addressNote":"  Étage 2  "}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Locataire API"))
                .andExpect(jsonPath("$.address").value("2 rue du Bail"))
                .andExpect(jsonPath("$.phone").value("07 11 22 33 44"))
                .andExpect(jsonPath("$.email").value("locataire@example.test"))
                .andExpect(jsonPath("$.addressNote").value("Étage 2"))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.id")).longValue();

        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].email").value("locataire@example.test"));

        mockMvc.perform(put("/api/tenants/{id}", id)
                        .contentType(JSON)
                        .content("""
                                {"name":"Locataire API 2","email":"   "}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Locataire API 2"))
                .andExpect(jsonPath("$.email").isEmpty());

        mockMvc.perform(delete("/api/tenants/{id}", id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
    }

    @Test
    @DisplayName("A blank tenant name and an unknown tenant are rejected in French")
    void validation() throws Exception {
        mockMvc.perform(post("/api/tenants").contentType(JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le nom du locataire est obligatoire."))
                .andExpect(jsonPath("$.code").value("TENANT_NAME_REQUIRED"));

        mockMvc.perform(put("/api/tenants/{id}", 999999)
                        .contentType(JSON)
                        .content("{\"name\":\"Locataire inconnu\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Locataire introuvable."));
    }

    @Test
    @DisplayName("A tenant linked to an active lease cannot be deleted")
    void deletionGuardedByLease() throws Exception {
        long landlordId = create("/api/landlords", "{\"name\":\"Bailleur locatif\"}");
        long tenantId = create("/api/tenants", "{\"name\":\"Locataire lié\"}");
        String lease = mockMvc.perform(post("/api/leases")
                        .contentType(JSON)
                        .content("""
                                {"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"10 rue du Bail, 75002 Paris","rentExclCharges":"800.00"}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long leaseId = ((Number) JsonPath.read(lease, "$.id")).longValue();

        mockMvc.perform(delete("/api/tenants/{id}", tenantId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail")
                        .value("Ce locataire est utilisé par un bail actif et ne peut pas être supprimé."));

        mockMvc.perform(delete("/api/leases/{id}", leaseId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/tenants/{id}", tenantId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/landlords/{id}", landlordId)).andExpect(status().isNoContent());
    }

    private long create(String path, String body) throws Exception {
        String created = mockMvc.perform(post(path).contentType(JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(created, "$.id")).longValue();
    }
}
