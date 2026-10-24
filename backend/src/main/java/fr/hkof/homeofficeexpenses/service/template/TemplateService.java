package fr.hkof.homeofficeexpenses.service.template;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.samskivert.mustache.Mustache;
import com.samskivert.mustache.Template;

import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.FileTypeDetector;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.PdfService;
import fr.hkof.homeofficeexpenses.service.StorageService;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.TemplateDto;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.TemplateVariableDto;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.ValidationReportDto;
import tools.jackson.databind.ObjectMapper;

@Service
public class TemplateService {

    private final TemplateDocumentRepository repository;
    private final StorageService storage;
    private final PdfService pdfService;
    private final FileTypeDetector detector;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final TemplateValidator validator = new TemplateValidator();

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
        return validator.validate(type, content);
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
}
