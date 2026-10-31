package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgencyIntegrationTest {

    private static final String JSON = MediaType.APPLICATION_JSON_VALUE;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /api/agency returns the seeded agency profile")
    void getAgency() throws Exception {
        mockMvc.perform(get("/api/agency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.isPersonal").isBoolean());
    }

    @Test
    @DisplayName("PUT /api/agency saves professional agency and returns it")
    void saveProfessionalAgency() throws Exception {
        String body = """
                {
                    "name": "Agence Immo Prestige",
                    "isPersonal": false,
                    "managerName": "Dupont",
                    "legalForm": "SAS",
                    "siren": "123456789",
                    "siret": "12345678900014",
                    "address": "15 rue Royale, Paris"
                }
                """;

        mockMvc.perform(put("/api/agency").contentType(JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Agence Immo Prestige"))
                .andExpect(jsonPath("$.isPersonal").value(false))
                .andExpect(jsonPath("$.managerName").value("Dupont"))
                .andExpect(jsonPath("$.legalForm").value("SAS"))
                .andExpect(jsonPath("$.siren").value("123456789"))
                .andExpect(jsonPath("$.siret").value("12345678900014"))
                .andExpect(jsonPath("$.address").value("15 rue Royale, Paris"));

        mockMvc.perform(get("/api/agency"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Agence Immo Prestige"));
    }

    @Test
    @DisplayName("PUT /api/agency with isPersonal = true clears corporate fields")
    void savePersonalAgency() throws Exception {
        String body = """
                {
                    "name": "Gestion Propre Dupont",
                    "isPersonal": true,
                    "managerName": "Jean Dupont",
                    "legalForm": "SARL",
                    "siren": "999888777",
                    "siret": "99988877700012",
                    "address": "Ignored address"
                }
                """;

        mockMvc.perform(put("/api/agency").contentType(JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Gestion Propre Dupont"))
                .andExpect(jsonPath("$.isPersonal").value(true))
                .andExpect(jsonPath("$.managerName").value("Jean Dupont"))
                .andExpect(jsonPath("$.legalForm").doesNotExist())
                .andExpect(jsonPath("$.siren").doesNotExist())
                .andExpect(jsonPath("$.siret").doesNotExist())
                .andExpect(jsonPath("$.address").doesNotExist());
    }
}
