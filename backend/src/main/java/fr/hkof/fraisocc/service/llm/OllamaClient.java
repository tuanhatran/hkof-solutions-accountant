package fr.hkof.fraisocc.service.llm;

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

import fr.hkof.fraisocc.domain.LlmConfig;
import fr.hkof.fraisocc.service.BusinessException;
import fr.hkof.fraisocc.web.dto.Dtos.LlmModelDto;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class OllamaClient {

    private static final List<String> MODELES_VISION = List.of(
            "llava", "vision", "minicpm-v", "moondream", "qwen2-vl", "qwen2.5vl", "gemma3", "pixtral");

    private final ObjectMapper objectMapper;

    public OllamaClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<LlmModelDto> modeles(LlmConfig config) {
        JsonNode racine = appeler(config, JsonNode.class, "GET", "/api/tags", null);
        JsonNode liste = racine.path("models");
        List<LlmModelDto> resultat = new ArrayList<>();
        if (liste.isArray()) {
            for (JsonNode modele : liste) {
                String nom = modele.path("name").asString("");
                if (nom.isBlank()) {
                    nom = modele.path("model").asString("");
                }
                JsonNode details = modele.path("details");
                String famille = details.path("family").asString("");
                String parametres = details.path("parameter_size").asString("");
                resultat.add(new LlmModelDto(nom, famille, parametres, nomSuggereVision(nom)));
            }
        }
        return resultat;
    }

    public boolean supporteVision(LlmConfig config, String modele) {
        if (modele == null || modele.isBlank()) {
            return false;
        }
        try {
            JsonNode racine = appeler(config, JsonNode.class, "POST", "/api/show",
                    Map.of("model", modele));
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
        return nomSuggereVision(modele);
    }

    public String chat(LlmConfig config, String promptSysteme, String contenuUtilisateur, List<String> imagesBase64) {
        if (config.getModele() == null || config.getModele().isBlank()) {
            throw new BusinessException("Aucun modèle LLM n'est configuré. Renseignez-le dans Admin ou saisissez le montant manuellement.");
        }
        Map<String, Object> messageUtilisateur = new LinkedHashMap<>();
        messageUtilisateur.put("role", "user");
        messageUtilisateur.put("content", contenuUtilisateur);
        if (imagesBase64 != null && !imagesBase64.isEmpty()) {
            messageUtilisateur.put("images", imagesBase64);
        }
        Map<String, Object> charge = new LinkedHashMap<>();
        charge.put("model", config.getModele());
        charge.put("messages", List.of(
                Map.of("role", "system", "content", promptSysteme),
                messageUtilisateur));
        charge.put("stream", false);
        charge.put("format", objectMapper.readTree(DefaultPrompt.SCHEMA_JSON));
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", config.getTemperature() == null ? 0 : config.getTemperature());
        options.put("num_ctx", config.getNumCtx());
        charge.put("options", options);

        JsonNode racine = appeler(config, JsonNode.class, "POST", "/api/chat", charge);
        String contenu = racine.path("message").path("content").asString("");
        if (contenu.isBlank()) {
            throw new BusinessException("Le modèle LLM n'a renvoyé aucun contenu exploitable.");
        }
        return contenu;
    }

    private <T> T appeler(LlmConfig config, Class<T> type, String methode, String chemin, Object corps) {
        if (config.getUrl() == null || config.getUrl().isBlank()) {
            throw new BusinessException("L'URL du service LLM n'est pas configurée.");
        }
        SimpleClientHttpRequestFactory requetes = new SimpleClientHttpRequestFactory();
        requetes.setConnectTimeout(Duration.ofSeconds(5));
        requetes.setReadTimeout(Duration.ofSeconds(Math.max(5, config.getTimeoutSeconds())));
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(config.getUrl().replaceAll("/+$", ""))
                .requestFactory(requetes);
        if (config.getCleApi() != null && !config.getCleApi().isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + config.getCleApi());
        }
        RestClient client = builder.build();
        try {
            RestClient.RequestBodySpec requete = client.method(org.springframework.http.HttpMethod.valueOf(methode))
                    .uri(chemin)
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

    private boolean nomSuggereVision(String nom) {
        if (nom == null) {
            return false;
        }
        String minuscule = nom.toLowerCase();
        return MODELES_VISION.stream().anyMatch(minuscule::contains);
    }
}
