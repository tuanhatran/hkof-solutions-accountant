package fr.hkof.homeofficeexpenses.web;

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

import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"test", "e2e"})
class E2eResetIntegrationTest {

    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private static final String CUSTOM_SIGNATURE_NAME = "Signature personnalisée e2e";

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("The e2e profile resets the database and files to their initial state")
    void resetsData() throws Exception {
        mockMvc.perform(put("/api/settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyName":"Test E2E","legalForm":"EURL","siren":"123 456 789",
                                 "companyAddress":"1 rue du Test, 75001 Paris","managerName":"Testeur",
                                 "homeAddress":"1 rue du Test, 75001 Paris","totalArea":"80",
                                 "businessArea":"32","issuePlace":"Paris"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/landlords")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bailleur Test e2e","address":"1 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"test-e2e","label":"Poste e2e","proRataPct":"35.71",
                                 "periodicity":"MONTHLY","active":true,"sortOrder":99,
                                 "multipleLinesAllowed":false}
                                """))
                .andExpect(status().isCreated());

        MockMultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain",
                "Justificatif de test e2e avec un contenu suffisant.".getBytes());
        String receipt = mockMvc.perform(multipart("/api/receipts").file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int receiptId = JsonPath.read(receipt, "$.id");

        mockMvc.perform(post("/api/e2e/reset"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("HKOF"))
                .andExpect(jsonPath("$.rentExclCharges").doesNotExist());
        mockMvc.perform(get("/api/landlords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Nom du bailleur"))
                .andExpect(jsonPath("$[?(@.name == 'Bailleur Test e2e')]").isEmpty());
        mockMvc.perform(get("/api/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Nom du locataire"));
        mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].propertyAddress").value("12 rue de la République, 75000 Paris"))
                .andExpect(jsonPath("$[0].rentExclCharges").value("1300.00"))
                .andExpect(jsonPath("$[0].charges").value("0.00"));
        mockMvc.perform(get("/api/rent-receipts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/expense-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[?(@.code == 'test-e2e')]").isEmpty());
        mockMvc.perform(get("/api/receipts/" + receiptId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("The e2e reset drops custom signatures and seeds one landlord and one CEO signature")
    void resetSeedsDefaultSignatures() throws Exception {
        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature-personnalisee.png", "image/png", PNG))
                        .param("type", "LANDLORD")
                        .param("name", CUSTOM_SIGNATURE_NAME))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/e2e/reset"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/signatures"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.type == 'LANDLORD')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type == 'ENTREPRISE_CEO')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.mimeType != 'image/png')]").isEmpty())
                .andExpect(jsonPath("$[?(@.name == '" + CUSTOM_SIGNATURE_NAME + "')]").isEmpty());
    }
}
