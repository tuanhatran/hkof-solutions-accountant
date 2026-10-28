package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
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
        long companyId = firstId("/api/companies");
        String seedLeases = mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long leaseId = ((Number) JsonPath.read(seedLeases, "$[0].id")).longValue();
        mockMvc.perform(put("/api/companies/{id}", companyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Test E2E","legalForm":"EURL","siren":"123 456 789",
                                 "address":"1 rue du Test, 75001 Paris","managerName":"Testeur",
                                 "leaseId":%d,"issuePlace":"Paris"}
                                """.formatted(leaseId)))
                .andExpect(status().isOk());

        String landlord = mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bailleur Test e2e","address":"1 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String tenant = mockMvc.perform(post("/api/persons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Locataire Test e2e","address":"2 rue du Test, 75001 Paris"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        mockMvc.perform(post("/api/leases")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyLease":false,"landlordId":%d,"tenantId":%d,
                                 "propertyAddress":"9 rue du Test, 75001 Paris","rentExclCharges":"800.00"}
                                """.formatted(((Number) JsonPath.read(landlord, "$.id")).longValue(),
                        ((Number) JsonPath.read(tenant, "$.id")).longValue())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/expense-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"companyId":%d,"code":"test-e2e","label":"Poste e2e","proRataPct":"35.71",
                                 "periodicity":"MONTHLY","active":true,"sortOrder":99,
                                 "multipleLinesAllowed":false}
                                """.formatted(companyId)))
                .andExpect(status().isCreated());

        MockMultipartFile file = new MockMultipartFile("file", "note.txt", "text/plain",
                "Justificatif de test e2e avec un contenu suffisant.".getBytes());
        String receipt = mockMvc.perform(multipart("/api/receipts").file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int receiptId = JsonPath.read(receipt, "$.id");

        mockMvc.perform(post("/api/e2e/reset"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("HKOF"));
        String persons = mockMvc.perform(get("/api/persons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.name == 'Nom du bailleur')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.name == 'Nom du locataire')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.name == 'Bailleur Test e2e')]").isEmpty())
                .andReturn().getResponse().getContentAsString();
        List<String> seededPlaces = JsonPath.read(persons, "$[?(@.name == 'Nom du bailleur')].issuePlace");
        assertThat(seededPlaces).containsExactly("Paris");
        long landlordId = idByName(persons, "Nom du bailleur");
        long tenantId = idByName(persons, "Nom du locataire");

        String resetAddresses = mockMvc.perform(get("/api/addresses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].label").value("12 rue de la République, 75000 Paris"))
                .andReturn().getResponse().getContentAsString();
        long addressId = ((Number) JsonPath.read(resetAddresses, "$[0].id")).longValue();

        String leases = mockMvc.perform(get("/api/leases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.companyLease == true && @.landlordId == " + landlordId
                        + " && @.tenantId == null)]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.companyLease == false && @.landlordId == " + landlordId
                        + " && @.tenantId == " + tenantId + ")]").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        List<Number> companyLeaseAddresses = JsonPath.read(leases,
                "$[?(@.companyLease == true)].addressId");
        assertThat(companyLeaseAddresses.stream().map(Number::longValue).toList()).containsExactly(addressId);
        assertThat(JsonPath.<List<String>>read(leases, "$[*].propertyAddress"))
                .containsOnly("12 rue de la République, 75000 Paris");

        mockMvc.perform(get("/api/rent-receipts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/expense-items").param("companyId", String.valueOf(firstId("/api/companies"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[?(@.code == 'test-e2e')]").isEmpty());
        mockMvc.perform(get("/api/receipts/" + receiptId))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("The e2e reset drops custom signatures and seeds one signature per seeded person")
    void resetSeedsDefaultSignatures() throws Exception {
        String persons = mockMvc.perform(get("/api/persons"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long landlordId = idByName(persons, "Nom du bailleur");

        mockMvc.perform(multipart("/api/signatures")
                        .file(new MockMultipartFile("file", "signature-personnalisee.png", "image/png", PNG))
                        .param("personId", String.valueOf(landlordId))
                        .param("name", CUSTOM_SIGNATURE_NAME))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/e2e/reset"))
                .andExpect(status().isNoContent());

        String resetPersons = mockMvc.perform(get("/api/persons"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long landlordPersonId = idByName(resetPersons, "Nom du bailleur");
        long tenantPersonId = idByName(resetPersons, "Nom du locataire");
        long ceoId = ceoEmployeeId();

        List<Long> seededPersonIds = new ArrayList<>();
        List<String> seededPersonNames = new ArrayList<>();
        for (long personId : List.of(landlordPersonId, tenantPersonId, ceoId)) {
            String signatures = mockMvc.perform(get("/api/signatures")
                            .param("personId", String.valueOf(personId)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[?(@.name == '" + CUSTOM_SIGNATURE_NAME + "')]").isEmpty())
                    .andExpect(jsonPath("$[?(@.mimeType != 'image/png')]").isEmpty())
                    .andReturn().getResponse().getContentAsString();
            seededPersonIds.addAll(signaturePersonIds(signatures));
            seededPersonNames.addAll(JsonPath.read(signatures, "$[*].personName"));
        }
        assertThat(seededPersonIds)
                .containsExactlyInAnyOrder(landlordPersonId, tenantPersonId, ceoId);
        assertThat(seededPersonNames)
                .contains("Nom du bailleur", "Nom du locataire", "Gérant");
    }

    private List<Long> signaturePersonIds(String signatures) {
        return JsonPath.<List<Number>>read(signatures, "$[*].personId").stream().map(Number::longValue).toList();
    }

    private long idByName(String body, String name) {
        List<Number> ids = JsonPath.read(body, "$[?(@.name == '" + name + "')].id");
        return ids.get(0).longValue();
    }

    private long firstId(String path) throws Exception {
        String body = mockMvc.perform(get(path))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$[0].id")).longValue();
    }

    private long ceoEmployeeId() throws Exception {
        String body = mockMvc.perform(get("/api/companies/{companyId}/employees", firstId("/api/companies")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$[0].id")).longValue();
    }
}
