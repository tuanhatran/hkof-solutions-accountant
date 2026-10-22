package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "e2e"})
class E2eResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Le profil e2e remet la base et les fichiers dans leur état initial")
    void reinitialisation() throws Exception {
        mockMvc.perform(put("/api/parametres")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"raisonSociale":"Test E2E","formeJuridique":"EURL","siren":"123 456 789",
                                 "societeAdresse":"1 rue du Test, 75001 Paris","gerant":"Testeur",
                                 "logementAdresse":"1 rue du Test, 75001 Paris","surfaceTotale":"80",
                                 "surfacePro":"32","bailleurNom":"Bailleur Test","bailleurAdresse":"Adresse",
                                 "locataireNom":"Locataire Test","locataireAdresse":"Adresse",
                                 "loyerHc":"1000","provisionCharges":"100","lieuEmission":"Paris"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/postes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"test-e2e","libelle":"Poste e2e","prorataPct":"35.71",
                                 "periodicite":"MONTHLY","actif":true,"ordre":99,
                                 "plusieursLignesAutorisees":false}
                                """))
                .andExpect(status().isCreated());

        MockMultipartFile file = new MockMultipartFile("fichier", "note.txt", "text/plain",
                "Justificatif de test e2e avec un contenu suffisant.".getBytes());
        String receipt = mockMvc.perform(multipart("/api/justificatifs").file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int receiptId = JsonPath.read(receipt, "$.id");

        mockMvc.perform(post("/api/e2e/reset"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/parametres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.raisonSociale").value("HKOF"))
                .andExpect(jsonPath("$.loyerHc").value("900.00"));
        mockMvc.perform(get("/api/postes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[?(@.code == 'test-e2e')]").isEmpty());
        mockMvc.perform(get("/api/justificatifs/" + receiptId))
                .andExpect(status().isNotFound());
    }
}
