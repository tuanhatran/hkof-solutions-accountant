package fr.hkof.fraisocc.service.llm;

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

import fr.hkof.fraisocc.domain.FournisseurLlm;
import fr.hkof.fraisocc.domain.LlmConfig;
import fr.hkof.fraisocc.repository.LlmConfigRepository;
import fr.hkof.fraisocc.service.BusinessException;
import fr.hkof.fraisocc.service.NotFoundException;
import fr.hkof.fraisocc.web.dto.Dtos.LlmConfigDto;
import fr.hkof.fraisocc.web.dto.Dtos.LlmConfigRequest;
import fr.hkof.fraisocc.web.dto.Dtos.LlmModelDto;
import fr.hkof.fraisocc.web.dto.Dtos.LlmStatusDto;
import fr.hkof.fraisocc.web.dto.Dtos.LlmTestResponse;

@Service
public class LlmConfigService {

    private static final Set<String> HOTES_LOCAUX = Set.of(
            "localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", "host.docker.internal", "ollama");
    private static final Pattern IP_PRIVEE = Pattern.compile(
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
    public LlmConfig entite() {
        return repository.findById(1L)
                .orElseThrow(() -> new NotFoundException("Configuration LLM introuvable."));
    }

    @Transactional(readOnly = true)
    public LlmConfigDto obtenir() {
        return versDto(entite());
    }

    @Transactional
    public LlmConfigDto mettreAJour(LlmConfigRequest request) {
        LlmConfig config = entite();
        if (request.actif() != null) {
            config.setActif(request.actif());
        }
        if (request.fournisseur() != null && !request.fournisseur().isBlank()) {
            FournisseurLlm fournisseur;
            try {
                fournisseur = FournisseurLlm.valueOf(request.fournisseur().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new BusinessException("Fournisseur LLM inconnu.");
            }
            if (fournisseur != FournisseurLlm.OLLAMA) {
                throw new BusinessException("Seul Ollama est pris en charge pour le moment.");
            }
            config.setFournisseur(fournisseur);
        }
        if (request.url() != null) {
            config.setUrl(normaliserUrl(request.url()));
        }
        if (request.modele() != null) {
            config.setModele(request.modele().trim());
        }
        if (request.timeoutSeconds() != null) {
            if (request.timeoutSeconds() < 5 || request.timeoutSeconds() > 600) {
                throw new BusinessException("Le délai d'attente doit être compris entre 5 et 600 secondes.");
            }
            config.setTimeoutSeconds(request.timeoutSeconds());
        }
        if (request.temperature() != null) {
            BigDecimal temperature;
            try {
                temperature = new BigDecimal(request.temperature().trim().replace(',', '.'));
            } catch (NumberFormatException ex) {
                throw new BusinessException("La température doit être un nombre entre 0 et 2.");
            }
            if (temperature.compareTo(BigDecimal.ZERO) < 0 || temperature.compareTo(new BigDecimal("2")) > 0) {
                throw new BusinessException("La température doit être comprise entre 0 et 2.");
            }
            config.setTemperature(temperature);
        }
        if (request.numCtx() != null) {
            if (request.numCtx() < 1024 || request.numCtx() > 131_072) {
                throw new BusinessException("La taille de contexte doit être comprise entre 1 024 et 131 072.");
            }
            config.setNumCtx(request.numCtx());
        }
        if (request.pagesMax() != null) {
            if (request.pagesMax() < 1 || request.pagesMax() > 20) {
                throw new BusinessException("Le nombre de pages maximum doit être compris entre 1 et 20.");
            }
            config.setPagesMax(request.pagesMax());
        }
        if (request.ocrActif() != null) {
            config.setOcrActif(request.ocrActif());
        }
        if (request.promptExtraction() != null) {
            if (request.promptExtraction().isBlank()) {
                throw new BusinessException("Le prompt d'extraction ne peut pas être vide.");
            }
            config.setPromptExtraction(request.promptExtraction().trim());
        }
        if (request.cleApi() != null) {
            config.setCleApi(request.cleApi().isBlank() ? null : request.cleApi().trim());
        }
        config.setUpdatedAt(Instant.now(clock));
        return versDto(repository.save(config));
    }

    public List<LlmModelDto> modeles() {
        return ollamaClient.modeles(entite());
    }

    public LlmStatusDto statut() {
        LlmConfig config = entite();
        if (!config.isActif()) {
            return new LlmStatusDto("DESACTIVE", false, false, false,
                    "Analyse IA désactivée : la saisie manuelle reste disponible.");
        }
        try {
            List<LlmModelDto> modeles = ollamaClient.modeles(config);
            boolean present = config.getModele() != null && modeles.stream()
                    .anyMatch(m -> m.nom().equals(config.getModele())
                            || m.nom().startsWith(config.getModele() + ":"));
            if (!present) {
                return new LlmStatusDto("MODELE_ABSENT", true, true, false,
                        "Ollama est joignable mais le modèle « " + config.getModele() + " » n'est pas installé.");
            }
            if (urlDistante(config.getUrl())) {
                return new LlmStatusDto("PRET_DISTANT", true, true, true,
                        "Ollama est joignable. Attention : l'URL configurée n'est pas locale, les documents quittent votre machine.");
            }
            return new LlmStatusDto("PRET", true, true, true, "Ollama est prêt.");
        } catch (BusinessException ex) {
            return new LlmStatusDto("INJOIGNABLE", true, false, false, ex.getMessage());
        }
    }

    public LlmTestResponse tester() {
        LlmConfig config = entite();
        long debut = System.currentTimeMillis();
        String texte = """
                Facture EDF - Gaz naturel
                Client : HKOF
                Période du 01/09/2026 au 30/09/2026
                Montant HT : 35,00 €
                TVA 20 % : 7,00 €
                Total TTC : 42,00 €
                """;
        try {
            var resultat = extractionPipeline.extraireDepuisTexte(config, texte, List.of());
            long duree = System.currentTimeMillis() - debut;
            String montant = resultat.montantTtc();
            String message = montant == null
                    ? "Le modèle a répondu mais aucun montant exploitable n'a été détecté."
                    : "Réponse reçue et validée par le serveur.";
            return new LlmTestResponse(true, duree, message, montant);
        } catch (BusinessException ex) {
            return new LlmTestResponse(false, System.currentTimeMillis() - debut, ex.getMessage(), null);
        }
    }

    public LlmConfigDto versDto(LlmConfig config) {
        boolean distante = urlDistante(config.getUrl());
        String avertissement = distante
                ? "Attention : cette URL n'est pas locale. Les justificatifs analysés seront envoyés à un service externe."
                : null;
        return new LlmConfigDto(
                config.isActif(),
                config.getFournisseur().name(),
                config.getUrl(),
                config.getModele(),
                config.getTimeoutSeconds(),
                config.getTemperature() == null ? "0" : config.getTemperature().stripTrailingZeros().toPlainString(),
                config.getNumCtx(),
                config.getPagesMax(),
                config.isOcrActif(),
                config.getPromptExtraction(),
                config.getCleApi() != null && !config.getCleApi().isBlank(),
                distante,
                avertissement);
    }

    public static boolean urlDistante(String url) {
        if (url == null || url.isBlank()) {
            return true;
        }
        try {
            URI uri = URI.create(url.trim());
            String hote = uri.getHost();
            if (hote == null) {
                return true;
            }
            String normalise = hote.toLowerCase(Locale.ROOT);
            String sansCrochets = normalise.startsWith("[") && normalise.endsWith("]")
                    ? normalise.substring(1, normalise.length() - 1)
                    : normalise;
            boolean prive = IP_PRIVEE.matcher(sansCrochets).matches()
                    || sansCrochets.matches("^f[cd][0-9a-f]{2}:.*");
            return !HOTES_LOCAUX.contains(normalise) && !prive;
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }

    private String normaliserUrl(String url) {
        String propre = url == null ? "" : url.trim().replaceAll("/+$", "");
        if (propre.isBlank()) {
            throw new BusinessException("L'URL du service LLM est obligatoire.");
        }
        URI uri;
        try {
            uri = URI.create(propre);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("L'URL du service LLM est invalide.");
        }
        if (uri.getScheme() == null || uri.getHost() == null
                || !(uri.getScheme().equals("http") || uri.getScheme().equals("https"))) {
            throw new BusinessException("L'URL du service LLM doit commencer par http:// ou https://.");
        }
        return propre;
    }
}
