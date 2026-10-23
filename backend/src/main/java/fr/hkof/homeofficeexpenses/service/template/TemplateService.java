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
    private static final List<String> FORBIDDEN_TAGS = List.of("script", "iframe", "object", "embed", "form", "base");
    private static final Pattern REMOTE_CSS_URL = Pattern.compile("url\\(\\s*['\"]?\\s*(https?:|//|file:)", Pattern.CASE_INSENSITIVE);

    private final TemplateDocumentRepository repository;
    private final StorageService storage;
    private final PdfService pdfService;
    private final FileTypeDetector detector;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public TemplateService(TemplateDocumentRepository repository, StorageService storage, PdfService pdfService,
            FileTypeDetector detector, ObjectMapper objectMapper, Clock clock) {
        this.repository = repository;
        this.storage = storage;
        this.pdfService = pdfService;
        this.detector = detector;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<TemplateDto> list(TemplateType type) {
        return repository.findByTypeAndDeletedFalseOrderByVersionDesc(type).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateDocument active(TemplateType type) {
        return repository.findFirstByTypeAndActiveTrueAndDeletedFalse(type)
                .or(() -> repository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(type))
                .orElseThrow(() -> new NotFoundException("Aucun template actif pour " + type));
    }

    @Transactional(readOnly = true)
    public TemplateDocument byId(Long id) {
        return repository.findById(id)
                .filter(template -> !template.isDeleted())
                .orElseThrow(() -> new NotFoundException("Template introuvable."));
    }

    public String render(TemplateDocument template, Map<String, Object> data) {
        String content = new String(storage.read(template.getPath()), StandardCharsets.UTF_8);
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

    public ValidationReportDto validate(TemplateType type, String content) {
        List<String> recognized = new ArrayList<>();
        List<String> unknown = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        Set<String> allowed = TemplateCatalog.allowedNames(type);
        Set<String> requires = TemplateCatalog.requiredNames(type);
        Set<String> presentVariables = new TreeSet<>();

        Matcher matcher = VARIABLE.matcher(content);
        int lineDepth = 0;
        while (matcher.find()) {
            String prefix = matcher.group(1);
            String name = matcher.group(2).trim();
            if ("!".equals(prefix)) {
                continue;
            }
            if ("/".equals(prefix)) {
                if ("lignes".equals(name)) {
                    lineDepth = Math.max(0, lineDepth - 1);
                }
                continue;
            }
            String canonical = name;
            if (!allowed.contains(canonical) && lineDepth > 0
                    && allowed.contains("lignes." + name)) {
                canonical = "lignes." + name;
            }
            if (!allowed.contains(canonical)) {
                if (!unknown.contains(name)) {
                    unknown.add(name);
                }
                continue;
            }
            presentVariables.add(canonical);
            if (!recognized.contains(canonical)) {
                recognized.add(canonical);
            }
            if ("#".equals(prefix) && "lignes".equals(name)) {
                lineDepth++;
            }
        }
        for (String required : requires) {
            if (!presentVariables.contains(required)) {
                missing.add(required);
            }
        }

        errors.addAll(checkSecurity(content));
        try {
            Mustache.compiler().compile(content);
        } catch (RuntimeException ex) {
            errors.add("Structure Mustache invalide : " + ex.getMessage());
        }
        if (!unknown.isEmpty()) {
            errors.add("Variables inconnues : " + String.join(", ", unknown));
        }
        return new ValidationReportDto(recognized, unknown, missing, errors.isEmpty(), errors);
    }

    @Transactional
    public TemplateDto upload(TemplateType type, String name, MultipartFile file) {
        if (name == null || name.isBlank()) {
            throw new BusinessException("Le nom du template est obligatoire.");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("Impossible de lire le fichier template.");
        }
        detector.validateTemplateHtml(file.getOriginalFilename(), content);
        String html = new String(content, StandardCharsets.UTF_8);
        ValidationReportDto report = validate(type, html);
        if (!report.structureValid()) {
            throw new BusinessException(String.join(" ; ", report.errors()));
        }
        int version = repository.findTopByTypeOrderByVersionDesc(type).map(template -> template.getVersion() + 1).orElse(1);
        String path = storage.storeTemplate(content, type.name(), version);
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
        return toDto(repository.save(template));
    }

    @Transactional
    public TemplateDto activate(Long id) {
        TemplateDocument template = byId(id);
        List<TemplateDocument> activeTemplates = repository.findByTypeAndActiveTrueAndDeletedFalse(template.getType());
        for (TemplateDocument other : activeTemplates) {
            other.setActive(false);
        }
        if (!activeTemplates.isEmpty()) {
            // Flush the deactivation before activating the new version: the PostgreSQL partial
            // unique index ux_template_active rejects two active rows for the same type, even
            // within a single transaction.
            repository.saveAll(activeTemplates);
            repository.flush();
        }
        template.setActive(true);
        return toDto(repository.save(template));
    }

    @Transactional
    public void delete(Long id) {
        TemplateDocument template = byId(id);
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
    public TemplateDto reset(TemplateType type) {
        TemplateDocument builtIn = repository.findFirstByTypeAndBuiltInTrueAndDeletedFalse(type)
                .orElseThrow(() -> new NotFoundException("Modèle intégré introuvable."));
        return activate(builtIn.getId());
    }

    public byte[] file(Long id) {
        return storage.read(byId(id).getPath());
    }

    public byte[] defaultFile(TemplateType type) {
        String path = type == TemplateType.RENT_RECEIPT
                ? "classpath:templates/defaut/quittance.html"
                : "classpath:templates/defaut/note-frais.html";
        return storage.read(path);
    }

    public List<TemplateVariableDto> variables(TemplateType type) {
        return TemplateCatalog.variables(type);
    }

    public byte[] preview(Long id, Map<String, Object> dataExample) {
        TemplateDocument template = byId(id);
        String html = render(template, dataExample);
        return pdfService.addWatermark(pdfService.renderHtmlToPdf(html));
    }

    public TemplateDto toDto(TemplateDocument template) {
        ValidationReportDto report = null;
        if (template.getValidationReport() != null && !template.getValidationReport().isBlank()) {
            try {
                report = objectMapper.readValue(template.getValidationReport(), ValidationReportDto.class);
            } catch (RuntimeException ignored) {
                report = null;
            }
        }
        return new TemplateDto(template.getId(), template.getType().name(), template.getName(), template.getVersion(), template.getFormat().name(),
                template.isActive(), template.isBuiltIn(), template.getCreatedAt(), report);
    }

    private List<String> checkSecurity(String content) {
        List<String> errors = new ArrayList<>();
        String lowercaseContent = content.toLowerCase(Locale.ROOT);
        if (lowercaseContent.contains("{{{") || lowercaseContent.contains("{{&")) {
            errors.add("Les expressions non échappées ({{{...}}} ou {{&...}}) sont interdites.");
        }
        if (lowercaseContent.contains("#{") || lowercaseContent.contains("<%")) {
            errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
        }
        if (lowercaseContent.contains("javascript:")) {
            errors.add("Les liens JavaScript sont interdits.");
        }
        if (REMOTE_CSS_URL.matcher(content).find()) {
            errors.add("Les ressources distantes sont interdites.");
        }
        Document document = Jsoup.parse(content);
        for (String tag : FORBIDDEN_TAGS) {
            if (!document.select(tag).isEmpty()) {
                errors.add("La balise <" + tag + "> est interdite.");
            }
        }
        for (Element element : document.getAllElements()) {
            for (Attribute attribute : element.attributes()) {
                String key = attribute.getKey().toLowerCase(Locale.ROOT);
                String value = attribute.getValue().toLowerCase(Locale.ROOT).trim();
                if (key.startsWith("on")) {
                    errors.add("Les attributs d'événement (« " + key + " ») sont interdits.");
                }
                if (key.startsWith("th:") || key.startsWith("data-th-")) {
                    errors.add("Les expressions exécutables (Thymeleaf, JSP) sont interdites.");
                }
                if (key.equals("href") && !value.startsWith("#")) {
                    errors.add("Les liens externes sont interdits dans un template.");
                }
                if (key.equals("src") || key.equals("data")) {
                    boolean embeddedImage = value.startsWith("data:image/")
                            || (key.equals("src") && "{{signature}}".equals(value.trim()));
                    if (!embeddedImage) {
                        errors.add("Les images doivent être intégrées en data URI.");
                    }
                }
            }
        }
        return errors.stream().distinct().toList();
    }
}
