package fr.hkof.homeofficeexpenses.service.llm;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
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
    @DisplayName("Liste les modèles installés via /api/tags")
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
    @DisplayName("Envoie le schéma JSON et les options à /api/chat")
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
    @DisplayName("Détecte la capacité vision via /api/show")
    void vision() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(okJson("""
                {"capabilities":["completion","vision"]}
                """)));

        assertThat(client.supportsVision(config, "modele-vision")).isTrue();
    }

    @Test
    @DisplayName("Un modèle texte ne gère pas les images")
    void withoutVision() {
        serveur.stubFor(post(urlEqualTo("/api/show")).willReturn(okJson("""
                {"capabilities":["completion"]}
                """)));

        assertThat(client.supportsVision(config, "llama-test:latest")).isFalse();
    }

    @Test
    @DisplayName("Traduit une erreur Ollama en message français")
    void serverError() {
        serveur.stubFor(post(urlEqualTo("/api/chat")).willReturn(aResponse().withStatus(500)
                .withHeader("Content-Type", "application/json")
                .withBody("{\"error\":\"model not found\"}")));

        assertThatThrownBy(() -> client.chat(config, "system", "document", List.of()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("service LLM a répondu 500");
    }

    @Test
    @DisplayName("Un Ollama injoignable donne un message actionnable")
    void serverUnreachable() {
        config.setUrl("http://127.0.0.1:1");

        assertThatThrownBy(() -> client.models(config))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("injoignable")
                .hasMessageContaining("saisissez le montant manuellement");
    }
}
