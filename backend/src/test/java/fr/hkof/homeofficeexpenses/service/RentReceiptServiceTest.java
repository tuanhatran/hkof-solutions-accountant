package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateFormat;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateDataService;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptRequest;

class RentReceiptServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long TENANT_COMPANY_ID = 5L;

    private RentReceiptRepository repository;
    private CompanyService companies;
    private LeaseService leaseService;
    private PersonRepository persons;
    private TemplateService templateService;
    private TemplateDataService templateDataService;
    private SignatureService signatureService;
    private PdfService pdfService;
    private StorageService storage;
    private DocumentDraftService documentDraftService;
    private RentReceiptService service;

    @BeforeEach
    void setUp() {
        repository = mock(RentReceiptRepository.class);
        companies = mock(CompanyService.class);
        leaseService = mock(LeaseService.class);
        persons = mock(PersonRepository.class);
        templateService = mock(TemplateService.class);
        templateDataService = mock(TemplateDataService.class);
        signatureService = mock(SignatureService.class);
        pdfService = mock(PdfService.class);
        storage = mock(StorageService.class);
        documentDraftService = mock(DocumentDraftService.class);
        service = new RentReceiptService(repository, companies, leaseService, templateService,
                templateDataService, signatureService, pdfService, storage, documentDraftService,
                new RentReceiptMapper(persons, companies),
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Company company(Long id, String name) {
        Company company = new Company();
        company.setId(id);
        company.setName(name);
        return company;
    }

    private Person person(Long id, String name, String address) {
        Person person = new Person();
        person.setId(id);
        person.setName(name);
        person.setAddress(address);
        return person;
    }

    private Lease normalLease() {
        Address address = new Address();
        address.setId(4L);
        address.setLabel("12 rue de la République");
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setCompanyId(COMPANY_ID);
        lease.setLandlord(person(1L, "Bailleur", "1 rue du Bail"));
        lease.setTenant(person(2L, "Locataire", "2 rue du Locataire"));
        lease.setAddress(address);
        lease.setRentExclCharges(new BigDecimal("900.00"));
        lease.setCharges(new BigDecimal("50.00"));
        return lease;
    }

    private Lease personLeaseWithoutCompany() {
        Lease lease = normalLease();
        lease.setCompanyId(null);
        return lease;
    }

    private Lease companyLease() {
        Address address = new Address();
        address.setId(4L);
        address.setLabel("12 rue de la République");
        Lease lease = new Lease();
        lease.setId(3L);
        lease.setCompanyId(TENANT_COMPANY_ID);
        lease.setCompanyLease(true);
        lease.setLandlord(person(1L, "Bailleur", "1 rue du Bail"));
        lease.setTenant(null);
        lease.setAddress(address);
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
        return new RentReceiptRequest(month, COMPANY_ID, 1L, 2L, null, periodStart, periodEnd, rent, charges, null, null,
                templateId, signatureId);
    }

    private RentReceiptRequest personRequest(String month, Long templateId, Long signatureId) {
        return new RentReceiptRequest(month, null, 1L, 2L, null, null, null, null, null, null, null,
                templateId, signatureId);
    }

    private RentReceiptRequest companyRequest(String month, Long templateId, Long signatureId) {
        return new RentReceiptRequest(month, COMPANY_ID, 1L, null, TENANT_COMPANY_ID, null, null, null, null, null, null,
                templateId, signatureId);
    }

    private void stubGenerationDependencies(TemplateDocument template) {
        when(companies.entity(COMPANY_ID)).thenReturn(company(COMPANY_ID, "HKOF"));
        when(companies.find(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        when(leaseService.resolveLease(1L, 2L, null)).thenReturn(normalLease());
        when(templateService.active(TemplateType.RENT_RECEIPT)).thenReturn(template);
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForPerson(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.resolveForPerson(7L, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");
        when(templateService.render(any(), any())).thenReturn("<html></html>");
        when(pdfService.renderHtmlToPdf("<html></html>")).thenReturn(new byte[]{1});
        when(storage.storePdf(anyString(), any())).thenReturn("/data/out/quittance.pdf");
        when(repository.save(any(RentReceipt.class))).thenAnswer(invocation -> {
            RentReceipt saved = invocation.getArgument(0);
            saved.setId(10L);
            return saved;
        });
        when(persons.findById(1L)).thenReturn(Optional.of(person(1L, "Bailleur", "1 rue du Bail")));
        when(persons.findById(2L)).thenReturn(Optional.of(person(2L, "Locataire", "2 rue du Locataire")));
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
        assertThat(dto.tenantId()).isEqualTo(2L);
        assertThat(dto.tenantCompanyId()).isNull();
        assertThat(dto.pdfAvailable()).isTrue();
        assertThat(dto.periodStart()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(dto.periodEnd()).isEqualTo(LocalDate.of(2026, 10, 31));
        assertThat(dto.issueDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(dto.paymentDate()).isEqualTo(LocalDate.of(2026, 10, 1));
        verify(storage).storePdf("quittance_2026-10_l1_t2_v1.pdf", new byte[]{1});
        verify(documentDraftService).deleteActiveRentReceipt("2026-10", 1L, 2L, null);
    }

    @Test
    @DisplayName("Generation clears the active draft of the generated company lease scope")
    void generateClearsCompanyLeaseDraft() {
        TemplateDocument template = template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2);
        stubGenerationDependencies(template);
        when(companies.entity(TENANT_COMPANY_ID)).thenReturn(company(TENANT_COMPANY_ID, "Société Locataire"));
        when(companies.find(TENANT_COMPANY_ID)).thenReturn(Optional.of(company(TENANT_COMPANY_ID, "Société Locataire")));
        when(leaseService.resolveLease(1L, null, TENANT_COMPANY_ID)).thenReturn(companyLease());
        when(repository.findFirstByMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
                "2026-10", 1L, TENANT_COMPANY_ID)).thenReturn(Optional.empty());

        service.generate(companyRequest("2026-10", null, null));

        verify(documentDraftService).deleteActiveRentReceipt("2026-10", 1L, null, TENANT_COMPANY_ID);
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
    @DisplayName("A company lease stores the tenant company and keeps its own version sequence")
    void generateCompanyLease() {
        TemplateDocument template = template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2);
        stubGenerationDependencies(template);
        when(companies.entity(TENANT_COMPANY_ID)).thenReturn(company(TENANT_COMPANY_ID, "Société Locataire"));
        when(companies.find(TENANT_COMPANY_ID)).thenReturn(Optional.of(company(TENANT_COMPANY_ID, "Société Locataire")));
        when(leaseService.resolveLease(1L, null, TENANT_COMPANY_ID)).thenReturn(companyLease());
        RentReceipt existing = new RentReceipt();
        existing.setVersion(1);
        when(repository.findFirstByMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
                "2026-10", 1L, TENANT_COMPANY_ID)).thenReturn(Optional.of(existing));

        RentReceiptDto dto = service.generate(companyRequest("2026-10", null, null));

        assertThat(dto.companyId()).isEqualTo(TENANT_COMPANY_ID);
        assertThat(dto.companyName()).isEqualTo("Société Locataire");
        assertThat(dto.landlordName()).isEqualTo("Bailleur");
        assertThat(dto.tenantId()).isNull();
        assertThat(dto.tenantCompanyId()).isEqualTo(TENANT_COMPANY_ID);
        assertThat(dto.tenantName()).isEqualTo("Société Locataire");
        assertThat(dto.version()).isEqualTo(2);
        verify(storage).storePdf("quittance_2026-10_l1_c5_v2.pdf", new byte[]{1});
    }

    @Test
    @DisplayName("A person lease without company generates a receipt without company")
    void generatePersonLeaseWithoutCompany() {
        TemplateDocument template = template(4L, TemplateType.RENT_RECEIPT, "Quittance", 2);
        stubGenerationDependencies(template);
        when(leaseService.resolveLease(1L, 2L, null)).thenReturn(personLeaseWithoutCompany());
        when(repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc("2026-10", 1L, 2L))
                .thenReturn(Optional.empty());

        RentReceiptDto dto = service.generate(personRequest("2026-10", null, null));

        assertThat(dto.companyId()).isNull();
        assertThat(dto.companyName()).isNull();
        assertThat(dto.tenantId()).isEqualTo(2L);
        assertThat(dto.total()).isEqualTo("950.00");
        verify(companies, never()).entity(any());
    }

    @Test
    @DisplayName("Generation rejects an inverted period and a template of another type")
    void generateRejectsInvalidInputs() {
        when(companies.entity(COMPANY_ID)).thenReturn(company(COMPANY_ID, "HKOF"));
        when(leaseService.resolveLease(1L, 2L, null)).thenReturn(normalLease());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForPerson(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");

        assertThatThrownBy(() -> service.generate(request("2026-10", "2026-10-31", "2026-10-01", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La fin de période ne peut pas précéder le début.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_PERIOD_INVALID"));

        when(templateService.byId(9L)).thenReturn(template(9L, TemplateType.EXPENSE_STATEMENT, "Note", 1));
        assertThatThrownBy(() -> service.generate(request("2026-10", null, null, null, null, 9L, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le template sélectionné n'est pas un template de quittance.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_TEMPLATE_INVALID"));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("Generation without a configured landlord signature is rejected in French")
    void generateWithoutSignature() {
        when(companies.entity(COMPANY_ID)).thenReturn(company(COMPANY_ID, "HKOF"));
        when(leaseService.resolveLease(1L, 2L, null)).thenReturn(normalLease());
        when(templateService.active(TemplateType.RENT_RECEIPT))
                .thenReturn(template(1L, TemplateType.RENT_RECEIPT, "Quittance", 1));
        when(signatureService.resolveForPerson(null, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(request("2026-10", null, null, null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Aucune signature configurée. Ajoutez une signature au bailleur dans la page LMNP.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("SIGNATURE_MISSING"));
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
        when(companies.entity(COMPANY_ID)).thenReturn(company(COMPANY_ID, "HKOF"));
        when(leaseService.resolveLease(1L, 2L, null)).thenReturn(normalLease());
        Signature signature = new Signature();
        signature.setId(7L);
        when(signatureService.resolveForPerson(null, 1L)).thenReturn(Optional.of(signature));
        when(signatureService.dataUri(7L)).thenReturn("data:image/png;base64,AAAA");

        assertThatThrownBy(() -> service.preview(request("2026-10", "2026-10-31", "2026-10-01", null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La fin de période ne peut pas précéder le début.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_PERIOD_INVALID"));

        when(templateService.byId(9L)).thenReturn(template(9L, TemplateType.EXPENSE_STATEMENT, "Note", 1));
        assertThatThrownBy(() -> service.preview(request("2026-10", null, null, null, null, 9L, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le template sélectionné n'est pas un template de quittance.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_TEMPLATE_INVALID"));
    }

    @Test
    @DisplayName("Listing filters by company and month or lists every receipt")
    void list() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setMonth("2026-10");
        receipt.setStatus(DocumentStatus.ACTIVE);
        receipt.setVersion(1);
        when(repository.findByCompanyIdOrderByMonthDescVersionDescIdDesc(COMPANY_ID)).thenReturn(List.of(receipt));
        when(repository.findByCompanyIdAndMonthOrderByVersionDescIdDesc(COMPANY_ID, "2026-10"))
                .thenReturn(List.of(receipt));
        when(repository.findAllByOrderByMonthDescVersionDescIdDesc()).thenReturn(List.of(receipt));
        when(repository.findByMonthOrderByVersionDescIdDesc("2026-10")).thenReturn(List.of(receipt));

        assertThat(service.list(COMPANY_ID, null)).hasSize(1);
        assertThat(service.list(COMPANY_ID, " ")).hasSize(1);
        assertThat(service.list(COMPANY_ID, "2026-10")).hasSize(1);
        assertThat(service.list(null, null)).hasSize(1);
        assertThat(service.list(null, "2026-10")).hasSize(1);
    }

    @Test
    @DisplayName("A missing receipt is a not found in French")
    void getMissing() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(9L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Quittance introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_NOT_FOUND"));
        assertThatThrownBy(() -> service.entity(9L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("The active receipt is selected by tenant pair, then by company and month, then by month")
    void activeForMonth() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setStatus(DocumentStatus.ACTIVE);
        when(repository.findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                "2026-10", 1L, 2L, DocumentStatus.ACTIVE)).thenReturn(Optional.of(receipt));
        when(repository.findFirstByMonthAndLandlordIdAndTenantCompanyIdAndStatusOrderByVersionDescIdDesc(
                "2026-10", 1L, TENANT_COMPANY_ID, DocumentStatus.ACTIVE)).thenReturn(Optional.of(receipt));
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", 1L, 2L, null)).isSameAs(receipt);
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", 1L, null, TENANT_COMPANY_ID)).isSameAs(receipt);

        when(repository.findFirstByCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(
                COMPANY_ID, "2026-10", DocumentStatus.ACTIVE)).thenReturn(Optional.of(receipt));
        when(repository.findFirstByMonthAndStatusOrderByVersionDescIdDesc("2026-10", DocumentStatus.ACTIVE))
                .thenReturn(Optional.of(receipt));
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", null, 2L, null)).isSameAs(receipt);
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", 1L, null, null)).isSameAs(receipt);
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", null, null, null)).isSameAs(receipt);
        assertThat(service.activeForMonth(null, "2026-10", null, null, null)).isSameAs(receipt);

        when(repository.findFirstByMonthAndLandlordIdAndTenantIdAndStatusOrderByVersionDescIdDesc(
                "2026-10", 3L, 4L, DocumentStatus.ACTIVE)).thenReturn(Optional.empty());
        assertThat(service.activeForMonth(COMPANY_ID, "2026-10", 3L, 4L, null)).isNull();
        when(repository.findFirstByCompanyIdAndMonthAndStatusOrderByVersionDescIdDesc(
                COMPANY_ID, "2026-11", DocumentStatus.ACTIVE)).thenReturn(Optional.empty());
        assertThat(service.activeForMonth(COMPANY_ID, "2026-11", null, null, null)).isNull();
        when(repository.findFirstByMonthAndStatusOrderByVersionDescIdDesc("2026-11", DocumentStatus.ACTIVE))
                .thenReturn(Optional.empty());
        assertThat(service.activeForMonth(null, "2026-11", null, null, null)).isNull();
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
                .hasMessage("Le PDF de cette quittance est introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_PDF_NOT_FOUND"));
    }

    @Test
    @DisplayName("Mapping a receipt tolerates missing person and company records")
    void toDtoWithMissingDirectoryEntries() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setCompanyId(COMPANY_ID);
        receipt.setMonth("2026-10");
        receipt.setLandlordId(5L);
        receipt.setTenantId(6L);
        receipt.setRentExclCharges(new BigDecimal("900"));
        receipt.setCharges(new BigDecimal("50"));
        receipt.setTotal(new BigDecimal("950"));
        receipt.setStatus(DocumentStatus.ACTIVE);
        receipt.setPdfPath("/data/out/quittance.pdf");
        when(persons.findById(5L)).thenReturn(Optional.empty());
        when(persons.findById(6L)).thenReturn(Optional.empty());
        when(companies.find(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));

        RentReceiptDto dto = service.toDto(receipt);

        assertThat(dto.companyName()).isEqualTo("HKOF");
        assertThat(dto.landlordName()).isNull();
        assertThat(dto.tenantName()).isNull();
        assertThat(dto.pdfAvailable()).isTrue();
    }

    @Test
    @DisplayName("Mapping a company-tenant receipt falls back to the company name")
    void toDtoWithTenantCompanyOnly() {
        RentReceipt receipt = new RentReceipt();
        receipt.setId(10L);
        receipt.setMonth("2026-10");
        receipt.setLandlordId(1L);
        receipt.setTenantCompanyId(TENANT_COMPANY_ID);
        receipt.setStatus(DocumentStatus.ACTIVE);
        when(persons.findById(1L)).thenReturn(Optional.of(person(1L, "Bailleur", null)));
        when(companies.find(TENANT_COMPANY_ID)).thenReturn(Optional.of(company(TENANT_COMPANY_ID, "Société Locataire")));

        RentReceiptDto dto = service.toDto(receipt);

        assertThat(dto.landlordName()).isEqualTo("Bailleur");
        assertThat(dto.tenantId()).isNull();
        assertThat(dto.tenantCompanyId()).isEqualTo(TENANT_COMPANY_ID);
        assertThat(dto.tenantName()).isEqualTo("Société Locataire");
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

        assertThat(dto.companyId()).isNull();
        assertThat(dto.companyName()).isNull();
        assertThat(dto.landlordId()).isNull();
        assertThat(dto.tenantId()).isNull();
        assertThat(dto.tenantCompanyId()).isNull();
        assertThat(dto.landlordName()).isNull();
        assertThat(dto.tenantName()).isNull();
        assertThat(dto.pdfAvailable()).isFalse();
        verify(persons, never()).findById(any());
    }
}
