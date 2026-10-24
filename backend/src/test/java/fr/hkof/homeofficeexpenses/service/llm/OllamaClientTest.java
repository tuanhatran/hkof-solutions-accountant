package fr.hkof.homeofficeexpenses.service.llm;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;

import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import tools.jackson.databind.json.JsonMapper;

class OllamaClientTest {

    private WireMockServer serveur;
    private OllamaClient client;
    private LlmConfig config;

    @BeforeEach
    void start() {
        serveur = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        serveur.start();
        client = new OllamaClient(JsonMapper.shared());
        config = new LlmConfig();
        config.setUrl(serveur.baseUrl());
        config.setModel("llama-test:latest");
        config.setTimeoutSeconds(5);
        config.setTemperature(java.math.BigDecimal.ZERO);
        config.setNumCtx(4096);
    }

    @AfterEach
    void stop() {
        serveur.stop();
    }

    @Test
    @DisplayName("Lists installed models via /api/tags")
    void models() {
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(okJson("""
                {"models":[
                  {"name":"llama-test:latest","details":{"family":"llama","parameter_size":"8B"}},
                  {"name":"vision-test:latest","details":{"family":"llava","parameter_size":"7B"}}
                ]}
                """)));

        var models = client.models(config);

        assertThat(models).hasSize(2);
        assertThat(models.get(0).name()).isEqualTo("llama-test:latest");
        assertThat(models.get(0).parameters()).isEqualTo("8B");
        assertThat(models.get(1).vision()).isTrue();
    }

    @Test
    @DisplayName("Sends the JSON schema and options to /api/chat")
    void chat() {
        serveur.stubFor(post(urlEqualTo("/api/chat")).willReturn(okJson("""
                {"message":{"role":"assistant","content":"{\\"montant_ttc\\":\\"78.00\\"}"},"done":true}
                """)));

        String content = client.chat(config, "Prompt système", "Contenu du document",
                List.of("aW1hZ2U="));

        assertThat(content).contains("78.00");
        serveur.verify(postRequestedFor(urlEqualTo("/api/chat"))
                .withRequestBody(matchingJsonPath("$.model", equalTo("llama-test:latest")))
                .withRequestBody(matchingJsonPath("$.stream", equalTo("false")))
                .withRequestBody(matchingJsonPath("$.format.type", equalTo("object")))
                .withRequestBody(matchingJsonPath("$.messages[0].role", equalTo("system")))
                .withRequestBody(matchingJsonPath("$.messages[1].images[0]", equalTo("aW1hZ2U="))));
    }

    @Test
    @DisplayName("Detects the vision capability via /api/show")
    void vision() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(okJson("""
                {"capabilities":["completion","vision"]}
                """)));

        assertThat(client.supportsVision(config, "modele-vision")).isTrue();
    }

    @Test
    @DisplayName("A text model does not handle images")
    void withoutVision() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(okJson("""
                {"capabilities":["completion"]}
                """)));

        assertThat(client.supportsVision(config, "llama-test:latest")).isFalse();
    }

    @Test
    @DisplayName("Translates an Ollama error into a French message")
    void serverError() {
        serveur.stubFor(post(urlEqualTo("/api/chat")).willReturn(aResponse().withStatus(500)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"error\":\"model not found\"}")));

        assertThatThrownBy(() -> client.chat(config, "system", "document", List.of()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("service LLM a répondu 500");
    }

    @Test
    @DisplayName("An unreachable Ollama yields an actionable message")
    void serverUnreachable() {
        config.setUrl("http://127.0.0.1:1");

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("injoignable")
                .hasMessageContaining("saisissez le montant manuellement");
    }

    @Test
    @DisplayName("The model list falls back to the legacy model field and tolerates missing details")
    void modelsFallbackFields() {
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(okJson("""
                {"models":[
                  {"name":"","model":"legacy:latest"},
                  {"name":"plain"}
                ]}
                """)));

        var models = client.models(config);

        assertThat(models).hasSize(2);
        assertThat(models.get(0).name()).isEqualTo("legacy:latest");
        assertThat(models.get(0).family()).isEmpty();
        assertThat(models.get(1).name()).isEqualTo("plain");
    }

    @Test
    @DisplayName("A model list without a models array is empty")
    void modelsMissingArray() {
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(okJson("{\"other\":true}")));

        assertThat(client.models(config)).isEmpty();
    }

    @Test
    @DisplayName("A blank or null model never supports vision")
    void blankModelHasNoVision() {
        assertThat(client.supportsVision(config, null)).isFalse();
        assertThat(client.supportsVision(config, "   ")).isFalse();
    }

    @Test
    @DisplayName("Vision falls back to the model name when /api/show fails")
    void visionFallsBackToName() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(aResponse().withStatus(500)));

        assertThat(client.supportsVision(config, "llava:latest")).isTrue();
        assertThat(client.supportsVision(config, "llama-test:latest")).isFalse();
    }

    @Test
    @DisplayName("Vision falls back to the model name when capabilities are absent")
    void visionFallsBackWithoutCapabilities() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(okJson("{\"model_info\":{}}")));

        assertThat(client.supportsVision(config, "minicpm-v")).isTrue();
        assertThat(client.supportsVision(config, "llama-test:latest")).isFalse();
    }

    @Test
    @DisplayName("A model without a configured name is rejected before any call")
    void chatWithoutModel() {
        config.setModel("  ");

        assertThatThrownBy(() -> client.chat(config, "system", "document", List.of()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Aucun modèle LLM");
    }

    @Test
    @DisplayName("An empty chat content is rejected")
    void chatWithoutContent() {
        serveur.stubFor(post(urlEqualTo("/api/chat")).willReturn(okJson("{\"message\":{\"content\":\"\"}}")));

        assertThatThrownBy(() -> client.chat(config, "system", "document", List.of()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("aucun contenu exploitable");
    }

    @Test
    @DisplayName("No image is sent when the image list is empty")
    void chatWithoutImages() {
        serveur.stubFor(post(urlEqualTo("/api/chat")).willReturn(okJson("""
                {"message":{"content":"{\\"montant_ttc\\":\\"78.00\\"}"}}
                """)));

        String content = client.chat(config, "system", "document", null);

        assertThat(content).contains("78.00");
        serveur.verify(postRequestedFor(urlEqualTo("/api/chat"))
                .withRequestBody(com.github.tomakehurst.wiremock.client.WireMock.notMatching(
                        ".*images.*")));
    }

    @Test
    @DisplayName("A configured API key is sent as a bearer token")
    void chatWithApiKey() {
        config.setApiKey("secret");
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(okJson("{\"models\":[]}")));

        client.models(config);

        serveur.verify(getRequestedFor(urlEqualTo("/api/tags"))
                .withHeader("Authorization", equalTo("Bearer secret")));
    }

    @Test
    @DisplayName("A blank URL is rejected before any HTTP call")
    void blankUrl() {
        config.setUrl("  ");

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM n'est pas configurée.");
    }

    @Test
    @DisplayName("A long error body is truncated in the French message")
    void longErrorBodyTruncated() {
        String body = "x".repeat(400);
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(aResponse().withStatus(400)
                .withHeader("Content-Type", "application/json").withBody(body)));

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("service LLM a répondu 400")
                .hasMessageContaining("x".repeat(300))
                .satisfies(error -> assertThat(error.getMessage()).doesNotContain("x".repeat(301)));
    }

    @Test
    @DisplayName("A blank error body keeps a complete French sentence")
    void blankErrorBody() {
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(aResponse().withStatus(502)));

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le service LLM a répondu 502.");
    }

    @Test
    @DisplayName("A malformed JSON response is reported as unreachable")
    void malformedJsonResponse() {
        serveur.stubFor(get(urlEqualTo("/api/tags")).willReturn(okJson("{not json")));

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("injoignable");
    }
}
