package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.time.Clock;
import java.util.Base64;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;

class SignatureServiceEdgeCasesTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long EMPLOYEE_ID = 7L;
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private SignatureRepository repository;
    private LandlordRepository landlords;
    private EmployeeRepository employees;
    private CompanyRepository companies;
    private SignatureService service;

    @BeforeEach
    void setUp() {
        repository = mock(SignatureRepository.class);
        landlords = mock(LandlordRepository.class);
        employees = mock(EmployeeRepository.class);
        companies = mock(CompanyRepository.class);
        service = new SignatureService(repository, new SignatureOwnerService(landlords, employees, companies),
                new FileTypeDetector(), Clock.systemUTC());
    }

    private Employee employee() {
        Employee employee = new Employee();
        employee.setId(EMPLOYEE_ID);
        employee.setCompanyId(COMPANY_ID);
        employee.setTitle(EmployeeTitle.CEO);
        employee.setFirstName("Gérant");
        employee.setLastName("");
        return employee;
    }

    private Signature signature(Long id, SignatureType type, Long landlordId, String fileName) {
        Signature signature = new Signature();
        signature.setId(id);
        signature.setType(type);
        signature.setLandlordId(landlordId);
        signature.setName("Signature");
        signature.setMimeType("image/png");
        signature.setFileName(fileName);
        signature.setImage(PNG);
        return signature;
    }

    @Test
    @DisplayName("A file read failure is reported in French")
    void createReadFailure() throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getBytes()).thenThrow(new IOException("boom"));

        assertThatThrownBy(() -> service.create(SignatureType.EMPLOYEE, null, EMPLOYEE_ID, "Gérant", file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Impossible de lire le fichier de signature.");
    }

    @Test
    @DisplayName("An image without a file name gets a default name")
    void imageWithoutFileName() {
        when(repository.findById(1L)).thenReturn(Optional.of(signature(1L, SignatureType.ENTREPRISE_CEO, null, null)));
        assertThat(service.image(1L).fileName()).isEqualTo("signature");

        when(repository.findById(2L)).thenReturn(Optional.of(signature(2L, SignatureType.ENTREPRISE_CEO, null, " ")));
        assertThat(service.image(2L).fileName()).isEqualTo("signature");
    }

    @Test
    @DisplayName("Resolving a signature for a missing landlord is rejected")
    void resolveRequiresLandlord() {
        assertThatThrownBy(() -> service.resolveForLandlord(null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le bailleur de la signature est obligatoire.");
    }

    @Test
    @DisplayName("Resolving an employee signature requires an employee")
    void resolveRequiresEmployee() {
        assertThatThrownBy(() -> service.resolveForEmployee(null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le salarié de la signature est obligatoire.");
    }

    @Test
    @DisplayName("Resolving without a requested signature or default is empty")
    void resolveWithoutDefault() {
        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD)).thenReturn(Optional.empty());
        assertThat(service.resolveForLandlord(null, 1L)).isEmpty();
    }

    @Test
    @DisplayName("A signature linked to a missing landlord maps a null landlord name")
    void toDtoWithMissingLandlord() {
        Signature signature = signature(1L, SignatureType.LANDLORD, 5L, "signature.png");
        when(landlords.findById(5L)).thenReturn(Optional.empty());

        assertThat(service.toDto(signature).landlordName()).isNull();
        assertThat(service.toDto(signature).landlordId()).isEqualTo(5L);
    }

    @Test
    @DisplayName("An employee without a first or last name maps an empty name")
    void toDtoWithUnnamedEmployee() {
        Signature signature = signature(2L, SignatureType.EMPLOYEE, null, "signature.png");
        signature.setEmployeeId(EMPLOYEE_ID);
        signature.setCompanyId(COMPANY_ID);
        when(employees.findById(EMPLOYEE_ID)).thenReturn(Optional.of(employee()));
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.empty());

        assertThat(service.toDto(signature).companyName()).isNull();
        assertThat(service.toDto(signature).employeeName()).isEqualTo("Gérant");
    }
}
