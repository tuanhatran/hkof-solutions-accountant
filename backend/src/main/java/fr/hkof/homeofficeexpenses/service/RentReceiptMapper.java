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
    private final OwnershipContext ownership;

    public RentReceiptMapper(PersonRepository persons, CompanyService companies, OwnershipContext ownership) {
        this.persons = persons;
        this.companies = companies;
        this.ownership = ownership;
    }

    public RentReceiptDto toDto(RentReceipt rentReceipt) {
        Long owner = ownership.currentUserId();
        Person landlord = rentReceipt.getLandlordId() == null ? null
                : persons.findByIdAndUserId(rentReceipt.getLandlordId(), owner).orElse(null);
        Person tenant = rentReceipt.getTenantId() == null ? null
                : persons.findByIdAndUserId(rentReceipt.getTenantId(), owner).orElse(null);
        String companyName = rentReceipt.getCompanyId() == null ? null
                : companies.find(rentReceipt.getCompanyId()).map(Company::getName).orElse(null);
        String tenantCompanyName = rentReceipt.getTenantCompanyId() == null ? null
                : companies.find(rentReceipt.getTenantCompanyId()).map(Company::getName).orElse(null);
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
