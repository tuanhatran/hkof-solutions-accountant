package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.DocumentStatus;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;

/** Read model of the receipts a landlord issued for a company owned by another account. */
class RentReceiptReceivedServiceTest {

    private static final Long OWNER = 42L;
    private static final Long COMPANY_ID = 5L;
    private static final Long TENANT_COMPANY_ID = 6L;

    private RentReceiptRepository repository;
    private CompanyService companies;
    private RentReceiptMapper mapper;
    private StorageService storage;
    private OwnershipContext ownership;
    private RentReceiptReceivedService service;

    @BeforeEach
    void setUp() {
        repository = mock(RentReceiptRepository.class);
        companies = mock(CompanyService.class);
        mapper = mock(RentReceiptMapper.class);
        storage = mock(StorageService.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(OWNER);
        service = new RentReceiptReceivedService(repository, companies, mapper, storage, ownership);
    }

    @Test
    @DisplayName("The company owner lists only the receipts issued by another account for its companies")
    void receivedList() {
        RentReceipt received = new RentReceipt();
        received.setId(10L);
        received.setUserId(99L);
        received.setCompanyId(TENANT_COMPANY_ID);
        received.setTenantCompanyId(TENANT_COMPANY_ID);
        received.setMonth("2026-10");
        received.setStatus(DocumentStatus.ACTIVE);
        when(companies.entity(TENANT_COMPANY_ID)).thenReturn(company(TENANT_COMPANY_ID));
        when(repository.findByTenantCompanyIdInAndUserIdNotOrderByMonthDescVersionDescIdDesc(
                List.of(TENANT_COMPANY_ID), OWNER)).thenReturn(List.of(received));
        when(repository.findByTenantCompanyIdInAndUserIdNotAndMonthOrderByVersionDescIdDesc(
                List.of(TENANT_COMPANY_ID), OWNER, "2026-10")).thenReturn(List.of(received));
        when(mapper.toDto(received)).thenReturn(mock(RentReceiptDto.class));

        assertThat(service.list(TENANT_COMPANY_ID, null)).hasSize(1);
        assertThat(service.list(TENANT_COMPANY_ID, "2026-10")).hasSize(1);

        when(companies.entity(COMPANY_ID)).thenThrow(
                new NotFoundException("COMPANY_NOT_FOUND", "Société introuvable."));
        assertThatThrownBy(() -> service.list(COMPANY_ID, null))
                .isInstanceOf(NotFoundException.class);
        verify(repository, never()).findByTenantCompanyIdInAndUserIdNotOrderByMonthDescVersionDescIdDesc(
                List.of(COMPANY_ID), OWNER);
    }

    @Test
    @DisplayName("The owner downloads a received receipt only when its company is owned by the account")
    void receivedPdf() {
        RentReceipt received = new RentReceipt();
        received.setId(10L);
        received.setUserId(99L);
        received.setTenantCompanyId(TENANT_COMPANY_ID);
        received.setPdfPath("/data/out/quittance.pdf");
        when(repository.findById(10L)).thenReturn(Optional.of(received));
        when(companies.find(TENANT_COMPANY_ID)).thenReturn(Optional.of(company(TENANT_COMPANY_ID)));
        when(storage.read("/data/out/quittance.pdf")).thenReturn(new byte[]{3});

        assertThat(service.pdf(10L)).containsExactly(3);

        received.setUserId(OWNER);
        assertThatThrownBy(() -> service.pdf(10L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Quittance introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_NOT_FOUND"));

        received.setUserId(99L);
        received.setTenantCompanyId(null);
        assertThatThrownBy(() -> service.pdf(10L)).isInstanceOf(NotFoundException.class);

        received.setTenantCompanyId(COMPANY_ID);
        when(companies.find(COMPANY_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.pdf(10L)).isInstanceOf(NotFoundException.class);

        received.setTenantCompanyId(TENANT_COMPANY_ID);
        received.setPdfPath(null);
        assertThatThrownBy(() -> service.pdf(10L))
                .isInstanceOf(NotFoundException.class)
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode())
                        .isEqualTo("RENT_RECEIPT_PDF_NOT_FOUND"));
    }

    private Company company(Long id) {
        Company company = new Company();
        company.setId(id);
        company.setName("Société Locataire");
        return company;
    }
}
