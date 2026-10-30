package fr.hkof.homeofficeexpenses.service;

import java.util.Comparator;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.web.dto.CompanyDtos.CompanyLookupDto;

/**
 * Read-only access to a company's public legal identity. A lease may reference a company
 * owned by another account, so this lookup deliberately ignores the ownership scope; it
 * only ever returns name, SIREN, legal form, registered address and manager name, never
 * the company's home-office data, active lease, employees or expense items.
 */
@Service
public class CompanyLookupService {

    private final CompanyRepository companies;

    public CompanyLookupService(CompanyRepository companies) {
        this.companies = companies;
    }

    @Transactional(readOnly = true)
    public CompanyLookupDto lookup(String siren) {
        return toDto(requireSiren(siren));
    }

    @Transactional(readOnly = true)
    public Company entityBySiren(String siren) {
        return requireSiren(siren);
    }

    @Transactional(readOnly = true)
    public Optional<Company> findPublic(Long id) {
        return id == null ? Optional.empty() : companies.findByIdAndDeletedFalse(id);
    }

    public CompanyLookupDto toDto(Company company) {
        return new CompanyLookupDto(company.getName(), company.getSiren(), company.getLegalForm(),
                company.getAddress(), company.getManagerName());
    }

    private Company requireSiren(String siren) {
        String digits = digits(siren);
        if (digits.isEmpty()) {
            throw new BusinessException("COMPANY_SIREN_REQUIRED", "Le SIREN est obligatoire.");
        }
        return companies.findAllByDeletedFalseOrderByNameAscIdAsc().stream()
                .filter(company -> digits(company.getSiren()).equals(digits))
                .min(Comparator.comparing(Company::getId))
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Société introuvable."));
    }

    private static String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
