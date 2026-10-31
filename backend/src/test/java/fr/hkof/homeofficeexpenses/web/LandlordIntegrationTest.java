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
class LandlordIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("A landlord round-trips through create, list, update and logical deletion")
    void crud() throws Exception {
        String created = mockMvc.perform(post("/api/landlords")
                        .contentType(JSON)
                        .content("""
                                {"name":"  Bailleur API  ","address":"  1 rue du Bail  ",
                                 "phone":" 06 11 22 33 44 ","addressNote":"  Bâtiment A  ",
                                 "issuePlace":"  Lyon  "}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bailleur API"))
                .andExpect(jsonPath("$.address").value("1 rue du Bail"))
                .andExpect(jsonPath("$.phone").value("06 11 22 33 44"))
                .andExpect(jsonPath("$.addressNote").value("Bâtiment A"))
                .andExpect(jsonPath("$.issuePlace").value("Lyon"))
                .andExpect(jsonPath("$.signatureCount").value(0))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.id")).longValue();

        mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].name").value("Bailleur API"));

        mockMvc.perform(put("/api/landlords/{id}", id)
                        .contentType(JSON)
                        .content("""
                                {"name":"Bailleur API 2","address":"2 rue du Bail"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bailleur API 2"))
                .andExpect(jsonPath("$.issuePlace").doesNotExist());

        mockMvc.perform(delete("/api/landlords/{id}", id)).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
    }

    @Test
    @DisplayName("A blank landlord name and an unknown landlord are rejected in French")
    void validation() throws Exception {
        mockMvc.perform(post("/api/landlords").contentType(JSON).content("{\"name\":\"  \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le nom du bailleur est obligatoire."))
                .andExpect(jsonPath("$.code").value("LANDLORD_NAME_REQUIRED"));

        mockMvc.perform(put("/api/landlords/{id}", 999999)
                        .contentType(JSON)
                        .content("{\"name\":\"Bailleur inconnu\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bailleur introuvable."));
    }

    @Test
    @DisplayName("A landlord used by an active lease cannot be deleted")
    void deletionGuardedByLease() throws Exception {
        long landlordId = create("/api/landlords", "{\"name\":\"Bailleur lié\"}");
        long tenantId = create("/api/tenants", "{\"name\":\"Locataire lié\"}");
        String lease = mockMvc.perform(post("/api/leases")
                        .contentType(JSON)
                        .content("""
                                {"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"9 rue du Bail, 75002 Paris","rentExclCharges":"800.00"}
                                """.formatted(landlordId, tenantId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long leaseId = ((Number) JsonPath.read(lease, "$.id")).longValue();

        mockMvc.perform(delete("/api/landlords/{id}", landlordId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail")
                        .value("Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé."));

        mockMvc.perform(delete("/api/leases/{id}", leaseId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/landlords/{id}", landlordId)).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/tenants/{id}", tenantId)).andExpect(status().isNoContent());
    }

    private long create(String path, String body) throws Exception {
        String created = mockMvc.perform(post(path).contentType(JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(created, "$.id")).longValue();
    }
}
