package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Settings;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.domain.Tenant;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.TenantRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptRequest;

class RentReceiptServiceTest {

    private RentReceiptRepository repository;
    private SettingsService settingsService;
    private RentConfigurationService rentConfigurationService;
    private LandlordRepository landlordRepository;
    private TenantRepository tenantRepository;
    private TemplateService templateService;
    private TemplateDataService templateDataService;
    private SignatureService signatureService;
    private PdfService pdfService;
    private StorageService storage;
    private RentReceiptService service;

    @BeforeEach
    void setUp() {
        repository = mock(RentReceiptRepository.class);
        settingsService = mock(SettingsService.class);
        rentConfigurationService = mock(RentConfigurationService.class);
        landlordRepository = mock(LandlordRepository.class);
        tenantRepository = mock(TenantRepository.class);
        templateService = mock(TemplateService.class);
        templateDataService = mock(TemplateDataService.class);
        signatureService = mock(SignatureService.class);
        pdfService = mock(PdfService.class);
        storage = mock(StorageService.class);
        service = new RentReceiptService(repository, settingsService, rentConfigurationService, landlordRepository,
                tenantRepository, templateService, templateDataService, signatureService, pdfService, storage,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Lease lease() {
        Landlord landlord = new Landlord();
        landlord.setId(1L);
        landlord.setName("Bailleur");
        landlord.setAddress("1 rue du Bail");
        Tenant tenant = new Tenant();
        tenant.setId(2L);
        tenant.setName("Locataire");
        tenant.setAddress("2 rue du Locataire");
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setLandlord(landlord);
        lease.setTenant(tenant);
        lease.setPropertyAddress("12 rue de la République");
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("50.00"));
        return lease;
    }

    private TemplateDocument template(Long id, TemplateType type, String name, int version) {
        TemplateDocument template = new TemplateDocument();
        template.setId(id);
        template.setType(type);
        template.setName(name);
        template.setVersion(version);
        template.setFormat(TemplateFormat.HTML);
        template.setPath("/templates/" + name + ".html");
        return template;
    }

    private RentReceiptRequest request(String month, String periodStart, String periodEnd, String rent, String charges,
            Long templateId, Long signatureId) {
        return new RentReceiptRequest(month, 1L, 2L, periodStart, periodEnd, rent, charges, null, null, templateId,
                signatureId);
    }

    private void stubGenerationDependencies(TemplateDocument template) {
        when(settingsService.entity()).thenReturn(new Settings());
        when(rentConfigurationService.resolveLease(1L, 2L)).thenReturn(lease());
        when(templateService.active(TemplateType.RENT_RECEIPT)).thenReturn(template);
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForLandlord(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.resolveForLandlord(7L, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
        when(templateService.render(any(), any())).thenReturn("<html></html>");
        when(pdfService.renderHtmlToPdf("<html></html>")).thenReturn(new byte[]{1});
        when(storage.storePdf(anyString(), any())).thenReturn("/data/out/quittance.pdf");
        when(repository.save(any(RentReceipt.class))).thenAnswer(invocation -> {
            RentReceipt saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });
        when(landlordRepository.findById(1L)).thenReturn(Optional.of(lease().getLandlord()));
        when(tenantRepository.findById(2L)).thenReturn(Optional.of(lease().getTenant()));
    }

    @Test
    @DisplayName("Generation uses the lease defaults when no override is given")
    void generateWithDefaults() {
        TemplateDocument template = template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2);
        stubGenerationDependencies(template);
        when(repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc("2026-10", 1L, 2L))
                .thenReturn(Optional.empty());

        RentReceiptDto dto = service.generate(request("2026-10", null, null, null, null, null, null));

        assertThat(dto.month()).isEqualTo("2026-10");
        assertThat(dto.version()).isEqualTo(1);
        assertThat(dto.total()).isEqualTo("950.00");
        assertThat(dto.rentExclCharges()).isEqualTo("900.00");
        assertThat(dto.charges()).isEqualTo("50.00");
        assertThat(dto.status()).isEqualTo("ACTIVE");
        assertThat(dto.landlordName()).isEqualTo("Bailleur");
        assertThat(dto.tenantName()).isEqualTo("Locataire");
        assertThat(dto.pdfAvailable()).isTrue();
        assertThat(dto.periodStart()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(dto.periodEnd()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(dto.issueDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(dto.paymentDate()).isEqualTo(LocalDate.of(2026, 10, 1));
    }

    @Test
    @DisplayName("Generation accepts explicit dates, amounts and template, and increments the version")
    void generateWithOverrides() {
        TemplateDocument template = template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2);
        stubGenerationDependencies(template);
        when(templateService.byId(4L)).thenReturn(template);
        RentReceipt existing = new RentReceipt();
        existing.setVersion(3);
        when(repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc("2026-10", 1L, 2L))
                .thenReturn(Optional.of(existing));

        RentReceiptDto dto = service.generate(request("2026-10", "2026-10-03", "2026-10-28", "800,50", "  ", 4L, 7L));

        assertThat(dto.version()).isEqualTo(4);
        assertThat(dto.rentExclCharges()).isEqualTo("800.50");
        assertThat(dto.periodStart()).isEqualTo(LocalDate.of(2026, 10, 3));
        assertThat(dto.periodEnd()).isEqualTo(LocalDate.of(2026, 10, 28));
    }

    @Test
    @DisplayName("Generation rejects an inverted period and a template of another type")
    void generateRejectsInvalidInputs() {
        when(settingsService.entity()).thenReturn(new Settings());
        when(rentConfigurationService.resolveLease(1L, 2L)).thenReturn(lease());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForLandlord(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");

        assertThatThrownBy(() -> service.generate(request("2026-10", "2026-10-31", "2026-10-01", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La fin de période ne peut pas précéder le début.");

        when(templateService.byId(9L)).thenReturn(template(9L, TemplateType.EXPENSE_STATEMENT, "Note", 1));
        assertThatThrownBy(() -> service.generate(request("2026-10", null, null, null, null, 9L, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le template sélectionné n'est pas un template de quittance.");
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Generation without a configured signature is rejected in French")
    void generateWithoutSignature() {
        when(settingsService.entity()).thenReturn(new Settings());
        when(rentConfigurationService.resolveLease(1L, 2L)).thenReturn(lease());
        when(templateService.active(TemplateType.RENT_RECEIPT))
                .thenReturn(template(1L, TemplateType.RENT_RECEIPT, "Quittance", 1));
        when(signatureService.resolveForLandlord(null, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(request("2026-10", null, null, null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Aucune signature configurée. Configurez une signature dans la page Paramètres.");
    }

    @Test
    @DisplayName("Preview renders a watermarked PDF with the active or selected template")
    void preview() {
        stubGenerationDependencies(template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2));
        when(pdfService.addWatermark(new byte[]{1})).thenReturn(new byte[]{2});

        assertThat(service.preview(request("2026-10", null, null, null, null, null, null))).containsExactly(2);

        when(templateService.byId(4L)).thenReturn(template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2));
        assertThat(service.preview(request("2026-10", null, null, null, null, 4L, null))).containsExactly(2);
    }

    @Test
    @DisplayName("Preview rejects an inverted period and a template of another type")
    void previewRejectsInvalidInputs() {
        when(settingsService.entity()).thenReturn(new Settings());
        when(rentConfigurationService.resolveLease(1L, 2L)).thenReturn(lease());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForLandlord(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");

        assertThatThrownBy(() -> service.preview(request("2026-10", "2026-10-31", "2026-10-01", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La fin de période ne peut pas précéder le début.");

        when(templateService.byId(9L)).thenReturn(template(9L, TemplateType.EXPENSE_STATEMENT, "Note", 1));
        assertThatThrownBy(() -> service.preview(request("2026-10", null, null, null, null, 9L, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le template sélectionné n'est pas un template de quittance.");
    }

    @Test
    @DisplayName("Listing without month returns every receipt and a month filters it")
    void list() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setMonth("2026-10");
        receipt.setStatus(DocumentStatus.ACTIVE);
        receipt.setVersion(1);
        when(repository.findAllByOrderByMonthDescVersionDescIdDesc()).thenReturn(List.of(receipt));
        when(repository.findByMonthOrderByVersionDescIdDesc("2026-10")).thenReturn(List.of(receipt));

        assertThat(service.list(null)).hasSize(1);
        assertThat(service.list(" ")).hasSize(1);
        assertThat(service.list("2026-10")).hasSize(1);
    }

    @Test
    @DisplayName("A missing receipt is a not found in French")
    void getMissing() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Quittance introuvable.");
        assertThatThrownBy(() -> service.entity(9L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active receipt is selected by pair when both identifiers are provided")
    void activeForMonth() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setStatus(DocumentStatus.ACTIVE);
        when(repository.findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                "2026-10", 1L, 2L, DocumentStatus.ACTIVE)).thenReturn(Optional.of(receipt));
        assertThat(service.activeForMonth("2026-10", 1L, 2L)).isSameAs(receipt);

        when(repository.findFirstByMonthAndStatusOrderByVersionDescIdDesc("2026-10", DocumentStatus.ACTIVE))
                .thenReturn(Optional.of(receipt));
        assertThat(service.activeForMonth("2026-10", null, 2L)).isSameAs(receipt);
        assertThat(service.activeForMonth("2026-10", 1L, null)).isSameAs(receipt);
        assertThat(service.activeForMonth("2026-10", null, null)).isSameAs(receipt);

        when(repository.findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                "2026-10", 3L, 4L, DocumentStatus.ACTIVE)).thenReturn(Optional.empty());
        assertThat(service.activeForMonth("2026-10", 3L, 4L)).isNull();
        when(repository.findFirstByMonthAndStatusOrderByVersionDescIdDesc("2026-11", DocumentStatus.ACTIVE))
                .thenReturn(Optional.empty());
        assertThat(service.activeForMonth("2026-11", null, null)).isNull();
    }

    @Test
    @DisplayName("The PDF is read from storage or reported missing")
    void pdf() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setPdfPath("/data/out/quittance.pdf");
        when(repository.findById(10L)).thenReturn(Optional.of(receipt));
        when(storage.read("/data/out/quittance.pdf")).thenReturn(new byte[]{3});
        assertThat(service.pdf(10L)).containsExactly(3);

        receipt.setPdfPath(null);
        assertThatThrownBy(() -> service.pdf(10L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Le PDF de cette quittance est introuvable.");
    }

    @Test
    @DisplayName("Mapping a receipt tolerates missing landlord and tenant records")
    void toDtoWithMissingDirectoryEntries() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setMonth("2026-10");
        receipt.setLandlordId(5L);
        receipt.setTenantId(6L);
        receipt.setRentExclCharges(new BigDecimal("900"));
        receipt.setCharges(new BigDecimal("50"));
        receipt.setTotal(new BigDecimal("950"));
        receipt.setStatus(DocumentStatus.ACTIVE);
        receipt.setPdfPath("/data/out/quittance.pdf");
        when(landlordRepository.findById(5L)).thenReturn(Optional.empty());
        when(tenantRepository.findById(6L)).thenReturn(Optional.empty());

        RentReceiptDto dto = service.toDto(receipt);

        assertThat(dto.landlordName()).isNull();
        assertThat(dto.tenantName()).isNull();
        assertThat(dto.pdfAvailable()).isTrue();
    }

    @Test
    @DisplayName("Mapping a receipt without ids skips the directory lookups")
    void toDtoWithoutIds() {
        RentReceipt receipt = new RentReceipt();
        receipt.setMonth("2026-10");
        receipt.setStatus(DocumentStatus.ACTIVE);
        receipt.setRentExclCharges(new BigDecimal("900"));
        receipt.setCharges(new BigDecimal("50"));
        receipt.setTotal(new BigDecimal("950"));

        RentReceiptDto dto = service.toDto(receipt);

        assertThat(dto.landlordId()).isNull();
        assertThat(dto.tenantId()).isNull();
        assertThat(dto.landlordName()).isNull();
        assertThat(dto.tenantName()).isNull();
        assertThat(dto.pdfAvailable()).isFalse();
        verify(landlordRepository, never()).findById(any());
        verify(tenantRepository, never()).findById(any());
    }
}
