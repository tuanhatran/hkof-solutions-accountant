package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.FileTypeDetector;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import fr.hkof.homeofficeexpenses.service.OwnershipContext;
import fr.hkof.homeofficeexpenses.service.PdfService;
import fr.hkof.homeofficeexpenses.service.StorageService;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.TemplateDto;
import tools.jackson.databind.ObjectMapper;

class TemplateServiceTest {

    private TemplateDocumentRepository repository;
    private StorageService storage;
    private PdfService pdfService;
    private FileTypeDetector detector;
    private OwnershipContext ownership;
    private TemplateService service;

    @BeforeEach
    void setUp() {
        repository = mock(TemplateDocumentRepository.class);
        storage = mock(StorageService.class);
        pdfService = mock(PdfService.class);
        detector = mock(FileTypeDetector.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(1L);
        service = new TemplateService(repository, storage, pdfService, detector, new ObjectMapper(), ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private TemplateDocument template(Long id, TemplateType type, String name, int version, boolean active,
            boolean builtIn, boolean deleted) {
        TemplateDocument template = new TemplateDocument();
        template.setId(id);
        template.setUserId(1L);
        template.setType(type);
        template.setName(name);
        template.setVersion(version);
        template.setFormat(TemplateFormat.HTML);
        template.setPath("/data/templates/" + name + ".html");
        template.setActive(active);
        template.setBuiltIn(builtIn);
        template.setDeleted(deleted);
        template.setCreatedAt(Instant.parse("2026-10-01T10:00:00Z"));
        return template;
    }

    private MultipartFile htmlFile(String content) {
        return new MockMultipartFile("file", "modele.html", "text/html", content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("Lists every non deleted template of a type")
    void list() {
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.of(template(10L, TemplateType.RENT_RECEIPT, "Intégré", 1, true, true, false)));
        when(repository.findByUserIdAndTypeAndDeletedFalseOrderByVersionDesc(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(List.of(template(1L, TemplateType.RENT_RECEIPT, "Quittance", 2, true, false, false)));

        assertThat(service.list(TemplateType.RENT_RECEIPT)).extracting(TemplateDto::name).containsExactly("Quittance");
    }

    @Test
    @DisplayName("The active template falls back to the built-in one then fails")
    void active() {
        TemplateDocument active = template(1L, TemplateType.RENT_RECEIPT, "Actif", 2, true, false, false);
        TemplateDocument builtIn = template(2L, TemplateType.RENT_RECEIPT, "Intégré", 1, false, true, false);
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(any(), any()))
                .thenReturn(Optional.of(builtIn));
        when(repository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.of(active));
        assertThat(service.active(TemplateType.RENT_RECEIPT)).isSameAs(active);

        when(repository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.EXPENSE_STATEMENT))
                .thenReturn(Optional.empty());
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.EXPENSE_STATEMENT))
                .thenReturn(Optional.of(builtIn));
        assertThat(service.active(TemplateType.EXPENSE_STATEMENT)).isSameAs(builtIn);

        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.empty());
        when(repository.findFirstByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.active(TemplateType.RENT_RECEIPT))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Aucun template actif")
                .satisfies(ex -> {
                    assertThat(((NotFoundException) ex).getCode()).isEqualTo("TEMPLATE_ACTIVE_NOT_FOUND");
                    assertThat(((NotFoundException) ex).getParams()).containsEntry("type", "RENT_RECEIPT");
                });
    }

    @Test
    @DisplayName("A deleted or missing template is a not found")
    void byId() {
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.empty());
        when(repository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(template(2L, TemplateType.RENT_RECEIPT, "Supprimé", 1,
                false, false, true)));

        assertThatThrownBy(() -> service.byId(1L)).isInstanceOf(NotFoundException.class)
                .hasMessage("Template introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("TEMPLATE_NOT_FOUND"));
        assertThatThrownBy(() -> service.byId(2L)).isInstanceOf(NotFoundException.class)
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("TEMPLATE_NOT_FOUND"));
    }

