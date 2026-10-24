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
        ensureSignature("LANDLORD", "Signature bailleur", firstId("/api/landlords"), null);
        ensureSignature("ENTREPRISE_CEO", "Signature gérant", null, ceoEmployeeId());
    }

    @Test
    @DisplayName("Creates, lists, serves the image and logically deletes a signature")
    void crudSignature() throws Exception {
        long landlordId = seededLandlordId();
        String created = mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("landlordId", String.valueOf(landlordId))
                        .param("name", "Signature principale"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("LANDLORD"))
                .andExpect(jsonPath("$.name").value("Signature principale"))
                .andExpect(jsonPath("$.mimeType").value("image/png"))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.landlordId").value(landlordId))
                .andExpect(jsonPath("$.landlordName").value("Nom du bailleur"))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(created, "$.id")).longValue();

        mockMvc.perform(get("/api/signatures"))
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
        mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")]").isEmpty());
    }

    @Test
    @DisplayName("Lists the global landlord signatures with the company employee signatures")
    void listsLandlordSignaturesForCompany() throws Exception {
        long companyId = firstId("/api/companies");
        mockMvc.perform(get("/api/signatures").param("companyId", String.valueOf(companyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'LANDLORD')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type == 'ENTREPRISE_CEO')]").isNotEmpty());
    }

    @Test
    @DisplayName("Requires a landlord for a LANDLORD signature and forbids one for the CEO")
    void enforcesSignatureLandlord() throws Exception {
        long landlordId = seededLandlordId();
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("name", "Sans bailleur"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le bailleur de la signature est obligatoire."));

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("landlordId", "999999")
                        .param("name", "Bailleur inconnu"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Bailleur introuvable."));

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("type", "ENTREPRISE_CEO")
                        .param("landlordId", String.valueOf(landlordId))
                        .param("name", "Gérant lié"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Une signature de gérant ne peut pas être liée à un bailleur."));
    }

    @Test
    @DisplayName("Rejects an invalid image and a blank name with a French message")
    void rejectsInvalidUpload() throws Exception {
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.gif", "image/gif", PNG))
                        .param("type", "LANDLORD")
                        .param("name", "Bailleur"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("La signature doit être une image PNG ou JPEG."));

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("name", "  "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Le nom de la signature est obligatoire."));
    }

    @Test
    @DisplayName("Document generation is blocked while no signature is configured")
    void noSignatureBlocksGeneration() throws Exception {
        for (long id : signatureIds()) {
            mockMvc.perform(delete("/api/signatures/{id}", id)).andExpect(status().isNoContent());
        }

        mockMvc.perform(post("/api/rent-receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"month":"2030-01","companyId":%d,"landlordId":%d,"tenantId":%d}
                                """.formatted(firstId("/api/companies"), firstId("/api/landlords"),
                                        firstId("/api/tenants"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Aucune signature configurée. Configurez une signature dans la page Paramètres."));

        mockMvc.perform(post("/api/expense-statements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"month":"2030-02","lines":[
                                  {"itemCode":"gaz","amountInclVat":"80.00","proRataPct":"35,71"}
                                ]}
                                """.formatted(firstId("/api/companies"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "Aucune signature configurée. Configurez une signature dans la page Paramètres."));
    }

    private long firstId(String path) throws Exception {
        String list = mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(list, "$[0].id");
        return id.longValue();
    }

    private long seededLandlordId() throws Exception {
        String list = mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(list, "$[?(@.name == 'Nom du bailleur')].id");
        return ids.get(0).longValue();
    }

    private List<Long> signatureIds() throws Exception {
        String list = mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Number> ids = JsonPath.read(list, "$[*].id");
        return ids.stream().map(Number::longValue).toList();
    }

    private void ensureSignature(String type, String name, Long landlordId, Long employeeId) throws Exception {
        String list = mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<?> existing = JsonPath.read(list, "$[?(@.type == '" + type + "')]");
        if (existing.isEmpty()) {
            var request = multipart("/api/signatures")
                    .file(new MockMultipartFile("file", "signature.png", "image/png", PNG))
                    .param("type", type)
                    .param("name", name);
            if (landlordId != null) {
                request.param("landlordId", String.valueOf(landlordId));
            }
            if (employeeId != null) {
                request.param("employeeId", String.valueOf(employeeId));
            }
            mockMvc.perform(request).andExpect(status().isCreated());
        }
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
