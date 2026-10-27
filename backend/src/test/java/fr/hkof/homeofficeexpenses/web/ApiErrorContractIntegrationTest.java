package fr.hkof.homeofficeexpenses.web;

import static org.hamcrest.Matchers.instanceOf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.hkof.homeofficeexpenses.service.BusinessException;

/**
 * Full-context contract tests: Boot's own {@code ProblemDetailsExceptionHandler} is
 * registered at order 0 when {@code spring.mvc.problemdetails.enabled} is true, so only a
 * context-backed MockMvc can prove that the application advice wins and sets {@code code}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(ApiErrorContractIntegrationTest.ParamsProbeController.class)
class ApiErrorContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("A malformed JSON body carries the INVALID_BODY code")
    void malformedBodyCarriesCode() throws Exception {
        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_BODY"));
    }

    @Test
    @DisplayName("A missing query parameter carries the MISSING_OR_INVALID_PARAMETER code")
    void missingParameterCarriesCode() throws Exception {
        mockMvc.perform(get("/api/expense-items"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_OR_INVALID_PARAMETER"));
    }

    @Test
    @DisplayName("A mistyped query parameter carries the MISSING_OR_INVALID_PARAMETER code")
    void mistypedParameterCarriesCode() throws Exception {
        mockMvc.perform(get("/api/expense-items").param("companyId", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MISSING_OR_INVALID_PARAMETER"));
    }

    @Test
    @DisplayName("An unknown route carries the RESOURCE_NOT_FOUND code")
    void unknownRouteCarriesCode() throws Exception {
        mockMvc.perform(get("/api/definitely-not-a-route"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("An unsupported method answers 405 with METHOD_NOT_ALLOWED, not 500")
    void unsupportedMethodCarriesCode() throws Exception {
        mockMvc.perform(put("/api/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.title").value("Méthode non autorisée"))
                .andExpect(jsonPath("$.detail").value("Cette action n'est pas autorisée pour cette adresse."));
    }

    @Test
    @DisplayName("An unsupported media type answers 415 with UNSUPPORTED_MEDIA_TYPE")
    void unsupportedMediaTypeCarriesCode() throws Exception {
        mockMvc.perform(post("/api/companies")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("texte"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"))
                .andExpect(jsonPath("$.title").value("Format non pris en charge"));
    }

    @Test
    @DisplayName("An unacceptable response format answers 406 with NOT_ACCEPTABLE")
    void notAcceptableCarriesCode() throws Exception {
        mockMvc.perform(get("/api/companies").accept(MediaType.APPLICATION_XML))
                .andExpect(status().isNotAcceptable())
                .andExpect(jsonPath("$.code").value("NOT_ACCEPTABLE"))
                .andExpect(jsonPath("$.title").value("Format non disponible"));
    }

    @Test
    @DisplayName("An unexpected failure answers 500 with INTERNAL_ERROR through the fallback advice")
    void unexpectedFailureCarriesCode() throws Exception {
        mockMvc.perform(get("/api/error-contract/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.title").value("Erreur interne"));
    }

    @Test
    @DisplayName("A real endpoint surfaces a core domain code")
    void coreDomainCodeOverHttp() throws Exception {
        mockMvc.perform(get("/api/rent-receipts").param("month", "2026-13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MONTH_INVALID"))
                .andExpect(jsonPath("$.detail").value("Le mois doit être au format AAAA-MM."));
    }

    @Test
    @DisplayName("ProblemDetail params are serialized as JSON strings")
    void paramsSerializeAsJsonStrings() throws Exception {
        mockMvc.perform(get("/api/error-contract/params-probe"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROBE_CODE"))
                .andExpect(jsonPath("$.params.month").value("2026-01"))
                .andExpect(jsonPath("$.params.count").value("3"))
                .andExpect(jsonPath("$.params.count").value(instanceOf(String.class)));
    }

    @RestController
    static class ParamsProbeController {

        @GetMapping("/api/error-contract/params-probe")
        void probe() {
            throw new BusinessException("PROBE_CODE", "Détail du problème.", Map.of("month", "2026-01", "count", "3"));
        }

        @GetMapping("/api/error-contract/boom")
        void boom() {
            throw new IllegalStateException("boom");
        }
    }
}
