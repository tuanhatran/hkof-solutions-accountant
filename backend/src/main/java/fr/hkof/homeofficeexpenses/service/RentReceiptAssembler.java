package fr.hkof.homeofficeexpenses.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import org.springframework.stereotype.Component;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.domain.RentReceipt;
import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.RentReceiptRepository;
import fr.hkof.homeofficeexpenses.service.template.TemplateService;
import fr.hkof.homeofficeexpenses.web.dto.RentReceiptDtos.AdditionalCharge;

/**
 * Builds the rent receipt entity, its version number, its stored file name and
 * its template. Kept out of the service so the generation workflow stays focused
 * on calculation, rendering and persistence.
 */
@Component
public class RentReceiptAssembler {

    private final RentReceiptRepository repository;
    private final TemplateService templateService;

    public RentReceiptAssembler(RentReceiptRepository repository, TemplateService templateService) {
        this.repository = repository;
        this.templateService = templateService;
    }

    public void fill(RentReceipt rentReceipt, Company company, Lease lease, YearMonth month,
            LocalDate periodStart, LocalDate periodEnd, BigDecimal rentExclCharges, BigDecimal charges,
            BigDecimal total, List<AdditionalCharge> additionalCharges) {
        rentReceipt.setCompanyId(company == null ? null : company.getId());
        rentReceipt.setMonth(month.toString());
        rentReceipt.setLandlordId(lease.getLandlord().getId());
        rentReceipt.setTenantId(lease.isCompanyLease() || lease.getTenant() == null ? null
                : lease.getTenant().getId());
        rentReceipt.setTenantCompanyId(lease.isCompanyLease() ? lease.getCompanyId() : null);
        rentReceipt.setPeriodStart(periodStart);
        rentReceipt.setPeriodEnd(periodEnd);
        rentReceipt.setRentExclCharges(rentExclCharges);
        rentReceipt.setCharges(charges);
        rentReceipt.setTotal(total);
        RentReceiptAdditionalCharges.entities(additionalCharges).forEach(rentReceipt::addAdditionalCharge);
    }

    public int nextVersion(YearMonth month, Lease lease) {
        var existing = lease.isCompanyLease()
                ? repository.findFirstByMonthAndLandlordIdAndTenantCompanyIdOrderByVersionDescIdDesc(
                        month.toString(), lease.getLandlord().getId(), lease.getCompanyId())
                : repository.findFirstByMonthAndLandlordIdAndTenantIdOrderByVersionDescIdDesc(
                        month.toString(), lease.getLandlord().getId(), lease.getTenant().getId());
        return existing.map(receipt -> receipt.getVersion() + 1).orElse(1);
    }

    public String fileName(YearMonth month, Lease lease, int version) {
        String tenant = lease.isCompanyLease()
                ? "c" + lease.getCompanyId()
                : "t" + lease.getTenant().getId();
        return "quittance_" + month + "_l" + lease.getLandlord().getId() + "_" + tenant + "_v" + version + ".pdf";
    }

    public TemplateDocument template(Long templateId) {
        TemplateDocument template = templateId != null
                ? templateService.byId(templateId)
                : templateService.active(TemplateType.RENT_RECEIPT);
        if (template.getType() != TemplateType.RENT_RECEIPT) {
            throw new BusinessException("RENT_RECEIPT_TEMPLATE_INVALID",
                    "Le template sélectionné n'est pas un template de quittance.");
        }
        return template;
    }
}
