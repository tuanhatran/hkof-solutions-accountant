package fr.hkof.homeofficeexpenses.service.template;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.samskivert.mustache.Mustache;
import com.samskivert.mustache.Template;

import fr.hkof.homeofficeexpenses.domain.FormatTemplate;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TypeTemplate;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.FileTypeDetector;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.PdfService;
import fr.hkof.homeofficeexpenses.service.StockageService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RapportValidationDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateVariableDto;
import tools.jackson.databind.ObjectMapper;

@Service
public class TemplateService {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([#\\^/!]?)\\s*([^{}]+?)\\s*\\}\\}");
    private static final List<String> BALISES_INTERDITES = List.of("script", "iframe", "object", "embed", "form", "base");
    private static final Pattern CSS_DISTANT = Pattern.compile("url\\(\\s*['\"]?\\s*(https?:|//|file:)", Pattern.CASE_INSENSITIVE);

    private final TemplateDocumentRepository repository;
    private final StockageService stockage;
    private final PdfService pdfService;
    private final FileTypeDetector detector;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public TemplateService(TemplateDocumentRepository repository, StockageService stockage, PdfService pdfService,
            FileTypeDetector detector, ObjectMapper objectMapper, Clock clock) {
        this.repository = repository;
        this.stockage = stockage;
        this.pdfService = pdfService;
        this.detector = detector;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TemplateDto> lister(TypeTemplate type) {
        return repository.findByTypeAndSupprimeFalseOrderByVersionDesc(type).stream()
                .map(this::versDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateDocument actif(TypeTemplate type) {
        return repository.findFirstByTypeAndActifTrueAndSupprimeFalse(type)
                .or(() -> repository.findFirstByTypeAndIntegreTrueAndSupprimeFalse(type))
                .orElseThrow(() -> new NotFoundException("Aucun template actif pour " + type));
    }

    @Transactional(readOnly = true)
    public TemplateDocument parId(Long id) {
        return repository.findById(id)
                .filter(t -> !t.isSupprime())
                .orElseThrow(() -> new NotFoundException("Template introuvable."));
    }

    public String rendre(TemplateDocument template, Map<String, Object> donnees) {
        String contenu = new String(stockage.lire(template.getChemin()), StandardCharsets.UTF_8);
        try {
            Template mustache = Mustache.compiler()
                    .defaultValue("")
                    .escapeHTML(true)
                    .compile(contenu);
            return mustache.execute(donnees);
        } catch (RuntimeException ex) {
            throw new BusinessException("Le template « " + template.getNom() + " » n'a pas pu être rendu : " + ex.getMessage());
        }
    }

    public RapportValidationDto valider(TypeTemplate type, String contenu) {
        List<String> reconnues = new ArrayList<>();
        List<String> inconnues = new ArrayList<>();
        List<String> manquantes = new ArrayList<>();
        List<String> erreurs = new ArrayList<>();
        Set<String> autorisees = TemplateCatalog.nomsAutorises(type);
        Set<String> obligatoires = TemplateCatalog.obligatoires(type);
        Set<String> presentes = new TreeSet<>();

        Matcher matcher = VARIABLE.matcher(contenu);
        int profondeurLignes = 0;
        while (matcher.find()) {
            String prefixe = matcher.group(1);
            String nom = matcher.group(2).trim();
            if ("!".equals(prefixe)) {
                continue;
            }
            if ("/".equals(prefixe)) {
                if ("lignes".equals(nom)) {
                    profondeurLignes = Math.max(0, profondeurLignes - 1);
                }
                continue;
            }
            String canonique = nom;
            if (!autorisees.contains(canonique) && profondeurLignes > 0
                    && autorisees.contains("lignes." + nom)) {
                canonique = "lignes." + nom;
            }
            if (!autorisees.contains(canonique)) {
                if (!inconnues.contains(nom)) {
                    inconnues.add(nom);
                }
                continue;
            }
            presentes.add(canonique);
            if (!reconnues.contains(canonique)) {
                reconnues.add(canonique);
            }
            if ("#".equals(prefixe) && "lignes".equals(nom)) {
                profondeurLignes++;
            }
        }
        for (String obligatoire : obligatoires) {
            if (!presentes.contains(obligatoire)) {
                manquantes.add(obligatoire);
            }
        }

        erreurs.addAll(controlerSecurite(contenu));
        try {
            Mustache.compiler().compile(contenu);
        } catch (RuntimeException ex) {
            erreurs.add("Structure Mustache invalide : " + ex.getMessage());
        }
        if (!inconnues.isEmpty()) {
            erreurs.add("Variables inconnues : " + String.join(", ", inconnues));
        }
        return new RapportValidationDto(reconnues, inconnues, manquantes, erreurs.isEmpty(), erreurs);
    }

    @Transactional
    public TemplateDto uploader(TypeTemplate type, String nom, MultipartFile fichier) {
        if (nom == null || nom.isBlank()) {
            throw new BusinessException("Le nom du template est obligatoire.");
        }
        byte[] contenu;
        try {
            contenu = fichier.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le fichier template.");
        }
        detector.validerTemplateHtml(fichier.getOriginalFilename(), contenu);
        String html = new String(contenu, StandardCharsets.UTF_8);
        RapportValidationDto rapport = valider(type, html);
        if (!rapport.structureValide()) {
            throw new BusinessException(String.join(" ; ", rapport.erreurs()));
        }
        int version = repository.findTopByTypeOrderByVersionDesc(type).map(t -> t.getVersion() + 1).orElse(1);
        String chemin = stockage.stockerTemplate(contenu, type.name(), version);
        TemplateDocument template = new TemplateDocument();
        template.setType(type);
        template.setNom(nom.trim());
        template.setVersion(version);
        template.setFormat(FormatTemplate.HTML);
        template.setChemin(chemin);
        template.setActif(false);
        template.setIntegre(false);
        template.setSupprime(false);
        template.setRapportValidation(objectMapper.writeValueAsString(rapport));
        template.setCreatedAt(Instant.now(clock));
        return versDto(repository.save(template));
    }

    @Transactional
    public TemplateDto activer(Long id) {
        TemplateDocument template = parId(id);
        for (TemplateDocument autre : repository.findByTypeAndActifTrueAndSupprimeFalse(template.getType())) {
            autre.setActif(false);
            repository.save(autre);
        }
        template.setActif(true);
        return versDto(repository.save(template));
    }

    @Transactional
    public void supprimer(Long id) {
        TemplateDocument template = parId(id);
        if (template.isIntegre()) {
            throw new BusinessException("Le modèle intégré ne peut pas être supprimé.");
        }
        if (template.isActif()) {
            throw new BusinessException("Le template actif ne peut pas être supprimé. Activez d'abord un autre modèle.");
        }
        template.setSupprime(true);
        repository.save(template);
    }

    @Transactional
    public TemplateDto reinitialiser(TypeTemplate type) {
        TemplateDocument integre = repository.findFirstByTypeAndIntegreTrueAndSupprimeFalse(type)
                .orElseThrow(() -> new NotFoundException("Modèle intégré introuvable."));
        return activer(integre.getId());
    }

    public byte[] fichier(Long id) {
        return stockage.lire(parId(id).getChemin());
    }

    public byte[] fichierDefaut(TypeTemplate type) {
        String chemin = type == TypeTemplate.QUITTANCE
                ? "classpath:templates/defaut/quittance.html"
                : "classpath:templates/defaut/note-frais.html";
        return stockage.lire(chemin);
    }

    public List<TemplateVariableDto> variables(TypeTemplate type) {
        return TemplateCatalog.variables(type);
    }

    public byte[] apercu(Long id, Map<String, Object> donneesExemple) {
        TemplateDocument template = parId(id);
        String html = rendre(template, donneesExemple);
        return pdfService.ajouterFiligrane(pdfService.rendreHtmlEnPdf(html));
    }

    public TemplateDto versDto(TemplateDocument t) {
        RapportValidationDto rapport = null;
        if (t.getRapportValidation() != null && !t.getRapportValidation().isBlank()) {
            try {
                rapport = objectMapper.readValue(t.getRapportValidation(), RapportValidationDto.class);
            } catch (RuntimeException ignored) {
                rapport = null;
            }
        }
        return new TemplateDto(t.getId(), t.getType().name(), t.getNom(), t.getVersion(), t.getFormat().name(),
                t.isActif(), t.isIntegre(), t.getCreatedAt(), rapport);
    }

    private List<String> controlerSecurite(String contenu) {
        List<String> erreurs = new ArrayList<>();
        String minuscule = contenu.toLowerCase(Locale.ROOT);
        if (minuscule.contains("{{{") || minuscule.contains("{{&")) {
            erreurs.add("Les expressions non échappées ({{{...}}} ou {{&...}}) sont interdites.");
        }
        if (minuscule.contains("#{") || minuscule.contains("<%")) {
            erreurs.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
        }
        if (minuscule.contains("javascript:")) {
            erreurs.add("Les liens JavaScript sont interdits.");
        }
        if (CSS_DISTANT.matcher(contenu).find()) {
            erreurs.add("Les ressources distantes sont interdites.");
        }
        Document document = Jsoup.parse(contenu);
        for (String balise : BALISES_INTERDITES) {
            if (!document.select(balise).isEmpty()) {
                erreurs.add("La balise <" + balise + "> est interdite.");
            }
        }
        for (Element element : document.getAllElements()) {
            for (Attribute attribut : element.attributes()) {
                String cle = attribut.getKey().toLowerCase(Locale.ROOT);
                String valeur = attribut.getValue().toLowerCase(Locale.ROOT).trim();
                if (cle.startsWith("on")) {
                    erreurs.add("Les attributs d'événement (« " + cle + " ») sont interdits.");
                }
                if (cle.startsWith("th:") || cle.startsWith("data-th-")) {
                    erreurs.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
                }
                if (cle.equals("href") && !valeur.startsWith("#")) {
                    erreurs.add("Les liens externes sont interdits dans un template.");
                }
                if ((cle.equals("src") || cle.equals("data")) && !valeur.startsWith("data:image/")) {
                    erreurs.add("Les images doivent être intégrées en data URI.");
                }
            }
        }
        return erreurs.stream().distinct().toList();
    }
}
