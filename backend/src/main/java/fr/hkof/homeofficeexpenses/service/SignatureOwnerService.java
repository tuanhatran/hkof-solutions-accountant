package fr.hkof.homeofficeexpenses.service;

import java.util.Optional;

import org.springframework.stereotype.Service;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

/**
 * Ownership rules of a signature: a landlord signature belongs to one landlord, an employee
 * signature to one employee of a company. Also maps a signature to its DTO.
 */
@Service
public class SignatureOwnerService {

    private final LandlordRepository landlords;
    private final EmployeeRepository employees;
    private final CompanyRepository companies;

    public SignatureOwnerService(LandlordRepository landlords, EmployeeRepository employees,
            CompanyRepository companies) {
        this.landlords = landlords;
        this.employees = employees;
        this.companies = companies;
    }

    /**
     * Applies the owner requested by the caller, rejecting a landlord/employee mismatch.
     */
    public void applyOwner(Signature signature, SignatureType type, Long landlordId, Long employeeId) {
        if (type == SignatureType.LANDLORD) {
            if (employeeId != null) {
                throw new BusinessException("Une signature de bailleur ne peut pas être liée à un salarié.");
            }
            if (landlordId == null) {
                throw new BusinessException("Le bailleur de la signature est obligatoire.");
            }
            Landlord landlord = landlords.findByIdAndDeletedFalse(landlordId)
                    .orElseThrow(() -> new NotFoundException("Bailleur introuvable."));
            signature.setLandlordId(landlord.getId());
            signature.setCompanyId(null);
            signature.setEmployeeId(null);
            return;
        }
        if (landlordId != null) {
            throw new BusinessException("Une signature de gérant ne peut pas être liée à un bailleur.");
        }
        if (employeeId == null) {
            throw new BusinessException("Le salarié de la signature est obligatoire.");
        }
        Employee employee = employee(employeeId);
        signature.setLandlordId(null);
        signature.setEmployeeId(employee.getId());
        signature.setCompanyId(employee.getCompanyId());
    }

    public Employee employee(Long employeeId) {
        if (employeeId == null) {
            throw new BusinessException("Le salarié de la signature est obligatoire.");
        }
        return employees.findByIdAndDeletedFalse(employeeId)
                .orElseThrow(() -> new NotFoundException("Salarié introuvable."));
    }

    public void requireCompany(Long companyId) {
        if (companyId == null) {
            throw new BusinessException("Sélectionnez une société.");
        }
        companies.findByIdAndDeletedFalse(companyId)
                .orElseThrow(() -> new NotFoundException("Société introuvable."));
    }

    /** First non-deleted CEO of the company, when one exists. */
    public Optional<Employee> ceo(Long companyId) {
        return employees.findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(
                companyId, EmployeeTitle.CEO);
    }

    public SignatureDto toDto(Signature signature) {
        Landlord landlord = signature.getLandlordId() == null
                ? null
                : landlords.findById(signature.getLandlordId()).orElse(null);
        Company company = signature.getCompanyId() == null
                ? null
                : companies.findById(signature.getCompanyId()).orElse(null);
        Employee employee = signature.getEmployeeId() == null
                ? null
                : employees.findById(signature.getEmployeeId()).orElse(null);
        return new SignatureDto(
                signature.getId(),
                signature.getType().name(),
                signature.getName(),
                signature.getMimeType(),
                signature.getCreatedAt(),
                signature.getCompanyId(),
                company == null ? null : company.getName(),
                signature.getEmployeeId(),
                employee == null ? null : employeeName(employee),
                signature.getLandlordId(),
                landlord == null ? null : landlord.getName());
    }

    private String employeeName(Employee employee) {
        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName();
        return (firstName + " " + lastName).trim();
    }
}
