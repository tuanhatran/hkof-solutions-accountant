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
import fr.hkof.homeofficeexpenses.web.dto.Dtos.LlmModelDto;
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
        JsonNode racine = call(config, JsonNode.class, "GET", "/api/tags", null);
        JsonNode liste = racine.path("models");
        List<LlmModelDto> result = new ArrayList<>();
        if (liste.isArray()) {
            for (JsonNode model : liste) {
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
            JsonNode racine = call(config, JsonNode.class, "POST", "/api/show",
                    Map.of("model", model));
            JsonNode capacites = racine.path("capabilities");
            if (capacites.isArray()) {
                for (JsonNode capacite : capacites) {
                    if ("vision".equals(capacite.asString(""))) {
                        return true;
                    }
                }
                return false;
            }
        } catch (BusinessException ignored) {
            // Les anciennes versions d'Ollama ne renvoient pas les capacités.
        }
        return nameSuggestsVision(model);
    }

    public String chat(LlmConfig config, String promptSysteme, String contentUtilisateur, List<String> imagesBase64) {
        if (config.getModel() == null || config.getModel().isBlank()) {
            throw new BusinessException("Aucun modèle LLM n'est configuré. Renseignez-le dans Admin ou saisissez le montant manuellement.");
        }
        Map<String, Object> messageUtilisateur = new LinkedHashMap<>();
        messageUtilisateur.put("role", "user");
        messageUtilisateur.put("content", contentUtilisateur);
        if (imagesBase64 != null && !imagesBase64.isEmpty()) {
            messageUtilisateur.put("images", imagesBase64);
        }
        Map<String, Object> charge = new LinkedHashMap<>();
        charge.put("model", config.getModel());
        charge.put("messages", List.of(
                Map.of("role", "system", "content", promptSysteme),
                messageUtilisateur));
        charge.put("stream", false);
        charge.put("format", objectMapper.readTree(DefaultPrompt.SCHEMA_JSON));
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", config.getTemperature() == null ? 0 : config.getTemperature());
        options.put("num_ctx", config.getNumCtx());
        charge.put("options", options);

        JsonNode racine = call(config, JsonNode.class, "POST", "/api/chat", charge);
        String content = racine.path("message").path("content").asString("");
        if (content.isBlank()) {
            throw new BusinessException("Le modèle LLM n'a renvoyé aucun contenu exploitable.");
        }
        return content;
    }

    private <T> T call(LlmConfig config, Class<T> type, String methode, String path, Object corps) {
        if (config.getUrl() == null || config.getUrl().isBlank()) {
            throw new BusinessException("L'URL du service LLM n'est pas configurée.");
        }
        SimpleClientHttpRequestFactory requetes = new SimpleClientHttpRequestFactory();
        requetes.setConnectTimeout(Duration.ofSeconds(5));
        requetes.setReadTimeout(Duration.ofSeconds(Math.max(5, config.getTimeoutSeconds())));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(config.getUrl().replaceAll("/+$", ""))
                .requestFactory(requetes);
        if (config.getApiKey() != null && !config.getApiKey().isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + config.getApiKey());
        }
        RestClient client = builder.build();
        try {
            RestClient.RequestBodySpec requete = client.method(org.springframework.http.HttpMethod.valueOf(methode))
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON);
            if (corps != null) {
                return requete.body(corps).retrieve().body(type);
            }
            return requete.retrieve().body(type);
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
        String minuscule = name.toLowerCase();
        return VISION_MODELS.stream().anyMatch(minuscule::contains);
    }
}
