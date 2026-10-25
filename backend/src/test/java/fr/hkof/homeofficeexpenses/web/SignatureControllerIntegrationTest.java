package fr.hkof.homeofficeexpenses.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
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
class SignatureControllerIntegrationTest {

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void ensureSignatures() throws Exception {
        ensureSignature(landlordId(), "Signature bailleur");
        ensureSignature(ceoEmployeeId(), "Signature gérant");
    }

    @Test
    @DisplayName("Creates, lists, serves the image and logically deletes a signature")
    void crudSignature() throws Exception {
        long personId = landlordId();
        String created = mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("personId", String.valueOf(personId))
                        .param("name", "Signature principale"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.personId").value(personId))
                .andExpect(jsonPath("$.personName").value("Nom du bailleur"))
                .andExpect(jsonPath("$.name").value("Signature principale"))
                .andExpect(jsonPath("$.mimeType").value("image/png"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.id")).longValue();

        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(personId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isNotEmpty());

        mockMvc.perform(get("/api/signatures/{id}/image", id))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(PNG));

        mockMvc.perform(delete("/api/signatures/{id}", id))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/signatures/{id}/image", id))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(personId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
    }

    @Test
    @DisplayName("Listing signatures requires a person")
    void listRequiresPerson() throws Exception {
        mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Lists only the signatures of the selected person")
    void listsPersonSignatures() throws Exception {
        long ceoId = ceoEmployeeId();
        mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(ceoId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isNotEmpty())
                .andExpect(jsonPath("$[?(@.personId != " + ceoId + ")]").isEmpty())
                .andExpect(jsonPath("$[?(@.personName == 'Gérant')]").isNotEmpty());

        mockMvc.perform(get("/api/signatures").param("personId", "999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Personne introuvable."));
    }

    @Test
    @DisplayName("Rejects an invalid image, a blank name and an unknown person in French")
    void rejectsInvalidUpload() throws Exception {
        long personId = landlordId();
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.gif", "image/gif", PNG))
                        .param("personId", String.valueOf(personId))
                        .param("name", "Bailleur"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("La signature doit être une image PNG ou JPEG."));

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("personId", String.valueOf(personId))
                        .param("name", "  "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le nom de la signature est obligatoire."));

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("personId", "999999")
                        .param("name", "Personne inconnue"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Personne introuvable."));
    }

    @Test
    @DisplayName("Document generation is blocked while no signature is configured")
    void noSignatureBlocksGeneration() throws Exception {
        removePersonSignatures(landlordId());
        removePersonSignatures(ceoEmployeeId());
        long companyId = firstId("/api/companies");

        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2030-01","landlordId":%d,"tenantCompanyId":%d}
                                """.formatted(landlordId(), companyId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Aucune signature configurée. Ajoutez une signature au bailleur dans la page LMNP."));

        mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"month":"2030-02","lines":[
                                  {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71"}
                                ]}
                                """.formatted(companyId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Aucune signature configurée pour le gérant. "
                                + "Ajoutez une signature au salarié gérant dans la page LMNP."));
    }

    private void ensureSignature(long personId, String name) throws Exception {
        String list = mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(personId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Object> existing = JsonPath.read(list, "$[?(@.personId == " + personId + ")]");
        if (existing.isEmpty()) {
            mockMvc.perform(multipart("/api/signatures")
                            .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                            .param("personId", String.valueOf(personId))
                            .param("name", name))
                    .andExpect(status().isCreated());
        }
    }

    private void removePersonSignatures(long personId) throws Exception {
        String list = mockMvc.perform(get("/api/signatures").param("personId", String.valueOf(personId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(list, "$[*].id");
        for (Number id : ids) {
            mockMvc.perform(delete("/api/signatures/{id}", id.longValue()))
                    .andExpect(status().isNoContent());
        }
    }

    private long landlordId() throws Exception {
        String list = mockMvc.perform(get("/api/persons"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(list, "$[?(@.name == 'Nom du bailleur')].id");
        return ids.get(0).longValue();
    }

    private long firstId(String path) throws Exception {
        String list = mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(list, "$[0].id");
        return id.longValue();
    }

    private long ceoEmployeeId() throws Exception {
        long companyId = firstId("/api/companies");
        String body = mockMvc.perform(get("/api/companies/{companyId}/employees", companyId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$[0].id");
        return id.longValue();
    }
}