    @Test
    @DisplayName("A foreign template id returns 404 TEMPLATE_NOT_FOUND")
    void foreignTemplateIdNotFound() {
        when(repository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.byId(999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Template introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("TEMPLATE_NOT_FOUND"));
    }

    @Test
    @DisplayName("Lazily creates built-in template when absent for the user")
    void lazilyCreatesBuiltInTemplate() {
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.empty());
        when(repository.findByUserIdAndTypeAndDeletedFalseOrderByVersionDesc(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(List.of());

        service.list(TemplateType.RENT_RECEIPT);

        ArgumentCaptor<TemplateDocument> captor = ArgumentCaptor.forClass(TemplateDocument.class);
        verify(repository).save(captor.capture());
        TemplateDocument created = captor.getValue();
        assertThat(created.getUserId()).isEqualTo(1L);
        assertThat(created.isBuiltIn()).isTrue();
        assertThat(created.isActive()).isTrue();
        assertThat(created.getType()).isEqualTo(TemplateType.RENT_RECEIPT);
    }

    @Test
    @DisplayName("Rendering compiles the stored Mustache content with escaped HTML")
    void render() {
        TemplateDocument template = template(1L, TemplateType.RENT_RECEIPT, "Quittance", 1, true, false, false);
        when(storage.read(template.getPath())).thenReturn("<p>{{nom}}</p>".getBytes(StandardCharsets.UTF_8));

        assertThat(service.render(template, Map.of("nom", "<b>Jean</b>")))
                .isEqualTo("<p>&lt;b&gt;Jean&lt;/b&gt;</p>");
    }

    @Test
    @DisplayName("A broken template render fails with the template name")
    void renderFailure() {
        TemplateDocument template = template(1L, TemplateType.RENT_RECEIPT, "Cassé", 1, true, false, false);
        when(storage.read(template.getPath())).thenReturn("{{#section}}".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service.render(template, Map.of()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cassé")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("TEMPLATE_RENDER_FAILED");
                    assertThat(((BusinessException) ex).getParams()).containsEntry("name", "Cassé");
                });
    }

    @Test
    @DisplayName("Upload requires a name and a readable file")
    void uploadRequirements() throws IOException {
        assertThatThrownBy(() -> service.upload(TemplateType.RENT_RECEIPT, " ", htmlFile("<html></html>")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom du template est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("TEMPLATE_NAME_REQUIRED"));

        MultipartFile broken = mock(MultipartFile.class);
        when(broken.getBytes()).thenThrow(new IOException("boom"));
        assertThatThrownBy(() -> service.upload(TemplateType.RENT_RECEIPT, "Modèle", broken))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Impossible de lire le fichier template.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("TEMPLATE_FILE_UNREADABLE"));
    }

    @Test
    @DisplayName("Upload rejects a file refused by the detector")
    void uploadRejectedByDetector() {
        MultipartFile file = htmlFile("<html></html>");
        doThrow(new BusinessException("Format non accepté."))
                .when(detector).validateTemplateHtml(eq("modele.html"), any());

        assertThatThrownBy(() -> service.upload(TemplateType.RENT_RECEIPT, "Modèle", file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Format non accepté.");
    }

    @Test
    @DisplayName("Upload rejects a structurally invalid template")
    void uploadRejectsInvalidStructure() {
        assertThatThrownBy(() -> service.upload(TemplateType.RENT_RECEIPT,
                "Modèle", htmlFile("<html><body><script>alert(1)</script>{{bailleur.nom}}</body></html>")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("script")
                .satisfies(ex -> {
                    assertThat(((BusinessException) ex).getCode()).isEqualTo("TEMPLATE_INVALID");
                    assertThat(((BusinessException) ex).getParams()).isEmpty();
                });
    }

    @Test
    @DisplayName("Upload stores version 1 or increments the latest version")
    void uploadVersions() {
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(any(), any()))
                .thenReturn(Optional.of(template(99L, TemplateType.RENT_RECEIPT, "Intégré", 1, true, true, false)));
        when(repository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.storeTemplate(eq(1L), any(), eq("RENT_RECEIPT"), eq(1))).thenReturn("/data/templates/u1_1.html");
        when(repository.findTopByUserIdAndTypeOrderByVersionDesc(1L, TemplateType.RENT_RECEIPT)).thenReturn(Optional.empty());

        TemplateDto first = service.upload(TemplateType.RENT_RECEIPT, " Modèle ",
                htmlFile("<html><body>{{bailleur.nom}}{{locataire.nom}}{{total}}</body></html>"));
        assertThat(first.version()).isEqualTo(1);
        assertThat(first.name()).isEqualTo("Modèle");
        assertThat(first.active()).isFalse();
        assertThat(first.builtIn()).isFalse();
        assertThat(first.report()).isNotNull();

        when(repository.findTopByUserIdAndTypeOrderByVersionDesc(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.of(template(1L, TemplateType.RENT_RECEIPT, "Ancien", 4, true, false, false)));
        when(storage.storeTemplate(eq(1L), any(), eq("RENT_RECEIPT"), eq(5))).thenReturn("/data/templates/u1_5.html");
        TemplateDto next = service.upload(TemplateType.RENT_RECEIPT, "Modèle",
                htmlFile("<html><body>{{bailleur.nom}}{{locataire.nom}}{{total}}</body></html>"));
        assertThat(next.version()).isEqualTo(5);
    }

    @Test
    @DisplayName("Activation deactivates the previous versions and flushes them")
    void activate() {
        TemplateDocument current = template(1L, TemplateType.RENT_RECEIPT, "Nouveau", 2, false, false, false);
        TemplateDocument previous = template(2L, TemplateType.RENT_RECEIPT, "Ancien", 1, true, false, false);
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(current));
        when(repository.findByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(List.of(previous));
        when(repository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TemplateDto dto = service.activate(1L);

        assertThat(dto.active()).isTrue();
        assertThat(previous.isActive()).isFalse();
        verify(repository).saveAll(List.of(previous));
        verify(repository).flush();
    }

    @Test
    @DisplayName("Activation without previous active version skips the flush")
    void activateWithoutPrevious() {
        TemplateDocument current = template(1L, TemplateType.RENT_RECEIPT, "Nouveau", 1, false, false, false);
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(current));
        when(repository.findByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT)).thenReturn(List.of());
        when(repository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.activate(1L);

        verify(repository, never()).flush();
        assertThat(current.isActive()).isTrue();
    }

    @Test
    @DisplayName("Built-in and active templates cannot be deleted")
    void deleteRules() {
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(
                template(1L, TemplateType.RENT_RECEIPT, "Intégré", 1, false, true, false)));
        when(repository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(
                template(2L, TemplateType.RENT_RECEIPT, "Actif", 1, true, false, false)));

        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le modèle intégré ne peut pas être supprimé.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("TEMPLATE_BUILT_IN_NOT_DELETABLE"));
        assertThatThrownBy(() -> service.delete(2L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("template actif")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("TEMPLATE_ACTIVE_NOT_DELETABLE"));
    }

    @Test
    @DisplayName("Deleting an inactive custom template is logical")
    void deleteCustom() {
        TemplateDocument custom = template(1L, TemplateType.RENT_RECEIPT, "Perso", 1, false, false, false);
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(custom));
        when(repository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.delete(1L);

        assertThat(custom.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Reset activates the built-in template or fails")
    void reset() {
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.reset(TemplateType.RENT_RECEIPT))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Modèle intégré introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("TEMPLATE_BUILT_IN_NOT_FOUND"));

        TemplateDocument builtIn = template(1L, TemplateType.RENT_RECEIPT, "Intégré", 1, false, true, false);
        when(repository.findFirstByUserIdAndTypeAndBuiltInTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT))
                .thenReturn(Optional.of(builtIn));
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(builtIn));
        when(repository.findByUserIdAndTypeAndActiveTrueAndDeletedFalse(1L, TemplateType.RENT_RECEIPT)).thenReturn(List.of());
        when(repository.save(any(TemplateDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.reset(TemplateType.RENT_RECEIPT).active()).isTrue();
    }

    @Test
    @DisplayName("File and default file read the stored templates")
    void files() {
        TemplateDocument custom = template(1L, TemplateType.RENT_RECEIPT, "Perso", 1, false, false, false);
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(custom));
        when(storage.read(custom.getPath())).thenReturn(new byte[]{1});
        when(storage.read("classpath:templates/defaut/quittance.html")).thenReturn(new byte[]{2});
        when(storage.read("classpath:templates/defaut/note-frais.html")).thenReturn(new byte[]{3});

        assertThat(service.file(1L)).containsExactly(1);
        assertThat(service.defaultFile(TemplateType.RENT_RECEIPT)).containsExactly(2);
        assertThat(service.defaultFile(TemplateType.EXPENSE_STATEMENT)).containsExactly(3);
    }

    @Test
    @DisplayName("Variables come from the catalog")
    void variables() {
        assertThat(service.variables(TemplateType.RENT_RECEIPT)).extracting(variable -> variable.name())
                .contains("bailleur.nom");
    }

    @Test
    @DisplayName("Preview renders and watermarks the PDF")
    void preview() {
        TemplateDocument custom = template(1L, TemplateType.RENT_RECEIPT, "Perso", 1, false, false, false);
        when(repository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(custom));
        when(storage.read(custom.getPath())).thenReturn("<p>{{nom}}</p>".getBytes(StandardCharsets.UTF_8));
        when(pdfService.renderHtmlToPdf("<p>Jean</p>")).thenReturn(new byte[]{4});
        when(pdfService.addWatermark(new byte[]{4})).thenReturn(new byte[]{5});

        assertThat(service.preview(1L, Map.of("nom", "Jean"))).containsExactly(5);
    }

    @Test
    @DisplayName("A missing, blank or invalid validation report maps to null")
    void toDtoReports() {
        TemplateDocument empty = template(1L, TemplateType.RENT_RECEIPT, "Vide", 1, false, false, false);
        empty.setValidationReport(null);
        assertThat(service.toDto(empty).report()).isNull();

        empty.setValidationReport(" ");
        assertThat(service.toDto(empty).report()).isNull();

        empty.setValidationReport("{ not json");
        assertThat(service.toDto(empty).report()).isNull();

        empty.setValidationReport("""
                {"recognizedVariables":["total"],"unknownVariables":[],"missingVariables":[],
                 "structureValid":true,"errors":[]}
                """);
        assertThat(service.toDto(empty).report()).isNotNull();
        assertThat(service.toDto(empty).report().structureValid()).isTrue();
    }
}
