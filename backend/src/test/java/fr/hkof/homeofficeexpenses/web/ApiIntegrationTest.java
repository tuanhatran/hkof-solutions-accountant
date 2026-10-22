package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Parcourt le flux complet : paramètres, quittance, note de frais, justificatif, templates, LLM")
    void fluxComplet() throws Exception {
        mockMvc.perform(get("/api/parametres"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.prorataBase").value("35.71"))
                .andExpect(jsonPath("$.loyerHc").value("900.00"));

        mockMvc.perform(get("/api/postes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6));

        String quittance = mockMvc.perform(post("/api/quittances")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mois":"2026-11"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.statut").value("ACTIVE"))
                .andExpect(jsonPath("$.total").value("950.00"))
                .andExpect(jsonPath("$.periodeDebut").value("2026-11-01"))
                .andExpect(jsonPath("$.periodeFin").value("2026-11-30"))
                .andReturn().getResponse().getContentAsString();
        long quittanceId = ((Number) JsonPath.read(quittance, "$.id")).longValue();

        MvcResult pdf = mockMvc.perform(get("/api/quittances/{id}/pdf", quittanceId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("quittance_2026-11.pdf")))
                .andReturn();
        assertThat(pdf.getResponse().getContentAsByteArray()).startsWith("%PDF".getBytes(StandardCharsets.US_ASCII));

        mockMvc.perform(post("/api/quittances/apercu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mois":"2026-12"}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));
        mockMvc.perform(get("/api/quittances").param("mois", "2026-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        MockMultipartFile fichier = new MockMultipartFile("fichier", "facture-gaz.txt", "text/plain",
                "EDF - Gaz\nTotal TTC : 78,00 EUR\n".getBytes(StandardCharsets.UTF_8));
        String justificatif = mockMvc.perform(multipart("/api/justificatifs").file(fichier))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nomFichier").value("facture-gaz.txt"))
                .andReturn().getResponse().getContentAsString();
        long justificatifId = ((Number) JsonPath.read(justificatif, "$.id")).longValue();

        mockMvc.perform(get("/api/justificatifs/{id}/fichier", justificatifId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN));

        String noteJson = """
                {
                  "mois":"2026-11",
                  "lignes":[
                    {"posteCode":"loyer","montantTtc":"950.00","prorataPct":"100"},
                    {"posteCode":"gaz","montantTtc":"80.00","prorataPct":"35,71","justificatifId":%d}
                  ]
                }
                """.formatted(justificatifId);

        mockMvc.perform(post("/api/notes-frais/calcul")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value("978.57"))
                .andExpect(jsonPath("$.lignes[1].montantRetenu").value("28.57"))
                .andExpect(jsonPath("$.lignes[1].justificatifNom").value("facture-gaz.txt"))
                .andExpect(jsonPath("$.totalEnLettres")
                        .value("neuf cent soixante-dix-huit euros et cinquante-sept centimes"));

        mockMvc.perform(post("/api/notes-frais/apercu")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mois":"2026-11","complet":true,"lignes":[
                                  {"posteCode":"loyer","montantTtc":"950.00","prorataPct":"100"},
                                  {"posteCode":"gaz","montantTtc":"80.00","prorataPct":"35,71"}
                                ]}
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        String note = mockMvc.perform(post("/api/notes-frais")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(noteJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.numero").value("NF-2026-11"))
                .andExpect(jsonPath("$.total").value("978.57"))
                .andExpect(jsonPath("$.pdfCompletDisponible").value(true))
                .andReturn().getResponse().getContentAsString();
        long noteId = ((Number) JsonPath.read(note, "$.id")).longValue();

        MvcResult complet = mockMvc.perform(get("/api/notes-frais/{id}/pdf", noteId)
                        .param("complet", "true"))
                .andExpect(status().isOk())
                .andReturn();
        try (PDDocument document = PDDocument.load(complet.getResponse().getContentAsByteArray())) {
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(3);
        }

        mockMvc.perform(delete("/api/justificatifs/{id}", justificatifId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé."));

        mockMvc.perform(get("/api/templates").param("type", "NOTE_FRAIS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].integre").value(true))
                .andExpect(jsonPath("$[0].actif").value(true));

        mockMvc.perform(get("/api/templates/defaut/QUITTANCE"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("QUITTANCE DE LOYER")));

        mockMvc.perform(post("/api/templates/{id}/apercu", 1))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF));

        mockMvc.perform(get("/api/admin/llm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urlDistante").value(false))
                .andExpect(jsonPath("$.apiKeyConfiguree").value(false));

        mockMvc.perform(put("/api/admin/llm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"https://llm.exemple.fr","cleApi":"secret-de-test"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urlDistante").value(true))
                .andExpect(jsonPath("$.avertissement").isNotEmpty())
                .andExpect(jsonPath("$.apiKeyConfiguree").value(true));

        String config = mockMvc.perform(get("/api/admin/llm"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(config).doesNotContain("secret-de-test");

        mockMvc.perform(put("/api/admin/llm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"url":"http://localhost:11434","cleApi":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.urlDistante").value(false))
                .andExpect(jsonPath("$.apiKeyConfiguree").value(false));

        mockMvc.perform(get("/api/quittances/{id}", 999_999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Ressource introuvable"))
                .andExpect(jsonPath("$.detail").value("Quittance introuvable."));
    }
}
