package fr.hkof.homeofficeexpenses.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;

/**
 * Read paths for receipts a landlord issued for a corporate tenant owned by another
 * account. Kept apart from {@link RentReceiptService} so the issuing workflow and the
 * received read model stay two distinct responsibilities.
 */
@Service
public class RentReceiptReceivedService {

    private final RentReceiptRepository repository;
    private final CompanyService companies;
    private final RentReceiptMapper mapper;
    private final StorageService storage;
    private final OwnershipContext ownership;

    public RentReceiptReceivedService(RentReceiptRepository repository, CompanyService companies,
            RentReceiptMapper mapper, StorageService storage, OwnershipContext ownership) {
        this.repository = repository;
        this.companies = companies;
        this.mapper = mapper;
        this.storage = storage;
        this.ownership = ownership;
    }

    /**
     * Receipts issued by another account for a company owned by the current account. The
     * company filter is validated against the owned companies, so a foreign company can
     * never be used to enumerate another account's receipts.
     */
    @Transactional(readOnly = true)
    public List<RentReceiptDto> list(Long companyId, String month) {
        Long owner = ownership.currentUserId();
        List<Long> companyIds = companyId != null
                ? List.of(companies.entity(companyId).getId())
                : companies.list().stream().map(company -> company.id())
                        .filter(java.util.Objects::nonNull).toList();
        if (companyIds.isEmpty()) {
            return List.of();
        }
        boolean hasMonth = month != null && !month.isBlank();
        String monthValue = hasMonth ? Amounts.month(month).toString() : null;
        List<RentReceipt> rentReceipts = hasMonth
                ? repository.findByTenantCompanyIdInAndUserIdNotAndMonthOrderByVersionDescIdDesc(companyIds, owner,
                        monthValue)
                : repository.findByTenantCompanyIdInAndUserIdNotOrderByMonthDescVersionDescIdDesc(companyIds, owner);
        return rentReceipts.stream().map(mapper::toDto).toList();
    }

    /**
     * Downloads a received receipt only when the tenant company belongs to the current account
     * and the receipt was issued by another account. Every other identifier is a not found, so
     * the route never reveals a foreign receipt.
     */
    @Transactional(readOnly = true)
    public byte[] pdf(Long id) {
        Long owner = ownership.currentUserId();
        RentReceipt rentReceipt = repository.findById(id)
                .filter(receipt -> receipt.getTenantCompanyId() != null)
                .filter(receipt -> !owner.equals(receipt.getUserId()))
                .filter(receipt -> companies.find(receipt.getTenantCompanyId()).isPresent())
                .orElseThrow(() -> new NotFoundException("RENT_RECEIPT_NOT_FOUND", "Quittance introuvable."));
        if (rentReceipt.getPdfPath() == null || rentReceipt.getPdfPath().isBlank()) {
            throw new NotFoundException("RENT_RECEIPT_PDF_NOT_FOUND", "Le PDF de cette quittance est introuvable.");
        }
        return storage.read(rentReceipt.getPdfPath());
    }
}
