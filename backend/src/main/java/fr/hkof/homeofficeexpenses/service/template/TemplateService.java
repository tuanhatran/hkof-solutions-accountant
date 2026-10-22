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

import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.FileTypeDetector;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.PdfService;
import fr.hkof.homeofficeexpenses.service.StorageService;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ValidationReportDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateVariableDto;
import tools.jackson.databind.ObjectMapper;

@Service
public class TemplateService {

    private static final Pattern VARIABLE = Pattern.compile("\\{\\{\\s*([#\\^/!]?)\\s*([^{}]+?)\\s*\\}\\}");
    private static final List<String> BALISES_INTERDITES = List.of("script", "iframe", "object", "embed", "form", "base");
    private static final Pattern CSS_DISTANT = Pattern.compile("url\\(\\s*['\"]?\\s*(https?:|//|file:)", Pattern.CASE_INSENSITIVE);

    private final TemplateDocumentRepository repository;
    private final StorageService stockage;
    private final PdfService pdfService;
    private final FileTypeDetector detector;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public TemplateService(TemplateDocumentRepository repository, StorageService stockage, PdfService pdfService,
            FileTypeDetector detector, ObjectMapper objectMapper, Clock clock) {
        this.repository = repository;
        this.stockage = stockage;
        this.pdfService = pdfService;
        this.detector = detector;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TemplateDto> lister(TemplateType type) {
        return repository.findByTypeAndDeletedFalseOrderByVersionDesc(type).stream()
                .map(this::versDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateDocument active(TemplateType type) {
        return repository.findFirstByTypeAndActiveTrueAndDeletedFalse(type)
                .or(() -> repository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(type))
                .orElseThrow(() -> new NotFoundException("Aucun template actif pour " + type));
    }

    @Transactional(readOnly = true)
    public TemplateDocument parId(Long id) {
        return repository.findById(id)
                .filter(t -> !t.isDeleted())
                .orElseThrow(() -> new NotFoundException("Template introuvable."));
    }

    public String rendre(TemplateDocument template, Map<String, Object> data) {
        String content = new String(stockage.lire(template.getPath()), StandardCharsets.UTF_8);
        try {
            Template mustache = Mustache.compiler()
                    .defaultValue("")
                    .escapeHTML(true)
                    .compile(content);
            return mustache.execute(data);
        } catch (RuntimeException ex) {
            throw new BusinessException("Le template « " + template.getName() + " » n'a pas pu être rendu : " + ex.getMessage());
        }
    }

    public ValidationReportDto valider(TemplateType type, String content) {
        List<String> reconnues = new ArrayList<>();
        List<String> unknown = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> allowed = TemplateCatalog.nomsAllowed(type);
        Set<String> obligatoires = TemplateCatalog.obligatoires(type);
        Set<String> presentes = new TreeSet<>();

        Matcher matcher = VARIABLE.matcher(content);
        int profondeurLines = 0;
        while (matcher.find()) {
            String prefixe = matcher.group(1);
            String name = matcher.group(2).trim();
            if ("!".equals(prefixe)) {
                continue;
            }
            if ("/".equals(prefixe)) {
                if ("lignes".equals(name)) {
                    profondeurLines = Math.max(0, profondeurLines - 1);
                }
                continue;
            }
            String canonique = name;
            if (!allowed.contains(canonique) && profondeurLines > 0
                    && allowed.contains("lignes." + name)) {
                canonique = "lignes." + name;
            }
            if (!allowed.contains(canonique)) {
                if (!unknown.contains(name)) {
                    unknown.add(name);
                }
                continue;
            }
            presentes.add(canonique);
            if (!reconnues.contains(canonique)) {
                reconnues.add(canonique);
            }
            if ("#".equals(prefixe) && "lignes".equals(name)) {
                profondeurLines++;
            }
        }
        for (String required : obligatoires) {
            if (!presentes.contains(required)) {
                missing.add(required);
            }
        }

        errors.addAll(controlerSecurite(content));
        try {
            Mustache.compiler().compile(content);
        } catch (RuntimeException ex) {
            errors.add("Structure Mustache invalide : " + ex.getMessage());
        }
        if (!unknown.isEmpty()) {
            errors.add("Variables inconnues : " + String.join(", ", unknown));
        }
        return new ValidationReportDto(reconnues, unknown, missing, errors.isEmpty(), errors);
    }

    @Transactional
    public TemplateDto uploader(TemplateType type, String name, MultipartFile file) {
        if (name == null || name.isBlank()) {
            throw new BusinessException("Le nom du template est obligatoire.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le fichier template.");
        }
        detector.validerTemplateHtml(file.getOriginalFilename(), content);
        String html = new String(content, StandardCharsets.UTF_8);
        ValidationReportDto report = valider(type, html);
        if (!report.structureValid()) {
            throw new BusinessException(String.join(" ; ", report.errors()));
        }
        int version = repository.findTopByTypeOrderByVersionDesc(type).map(t -> t.getVersion() + 1).orElse(1);
        String path = stockage.stockerTemplate(content, type.name(), version);
        TemplateDocument template = new TemplateDocument();
        template.setType(type);
        template.setName(name.trim());
        template.setVersion(version);
        template.setFormat(TemplateFormat.HTML);
        template.setPath(path);
        template.setActive(false);
        template.setBuiltIn(false);
        template.setDeleted(false);
        template.setValidationReport(objectMapper.writeValueAsString(report));
        template.setCreatedAt(Instant.now(clock));
        return versDto(repository.save(template));
    }

    @Transactional
    public TemplateDto activer(Long id) {
        TemplateDocument template = parId(id);
        for (TemplateDocument autre : repository.findByTypeAndActiveTrueAndDeletedFalse(template.getType())) {
            autre.setActive(false);
            repository.save(autre);
        }
        template.setActive(true);
        return versDto(repository.save(template));
    }

    @Transactional
    public void delete(Long id) {
        TemplateDocument template = parId(id);
        if (template.isBuiltIn()) {
            throw new BusinessException("Le modèle intégré ne peut pas être supprimé.");
        }
        if (template.isActive()) {
            throw new BusinessException("Le template actif ne peut pas être supprimé. Activez d'abord un autre modèle.");
        }
        template.setDeleted(true);
        repository.save(template);
    }

    @Transactional
    public TemplateDto reinitialiser(TemplateType type) {
        TemplateDocument builtIn = repository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(type)
                .orElseThrow(() -> new NotFoundException("Modèle intégré introuvable."));
        return activer(builtIn.getId());
    }

    public byte[] file(Long id) {
        return stockage.lire(parId(id).getPath());
    }

    public byte[] fileDefaut(TemplateType type) {
        String path = type == TemplateType.QUITTANCE
                ? "classpath:templates/defaut/quittance.html"
                : "classpath:templates/defaut/note-frais.html";
        return stockage.lire(path);
    }

    public List<TemplateVariableDto> variables(TemplateType type) {
        return TemplateCatalog.variables(type);
    }

    public byte[] apercu(Long id, Map<String, Object> dataExample) {
        TemplateDocument template = parId(id);
        String html = rendre(template, dataExample);
        return pdfService.addWatermark(pdfService.rendreHtmlEnPdf(html));
    }

    public TemplateDto versDto(TemplateDocument t) {
        ValidationReportDto report = null;
        if (t.getValidationReport() != null && !t.getValidationReport().isBlank()) {
            try {
                report = objectMapper.readValue(t.getValidationReport(), ValidationReportDto.class);
            } catch (RuntimeException ignored) {
                report = null;
            }
        }
        return new TemplateDto(t.getId(), t.getType().name(), t.getName(), t.getVersion(), t.getFormat().name(),
                t.isActive(), t.isBuiltIn(), t.getCreatedAt(), report);
    }

    private List<String> controlerSecurite(String content) {
        List<String> errors = new ArrayList<>();
        String minuscule = content.toLowerCase(Locale.ROOT);
        if (minuscule.contains("{{{") || minuscule.contains("{{&")) {
            errors.add("Les expressions non échappées ({{{...}}} ou {{&...}}) sont interdites.");
        }
        if (minuscule.contains("#{") || minuscule.contains("<%")) {
            errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
        }
        if (minuscule.contains("javascript:")) {
            errors.add("Les liens JavaScript sont interdits.");
        }
        if (CSS_DISTANT.matcher(content).find()) {
            errors.add("Les ressources distantes sont interdites.");
        }
        Document document = Jsoup.parse(content);
        for (String balise : BALISES_INTERDITES) {
            if (!document.select(balise).isEmpty()) {
                errors.add("La balise <" + balise + "> est interdite.");
            }
        }
        for (Element element : document.getAllElements()) {
            for (Attribute attribut : element.attributes()) {
                String cle = attribut.getKey().toLowerCase(Locale.ROOT);
                String value = attribut.getValue().toLowerCase(Locale.ROOT).trim();
                if (cle.startsWith("on")) {
                    errors.add("Les attributs d'événement (« " + cle + " ») sont interdits.");
                }
                if (cle.startsWith("th:") || cle.startsWith("data-th-")) {
                    errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
                }
                if (cle.equals("href") && !value.startsWith("#")) {
                    errors.add("Les liens externes sont interdits dans un template.");
                }
                if ((cle.equals("src") || cle.equals("data")) && !value.startsWith("data:image/")) {
                    errors.add("Les images doivent être intégrées en data URI.");
                }
            }
        }
        return errors.stream().distinct().toList();
    }
}
