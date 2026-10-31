package fr.hkof.homeofficeexpenses.service;

import java.util.List;

import org.springframework.stereotype.Component;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Lease;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.LeaseDto;

/**
 * Maps a lease to its API view. The linked company is resolved without the ownership
 * scope so a lease can expose the public legal identity of a company owned by another
 * account; only those public fields are copied, never its pro-rata or lease data.
 */
@Component
public class LeaseMapper {

    private final CompanyLookupService companies;

    public LeaseMapper(CompanyLookupService companies) {
        this.companies = companies;
    }

    public LeaseDto toDto(Lease lease) {
        Company company = lease.getCompanyId() == null
                ? null
                : companies.findPublic(lease.getCompanyId()).orElse(null);
        String companyName = company == null ? null : company.getName();
        String tenantName = lease.isCompanyLease()
                ? companyName
                : lease.getTenant() == null ? null : lease.getTenant().getName();
        List<Long> tenantIds = LeaseTenantBinder.personsOf(lease).stream()
                .map(person -> person.getId())
                .toList();
        LeaseService.ProRata proRata = LeaseService.proRataOf(lease);
        return new LeaseDto(
                lease.getId(),
                lease.getAddress().getId(),
                lease.getCompanyId(),
                companyName,
                lease.isCompanyLease(),
                lease.getLandlord().getId(),
                lease.getTenant() == null ? null : lease.getTenant().getId(),
                tenantIds,
                lease.getLandlord().getName(),
                tenantName,
                lease.getAddress().getLabel(),
                Amounts.apiValue(lease.getRentExclCharges()),
                Amounts.apiValue(lease.getCharges()),
                Amounts.apiValue(lease.getTotalArea()),
                Amounts.apiValue(lease.getBusinessArea()),
                proRata == null ? null : Amounts.apiValue(proRata.base()),
                proRata == null ? null : proRata.detail(),
                company == null ? null : company.getSiren(),
                company == null ? null : company.getLegalForm(),
                company == null ? null : company.getAddress(),
                company == null ? null : company.getManagerName());
    }
}
