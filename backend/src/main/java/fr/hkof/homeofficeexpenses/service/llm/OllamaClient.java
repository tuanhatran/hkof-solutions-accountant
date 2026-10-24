package fr.hkof.homeofficeexpenses.service.llm;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import fr.hkof.homeofficeexpenses.domain.LlmConfig;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.web.dto.LlmDtos.LlmModelDto;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class OllamaClient {

    private static final List<String> VISION_MODELS = List.of(
            "llava", "vision", "minicpm-v", "moondream", "qwen2-vl", "qwen2.5vl", "gemma3", "pixtral");

    private final ObjectMapper objectMapper;

    public OllamaClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<LlmModelDto> models(LlmConfig config) {
        JsonNode root = call(config, JsonNode.class, "GET", "/api/tags", null);
        JsonNode list = root.path("models");
        List<LlmModelDto> result = new ArrayList<>();
        if (list.isArray()) {
            for (JsonNode model : list) {
                String name = model.path("name").asString("");
                if (name.isBlank()) {
                    name = model.path("model").asString("");
                }
                JsonNode details = model.path("details");
                String family = details.path("family").asString("");
                String parameters = details.path("parameter_size").asString("");
                result.add(new LlmModelDto(name, family, parameters, nameSuggestsVision(name)));
            }
        }
        return result;
    }

    public boolean supportsVision(LlmConfig config, String model) {
        if (model == null || model.isBlank()) {
            return false;
        }
        try {
            JsonNode root = call(config, JsonNode.class, "POST", "/api/show",
                    Map.of("model", model));
            JsonNode capabilities = root.path("capabilities");
            if (capabilities.isArray()) {
                for (JsonNode capability : capabilities) {
                    if ("vision".equals(capability.asString(""))) {
                        return true;
                    }
                }
                return false;
            }
        } catch (BusinessException ignored) {
            // Older Ollama versions do not report capabilities.
        }
        return nameSuggestsVision(model);
    }

    public String chat(LlmConfig config, String systemPrompt, String userContent, List<String> imagesBase64) {
        if (config.getModel() == null || config.getModel().isBlank()) {
            throw new BusinessException("Aucun modèle LLM n'est configuré. Renseignez-le dans Admin ou saisissez le montant manuellement.");
        }
        Map<String, Object> userMessage = new LinkedHashMap<>();
        userMessage.put("role", "user");
        userMessage.put("content", userContent);
        if (imagesBase64 != null && !imagesBase64.isEmpty()) {
            userMessage.put("images", imagesBase64);
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", config.getModel());
        payload.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                userMessage));
        payload.put("stream", false);
        payload.put("format", objectMapper.readTree(DefaultPrompt.SCHEMA_JSON));
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", config.getTemperature() == null ? 0 : config.getTemperature());
        options.put("num_ctx", config.getNumCtx());
        payload.put("options", options);

        JsonNode root = call(config, JsonNode.class, "POST", "/api/chat", payload);
        String content = root.path("message").path("content").asString("");
        if (content.isBlank()) {
            throw new BusinessException("Le modèle LLM n'a renvoyé aucun contenu exploitable.");
        }
        return content;
    }

    private <T> T call(LlmConfig config, Class<T> type, String method, String path, Object body) {
        if (config.getUrl() == null || config.getUrl().isBlank()) {
            throw new BusinessException("L'URL du service LLM n'est pas configurée.");
        }
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(Math.max(5, config.getTimeoutSeconds())));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(config.getUrl().replaceAll("/+$", ""))
                .requestFactory(requestFactory);
        if (config.getApiKey() != null && !config.getApiKey().isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + config.getApiKey());
        }
        RestClient client = builder.build();
        try {
            RestClient.RequestBodySpec request = client.method(org.springframework.http.HttpMethod.valueOf(method))
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON);
            if (body != null) {
                return request.body(body).retrieve().body(type);
            }
            return request.retrieve().body(type);
        } catch (RestClientResponseException ex) {
            String detail = ex.getResponseBodyAsString();
            if (detail != null && detail.length() > 300) {
                detail = detail.substring(0, 300);
            }
            throw new BusinessException("Le service LLM a répondu " + ex.getStatusCode().value()
                    + (detail == null || detail.isBlank() ? "." : " : " + detail));
        } catch (RestClientException ex) {
            throw new BusinessException("Le service LLM est injoignable (" + config.getUrl()
                    + "). Vérifiez qu'Ollama est démarré, ou saisissez le montant manuellement.");
        }
    }

    private boolean nameSuggestsVision(String name) {
        if (name == null) {
            return false;
        }
        String lowercaseName = name.toLowerCase();
        return VISION_MODELS.stream().anyMatch(lowercaseName::contains);
    }
}
