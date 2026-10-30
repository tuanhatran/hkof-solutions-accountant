package fr.hkof.homeofficeexpenses.service;

import java.util.List;

import org.springframework.stereotype.Component;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.AdditionalCharge;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.RentReceiptDto;

/**
 * Maps a rent receipt entity to its API DTO, resolving the landlord, tenant and
 * company names from the directories. Kept out of the service so the generation
 * workflow stays focused on calculation, rendering and persistence.
 */
@Component
public class RentReceiptMapper {

    private final PersonRepository persons;
    private final CompanyService companies;
    private final CompanyLookupService publicCompanies;
    private final OwnershipContext ownership;

    public RentReceiptMapper(PersonRepository persons, CompanyService companies,
            CompanyLookupService publicCompanies, OwnershipContext ownership) {
        this.persons = persons;
        this.companies = companies;
        this.publicCompanies = publicCompanies;
        this.ownership = ownership;
    }

    /**
     * Resolves a company name for the display: the owner scope first, then the public identity
     * only for a receipt the current account issued, so the issuer can name a cross-user tenant.
     */
    private String companyName(Long id, Long documentUserId, Long owner) {
        if (id == null) {
            return null;
        }
        return companies.find(id)
                .map(Company::getName)
                .or(() -> documentUserId != null && documentUserId.equals(owner)
                        ? publicCompanies.findPublic(id).map(Company::getName)
                        : java.util.Optional.empty())
                .orElse(null);
    }

    public RentReceiptDto toDto(RentReceipt rentReceipt) {
        Long owner = ownership.currentUserId();
        boolean received = rentReceipt.getUserId() != null && !owner.equals(rentReceipt.getUserId());
        Person landlord = rentReceipt.getLandlordId() == null ? null
                : persons.findByIdAndUserId(rentReceipt.getLandlordId(), owner).orElse(null);
        if (landlord == null && received && rentReceipt.getLandlordId() != null
                && rentReceipt.getTenantCompanyId() != null
                && companies.find(rentReceipt.getTenantCompanyId()).isPresent()) {
            // A received receipt names the landlord on the document itself: the company owner
            // reads that name without gaining access to the landlord's person directory.
            landlord = persons.findById(rentReceipt.getLandlordId()).orElse(null);
        }
        Person tenant = rentReceipt.getTenantId() == null ? null
                : persons.findByIdAndUserId(rentReceipt.getTenantId(), owner).orElse(null);
        String companyName = companyName(rentReceipt.getCompanyId(), rentReceipt.getUserId(), owner);
        String tenantCompanyName = companyName(rentReceipt.getTenantCompanyId(), rentReceipt.getUserId(), owner);
        String tenantName = tenant != null ? tenant.getName() : tenantCompanyName;
        List<AdditionalCharge> additionalCharges = rentReceipt.getAdditionalCharges().stream()
                .map(charge -> new AdditionalCharge(charge.getLabel(), Amounts.apiValue(charge.getAmount())))
                .toList();
        return new RentReceiptDto(
                rentReceipt.getId(),
                rentReceipt.getCompanyId(),
                companyName,
                rentReceipt.getMonth(),
                rentReceipt.getLandlordId(),
                rentReceipt.getTenantId(),
                rentReceipt.getTenantCompanyId(),
                landlord == null ? null : landlord.getName(),
                tenantName,
                rentReceipt.getPeriodStart(),
                rentReceipt.getPeriodEnd(),
                Amounts.apiValue(rentReceipt.getRentExclCharges()),
                Amounts.apiValue(rentReceipt.getCharges()),
                Amounts.apiValue(rentReceipt.getTotal()),
                rentReceipt.getPaymentDate(),
                rentReceipt.getIssueDate(),
                rentReceipt.getVersion(),
                rentReceipt.getStatus() == null ? null : rentReceipt.getStatus().name(),
                rentReceipt.getTemplateId(),
                rentReceipt.getTemplateName(),
                rentReceipt.getTemplateVersion(),
                rentReceipt.getCreatedAt(),
                rentReceipt.getPdfPath() != null,
                additionalCharges);
    }
}
