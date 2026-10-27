package fr.hkof.homeofficeexpenses.service.llm;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.LlmProvider;
import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.repository.LlmConfigRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmConfigRequest;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmModelDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmStatusDto;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmTestResponse;

@Service
public class LlmConfigService {

    private static final Set<String> LOCAL_HOSTS = Set.of(
            "localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal", "ollama");
    private static final Pattern PRIVATE_IP = Pattern.compile(
            "^(10\\.|127\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.).*");

    private final LlmConfigRepository repository;
    private final OllamaClient ollamaClient;
    private final ExtractionPipeline extractionPipeline;
    private final Clock clock;

    public LlmConfigService(LlmConfigRepository repository, OllamaClient ollamaClient,
            ExtractionPipeline extractionPipeline, Clock clock) {
        this.repository = repository;
        this.ollamaClient = ollamaClient;
        this.extractionPipeline = extractionPipeline;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LlmConfig entity() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("LLM_CONFIG_NOT_FOUND", "Configuration LLM introuvable."));
    }

    @Transactional(readOnly = true)
    public LlmConfigDto get() {
        return toDto(entity());
    }

    @Transactional
    public LlmConfigDto update(LlmConfigRequest request) {
        LlmConfig config = entity();
        if (request.active() != null) {
            config.setActive(request.active());
        }
        if (request.supplier() != null && !request.supplier().isBlank()) {
            LlmProvider supplier;
            try {
                supplier = LlmProvider.valueOf(request.supplier().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("LLM_PROVIDER_UNKNOWN", "Fournisseur LLM inconnu.");
            }
            if (supplier != LlmProvider.OLLAMA) {
                throw new BusinessException("LLM_PROVIDER_UNSUPPORTED", "Seul Ollama est pris en charge pour le moment.");
            }
            config.setSupplier(supplier);
        }
        if (request.url() != null) {
            config.setUrl(normalizeUrl(request.url()));
        }
        if (request.model() != null) {
            config.setModel(request.model().trim());
        }
        if (request.timeoutSeconds() != null) {
            if (request.timeoutSeconds() < 5 || request.timeoutSeconds() > 600) {
                throw new BusinessException("LLM_TIMEOUT_OUT_OF_RANGE",
                        "Le délai d'attente doit être compris entre 5 et 600 secondes.");
            }
            config.setTimeoutSeconds(request.timeoutSeconds());
        }
        if (request.temperature() != null) {
            BigDecimal temperature;
            try {
                temperature = new BigDecimal(request.temperature().trim().replace(',', '.'));
            } catch (NumberFormatException ex) {
                throw new BusinessException("LLM_TEMPERATURE_INVALID", "La température doit être un nombre entre 0 et 2.");
            }
            if (temperature.compareTo(BigDecimal.ZERO) < 0 || temperature.compareTo(new BigDecimal("2")) > 0) {
                throw new BusinessException("LLM_TEMPERATURE_OUT_OF_RANGE", "La température doit être comprise entre 0 et 2.");
            }
            config.setTemperature(temperature);
        }
        if (request.numCtx() != null) {
            if (request.numCtx() < 1024 || request.numCtx() > 131_072) {
                throw new BusinessException("LLM_CONTEXT_OUT_OF_RANGE",
                        "La taille de contexte doit être comprise entre 1 024 et 131 072.");
            }
            config.setNumCtx(request.numCtx());
        }
        if (request.maxPages() != null) {
            if (request.maxPages() < 1 || request.maxPages() > 20) {
                throw new BusinessException("LLM_MAX_PAGES_OUT_OF_RANGE",
                        "Le nombre de pages maximum doit être compris entre 1 et 20.");
            }
            config.setMaxPages(request.maxPages());
        }
        if (request.ocrActive() != null) {
            config.setOcrActive(request.ocrActive());
        }
        if (request.extractionPrompt() != null) {
            if (request.extractionPrompt().isBlank()) {
                throw new BusinessException("LLM_PROMPT_REQUIRED", "Le prompt d'extraction ne peut pas être vide.");
            }
            config.setExtractionPrompt(request.extractionPrompt().trim());
        }
        if (request.apiKey() != null) {
            config.setApiKey(request.apiKey().isBlank() ? null : request.apiKey().trim());
        }
        config.setUpdatedAt(Instant.now(clock));
        return toDto(repository.save(config));
    }

    public List<LlmModelDto> models() {
        return ollamaClient.models(entity());
    }

    public LlmStatusDto status() {
        LlmConfig config = entity();
        if (!config.isActive()) {
            return new LlmStatusDto("DESACTIVE", false, false, false,
                    "Analyse IA désactivée : la saisie manuelle reste disponible.");
        }
        try {
            List<LlmModelDto> models = ollamaClient.models(config);
            boolean present = config.getModel() != null && models.stream()
                    .anyMatch(model -> model.name().equals(config.getModel())
                            || model.name().startsWith(config.getModel() + ":"));
            if (!present) {
                return new LlmStatusDto("MODELE_ABSENT", true, true, false,
                        "Ollama est joignable mais le modèle « " + config.getModel() + " » n'est pas installé.");
            }
            if (isRemoteUrl(config.getUrl())) {
                return new LlmStatusDto("PRET_DISTANT", true, true, true,
                        "Ollama est joignable. Attention : l'URL configurée n'est pas locale, les documents quittent votre machine.");
            }
            return new LlmStatusDto("PRET", true, true, true, "Ollama est prêt.");
        } catch (BusinessException ex) {
            return new LlmStatusDto("INJOIGNABLE", true, false, false, ex.getMessage());
        }
    }

    public LlmTestResponse testConnection() {
        LlmConfig config = entity();
        long start = System.currentTimeMillis();
        String text = """
                Facture EDF - Gaz naturel
                Client : HKOF
                Période du 01/09/2026 au 30/09/2026
                Montant HT : 35,00 €
                TVA 20 % : 7,00 €
                Total TTC : 42,00 €
                """;
        try {
            var result = extractionPipeline.extractFromText(config, text, List.of());
            long duration = System.currentTimeMillis() - start;
            String amount = result.amountInclVat();
            String message = amount == null
                    ? "Le modèle a répondu mais aucun montant exploitable n'a été détecté."
                    : "Réponse reçue et validée par le serveur.";
            return new LlmTestResponse(true, duration, message, amount);
        } catch (BusinessException ex) {
            return new LlmTestResponse(false, System.currentTimeMillis() - start, ex.getMessage(), null);
        }
    }

    public LlmConfigDto toDto(LlmConfig config) {
        boolean remote = isRemoteUrl(config.getUrl());
        String warning = remote
                ? "Attention : cette URL n'est pas locale. Les justificatifs analysés seront envoyés à un service externe."
                : null;
        return new LlmConfigDto(
                config.isActive(),
                config.getSupplier().name(),
                config.getUrl(),
                config.getModel(),
                config.getTimeoutSeconds(),
                config.getTemperature() == null ? "0" : config.getTemperature().stripTrailingZeros().toPlainString(),
                config.getNumCtx(),
                config.getMaxPages(),
                config.isOcrActive(),
                config.getExtractionPrompt(),
                config.getApiKey() != null && !config.getApiKey().isBlank(),
                remote,
                warning);
    }

    public static boolean isRemoteUrl(String url) {
        if (url == null || url.isBlank()) {
            return true;
        }
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            if (host == null) {
                return true;
            }
            String normalized = host.toLowerCase(Locale.ROOT);
            String withoutBrackets = normalized.startsWith("[") && normalized.endsWith("]")
                    ? normalized.substring(1, normalized.length() - 1)
                    : normalized;
            boolean privateAddress = PRIVATE_IP.matcher(withoutBrackets).matches()
                    || withoutBrackets.matches("^f[cd][0-9a-f]{2}:.*");
            return !LOCAL_HOSTS.contains(normalized) && !privateAddress;
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }

    private String normalizeUrl(String url) {
        String normalizedUrl = url == null ? "" : url.trim().replaceAll("/+$", "");
        if (normalizedUrl.isBlank()) {
            throw new BusinessException("LLM_URL_REQUIRED", "L'URL du service LLM est obligatoire.");
        }
        URI uri;
        try {
            uri = URI.create(normalizedUrl);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("LLM_URL_INVALID", "L'URL du service LLM est invalide.");
        }
        if (uri.getScheme() == null || uri.getHost() == null
                || !(uri.getScheme().equals("http") || uri.getScheme().equals("https"))) {
            throw new BusinessException("LLM_URL_SCHEME_INVALID",
                    "L'URL du service LLM doit commencer par http:// ou https://.");
        }
        return normalizedUrl;
    }
}
