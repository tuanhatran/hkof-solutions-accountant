package fr.hkof.homeofficeexpenses.service.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.domain.LlmProvider;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.web.dto.ExtractionDtos.ExtractionDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigRequest;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmModelDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmStatusDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmTestResponse;

class LlmConfigServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-24T10:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private LlmConfigRepository repository;
    private OllamaClient ollamaClient;
    private ExtractionPipeline extractionPipeline;
    private LlmConfigService service;
    private LlmConfig config;

    @BeforeEach
    void setUp() {
        repository = mock(LlmConfigRepository.class);
        ollamaClient = mock(OllamaClient.class);
        extractionPipeline = mock(ExtractionPipeline.class);
        config = new LlmConfig();
        config.setId(1L);
        config.setActive(true);
        config.setSupplier(LlmProvider.OLLAMA);
        config.setUrl("http://localhost:11434");
        config.setModel("llama-test");
        config.setTimeoutSeconds(30);
        config.setTemperature(new BigDecimal("0"));
        config.setNumCtx(8192);
        config.setMaxPages(5);
        config.setOcrActive(false);
        config.setExtractionPrompt("Prompt");
        when(repository.findById(1L)).thenReturn(Optional.of(config));
        when(repository.save(any(LlmConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service = new LlmConfigService(repository, ollamaClient, extractionPipeline, CLOCK);
    }

    @Test
    @DisplayName("Recognizes local URLs, private IPs and the IPv6 loopback")
    void localUrl() {
        assertThat(LlmConfigService.isRemoteUrl("http://localhost:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://host.docker.internal:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://ollama:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://127.0.0.1:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://[::1]:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://192.168.1.50:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://10.1.2.3:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://172.16.0.9:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://172.31.255.1:11434")).isFalse();
        assertThat(LlmConfigService.isRemoteUrl("http://[fd00::1]:11434")).isFalse();
    }

    @Test
    @DisplayName("Treats public and invalid URLs as remote")
    void detectsRemoteUrl() {
        assertThat(LlmConfigService.isRemoteUrl("https://llm.exemple.fr")).isTrue();
        assertThat(LlmConfigService.isRemoteUrl("http://8.8.8.8:11434")).isTrue();
        assertThat(LlmConfigService.isRemoteUrl("http://172.32.0.1:11434")).isTrue();
        assertThat(LlmConfigService.isRemoteUrl("pas une url")).isTrue();
        assertThat(LlmConfigService.isRemoteUrl("mailto:admin@exemple.fr")).isTrue();
        assertThat(LlmConfigService.isRemoteUrl(null)).isTrue();
        assertThat(LlmConfigService.isRemoteUrl("  ")).isTrue();
    }

    @Test
    @DisplayName("A missing configuration is reported in French")
    void missingConfiguration() {
        when(repository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get())
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Configuration LLM introuvable.");
        assertThatThrownBy(() -> service.entity())
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The GET DTO exposes the configuration without ever returning the key")
    void getNeverReturnsTheKey() {
        config.setApiKey("top-secret");

        LlmConfigDto dto = service.get();

        assertThat(dto.active()).isTrue();
        assertThat(dto.supplier()).isEqualTo("OLLAMA");
        assertThat(dto.url()).isEqualTo("http://localhost:11434");
        assertThat(dto.model()).isEqualTo("llama-test");
        assertThat(dto.timeoutSeconds()).isEqualTo(30);
        assertThat(dto.temperature()).isEqualTo("0");
        assertThat(dto.numCtx()).isEqualTo(8192);
        assertThat(dto.maxPages()).isEqualTo(5);
        assertThat(dto.ocrActive()).isFalse();
        assertThat(dto.apiKeyConfigured()).isTrue();
        assertThat(dto.remoteUrl()).isFalse();
        assertThat(dto.warning()).isNull();
        assertThat(Arrays.stream(LlmConfigDto.class.getRecordComponents())
                .map(component -> component.getName()))
                .doesNotContain("apiKey", "key", "secret");
    }

    @Test
    @DisplayName("A remote URL is flagged with an explicit warning")
    void remoteUrlWarning() {
        config.setUrl("https://llm.exemple.fr");

        LlmConfigDto dto = service.toDto(config);

        assertThat(dto.remoteUrl()).isTrue();
        assertThat(dto.warning())
                .isEqualTo("Attention : cette URL n'est pas locale. Les justificatifs analysés seront envoyés à un service externe.");
    }

    @Test
    @DisplayName("The temperature is rendered without trailing zeros, or 0 when unset")
    void formatsTemperature() {
        config.setTemperature(new BigDecimal("20.00"));
        assertThat(service.toDto(config).temperature()).isEqualTo("20");

        config.setTemperature(null);
        assertThat(service.toDto(config).temperature()).isEqualTo("0");
    }

    @Test
    @DisplayName("A partial update leaves untouched fields unchanged")
    void partialUpdate() {
        LlmConfigDto dto = service.update(request(null, null, null, null, null, null, null, null, null, null, null));

        assertThat(dto.active()).isTrue();
        assertThat(dto.url()).isEqualTo("http://localhost:11434");
        assertThat(config.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    @DisplayName("A full update normalizes and persists every field")
    void fullUpdate() {
        LlmConfigDto dto = service.update(request(false, "ollama", "http://localhost:11434///", "  modele-x  ",
                600, "1,5", 131_072, 20, true, "  Nouveau prompt  ", "  secret  "));

        assertThat(dto.active()).isFalse();
        assertThat(config.getSupplier()).isEqualTo(LlmProvider.OLLAMA);
        assertThat(config.getUrl()).isEqualTo("http://localhost:11434");
        assertThat(config.getModel()).isEqualTo("modele-x");
        assertThat(config.getTimeoutSeconds()).isEqualTo(600);
        assertThat(config.getTemperature()).isEqualByComparingTo("1.5");
        assertThat(config.getNumCtx()).isEqualTo(131_072);
        assertThat(config.getMaxPages()).isEqualTo(20);
        assertThat(config.isOcrActive()).isTrue();
        assertThat(config.getExtractionPrompt()).isEqualTo("Nouveau prompt");
        assertThat(config.getApiKey()).isEqualTo("secret");
        assertThat(config.getUpdatedAt()).isEqualTo(NOW);
        assertThat(dto.apiKeyConfigured()).isTrue();
    }

    @Test
    @DisplayName("A blank supplier is ignored")
    void blankSupplierIsIgnored() {
        LlmConfigDto dto = service.update(request(null, "   ", null, null, null, null, null, null, null, null, null));

        assertThat(dto.supplier()).isEqualTo("OLLAMA");
    }

    @Test
    @DisplayName("An unknown or unsupported supplier is rejected")
    void invalidSupplier() {
        assertThatThrownBy(() -> service.update(request(null, "mistral", null, null, null, null, null, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Fournisseur LLM inconnu.");
        assertThatThrownBy(() -> service.update(request(null, "openai", null, null, null, null, null, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Seul Ollama est pris en charge pour le moment.");
    }

    @Test
    @DisplayName("A blank or malformed URL is rejected")
    void invalidUrl() {
        assertThatThrownBy(() -> service.update(request(null, null, "", null, null, null, null, null, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM est obligatoire.");
        assertThatThrownBy(() -> service.update(request(null, null, "   ", null, null, null, null, null, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM est obligatoire.");
        assertThatThrownBy(() -> service.update(request(null, null, "pas une url", null, null, null, null, null,
                null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM est invalide.");
    }

    @Test
    @DisplayName("Only http and https schemes are accepted")
    void unsupportedScheme() {
        assertThatThrownBy(() -> service.update(request(null, null, "ftp://localhost:11434", null, null, null, null,
                null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM doit commencer par http:// ou https://.");
        assertThatThrownBy(() -> service.update(request(null, null, "mailto:admin@exemple.fr", null, null, null,
                null, null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM doit commencer par http:// ou https://.");
        assertThatThrownBy(() -> service.update(request(null, null, "http:/localhost:11434", null, null, null, null,
                null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM doit commencer par http:// ou https://.");
        assertThatThrownBy(() -> service.update(request(null, null, "//localhost:11434", null, null, null, null,
                null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("L'URL du service LLM doit commencer par http:// ou https://.");
    }

    @Test
    @DisplayName("The timeout must stay between 5 and 600 seconds")
    void timeoutBounds() {
        assertThatThrownBy(() -> service.update(request(null, null, null, null, 4, null, null, null, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le délai d'attente doit être compris entre 5 et 600 secondes.");
        assertThatThrownBy(() -> service.update(request(null, null, null, null, 601, null, null, null, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le délai d'attente doit être compris entre 5 et 600 secondes.");
    }

    @Test
    @DisplayName("The temperature must be a number between 0 and 2")
    void temperatureBounds() {
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, "chaud", null, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La température doit être un nombre entre 0 et 2.");
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, "-0,1", null, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La température doit être comprise entre 0 et 2.");
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, "2,1", null, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La température doit être comprise entre 0 et 2.");
    }

    @Test
    @DisplayName("The context size must stay between 1024 and 131072")
    void numCtxBounds() {
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, null, 1_023, null, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La taille de contexte doit être comprise entre 1 024 et 131 072.");
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, null, 131_073, null, null,
                null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La taille de contexte doit être comprise entre 1 024 et 131 072.");
    }

    @Test
    @DisplayName("The maximum page count must stay between 1 and 20")
    void maxPagesBounds() {
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, null, null, 0, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nombre de pages maximum doit être compris entre 1 et 20.");
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, null, null, 21, null, null,
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nombre de pages maximum doit être compris entre 1 et 20.");
    }

    @Test
    @DisplayName("The extraction prompt cannot be blank")
    void blankPrompt() {
        assertThatThrownBy(() -> service.update(request(null, null, null, null, null, null, null, null, null, "   ",
                null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le prompt d'extraction ne peut pas être vide.");
    }

    @Test
    @DisplayName("A missing key keeps the stored one, a blank key clears it")
    void apiKeyLifecycle() {
        config.setApiKey("stored");

        service.update(request(null, null, null, null, null, null, null, null, null, null, null));
        assertThat(config.getApiKey()).isEqualTo("stored");

        service.update(request(null, null, null, null, null, null, null, null, null, null, "   "));
        assertThat(config.getApiKey()).isNull();
    }

    @Test
    @DisplayName("Models are listed through the Ollama client")
    void listsModels() {
        List<LlmModelDto> models = List.of(new LlmModelDto("llama-test:latest", "llama", "8B", false));
        when(ollamaClient.models(config)).thenReturn(models);

        assertThat(service.models()).isEqualTo(models);
        verify(ollamaClient).models(config);
    }

    @Test
    @DisplayName("A disabled LLM reports DESACTIVE and keeps manual entry available")
    void statusDisabled() {
        config.setActive(false);

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("DESACTIVE");
        assertThat(status.active()).isFalse();
        assertThat(status.reachable()).isFalse();
        assertThat(status.modelAvailable()).isFalse();
        assertThat(status.message()).contains("saisie manuelle");
    }

    @Test
    @DisplayName("A reachable local Ollama with the model installed reports PRET")
    void statusReady() {
        when(ollamaClient.models(config))
                .thenReturn(List.of(new LlmModelDto("llama-test:latest", "llama", "8B", false)));

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("PRET");
        assertThat(status.modelAvailable()).isTrue();
        assertThat(status.message()).isEqualTo("Ollama est prêt.");
    }

    @Test
    @DisplayName("The model matches with or without its tag")
    void statusMatchesModelTag() {
        config.setModel("llama-test");
        when(ollamaClient.models(config))
                .thenReturn(List.of(new LlmModelDto("llama-test:latest", "llama", "8B", false)));

        assertThat(service.status().status()).isEqualTo("PRET");
    }

    @Test
    @DisplayName("A configuration without a model reports MODELE_ABSENT")
    void statusWithoutModel() {
        config.setModel(null);
        when(ollamaClient.models(config))
                .thenReturn(List.of(new LlmModelDto("llama-test:latest", "llama", "8B", false)));

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("MODELE_ABSENT");
        assertThat(status.modelAvailable()).isFalse();
    }

    @Test
    @DisplayName("A missing model reports MODELE_ABSENT")
    void statusModelAbsent() {
        when(ollamaClient.models(config))
                .thenReturn(List.of(new LlmModelDto("autre:latest", "llama", "8B", false)));

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("MODELE_ABSENT");
        assertThat(status.reachable()).isTrue();
        assertThat(status.modelAvailable()).isFalse();
        assertThat(status.message()).contains("llama-test").contains("n'est pas installé");
    }

    @Test
    @DisplayName("A remote Ollama is reachable but flagged as remote")
    void statusRemote() {
        config.setUrl("https://llm.exemple.fr");
        when(ollamaClient.models(config))
                .thenReturn(List.of(new LlmModelDto("llama-test:latest", "llama", "8B", false)));

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("PRET_DISTANT");
        assertThat(status.message()).contains("quittent votre machine");
    }

    @Test
    @DisplayName("An unreachable Ollama reports INJOIGNABLE with the French reason")
    void statusUnreachable() {
        when(ollamaClient.models(config))
                .thenThrow(new BusinessException("Le service LLM est injoignable."));

        LlmStatusDto status = service.status();

        assertThat(status.status()).isEqualTo("INJOIGNABLE");
        assertThat(status.reachable()).isFalse();
        assertThat(status.message()).isEqualTo("Le service LLM est injoignable.");
    }

    @Test
    @DisplayName("A validated test extraction reports the detected amount")
    void testConnectionSuccess() {
        when(extractionPipeline.extractFromText(any(LlmConfig.class), any(), any()))
                .thenReturn(new ExtractionDto("gaz", "EDF", null, null, "42.00", "35.00", "EUR", "Total TTC",
                        "haute"));

        LlmTestResponse response = service.testConnection();

        assertThat(response.success()).isTrue();
        assertThat(response.detectedAmount()).isEqualTo("42.00");
        assertThat(response.message()).isEqualTo("Réponse reçue et validée par le serveur.");
        assertThat(response.durationMs()).isGreaterThanOrEqualTo(0L);
    }

    @Test
    @DisplayName("A reply without an exploitable amount is reported without failing the connection")
    void testConnectionWithoutAmount() {
        when(extractionPipeline.extractFromText(any(LlmConfig.class), any(), any()))
                .thenReturn(new ExtractionDto(null, "EDF", null, null, null, null, "EUR", null, "basse"));

        LlmTestResponse response = service.testConnection();

        assertThat(response.success()).isTrue();
        assertThat(response.detectedAmount()).isNull();
        assertThat(response.message()).contains("aucun montant exploitable");
    }

    @Test
    @DisplayName("A failed test extraction reports the French business message")
    void testConnectionFailure() {
        when(extractionPipeline.extractFromText(any(LlmConfig.class), any(), any()))
                .thenThrow(new BusinessException("Le service LLM est injoignable."));

        LlmTestResponse response = service.testConnection();

        assertThat(response.success()).isFalse();
        assertThat(response.detectedAmount()).isNull();
        assertThat(response.message()).isEqualTo("Le service LLM est injoignable.");
    }

    private LlmConfigRequest request(Boolean active, String supplier, String url, String model, Integer timeout,
            String temperature, Integer numCtx, Integer maxPages, Boolean ocr, String prompt, String apiKey) {
        return new LlmConfigRequest(active, supplier, url, model, timeout, temperature, numCtx, maxPages, ocr,
                prompt, apiKey);
    }
}
