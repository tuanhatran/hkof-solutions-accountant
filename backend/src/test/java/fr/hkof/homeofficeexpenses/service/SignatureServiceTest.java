package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Company;
import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.domain.SignatureType;
import fr.hkof.homeofficeexpenses.repository.CompanyRepository;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

class SignatureServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long EMPLOYEE_ID = 7L;
    private static final String SAMPLE_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";
    private static final byte[] PNG = Base64.getDecoder().decode(SAMPLE_PNG);
    private static final byte[] JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

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

    private Landlord landlord(Long id, String name, boolean deleted) {
        Landlord landlord = new Landlord();
        landlord.setId(id);
        landlord.setName(name);
        landlord.setDeleted(deleted);
        return landlord;
    }

    private Employee employee(Long id, Long companyId, EmployeeTitle title, String firstName, String lastName) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setCompanyId(companyId);
        employee.setTitle(title);
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        return employee;
    }

    private Company company(Long id, String name) {
        Company company = new Company();
        company.setId(id);
        company.setName(name);
        return company;
    }

    private Signature signature(Long id, SignatureType type, Long landlordId, Long employeeId, Long companyId,
            String name, boolean deleted) {
        Signature signature = new Signature();
        signature.setId(id);
        signature.setType(type);
        signature.setLandlordId(landlordId);
        signature.setEmployeeId(employeeId);
        signature.setCompanyId(companyId);
        signature.setName(name);
        signature.setMimeType("image/png");
        signature.setFileName("signature.png");
        signature.setImage(PNG);
        signature.setDeleted(deleted);
        signature.setCreatedAt(Instant.parse("2026-10-01T10:00:00Z"));
        return signature;
    }

    private MultipartFile file(String name, byte[] content) {
        return new MockMultipartFile("file", name, "application/octet-stream", content);
    }

    private void stubSavedSignature() {
        when(repository.save(any(Signature.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Creates a PNG signature linked to its landlord")
    void createsSignatureLinkedToLandlord() {
        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(landlords.findById(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        stubSavedSignature();

        SignatureDto dto = service.create(SignatureType.LANDLORD, 1L, null, "  Bailleur  ",
                file("signature.png", PNG));

        assertThat(dto.type()).isEqualTo("LANDLORD");
        assertThat(dto.name()).isEqualTo("Bailleur");
        assertThat(dto.mimeType()).isEqualTo("image/png");
        assertThat(dto.createdAt()).isNotNull();
        assertThat(dto.landlordId()).isEqualTo(1L);
        assertThat(dto.landlordName()).isEqualTo("M. Bailleur");
        assertThat(dto.companyId()).isNull();

        ArgumentCaptor<Signature> saved = ArgumentCaptor.forClass(Signature.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getLandlordId()).isEqualTo(1L);
        assertThat(saved.getValue().getEmployeeId()).isNull();
    }

    @Test
    @DisplayName("Creates a signature linked to one employee and company")
    void createsSignatureLinkedToEmployee() {
        when(employees.findByIdAndDeletedFalse(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "HKOF")));
        when(employees.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "HKOF")));
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        stubSavedSignature();

        SignatureDto dto = service.create(SignatureType.EMPLOYEE, null, EMPLOYEE_ID, "Gérant",
                file("signature.png", PNG));

        assertThat(dto.companyId()).isEqualTo(COMPANY_ID);
        assertThat(dto.companyName()).isEqualTo("HKOF");
        assertThat(dto.employeeId()).isEqualTo(EMPLOYEE_ID);
        assertThat(dto.employeeName()).isEqualTo("Gérant HKOF");
        assertThat(dto.landlordId()).isNull();
    }

    @Test
    @DisplayName("Requires an existing non deleted landlord for a LANDLORD signature")
    void requiresLandlordForLandlordSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, null, null, "Bailleur",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le bailleur de la signature est obligatoire.");

        when(landlords.findByIdAndDeletedFalse(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 99L, null, "Bailleur",
                file("signature.png", PNG)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Bailleur introuvable.");

        verify(repository, never()).save(any(Signature.class));
    }

    @Test
    @DisplayName("Requires an existing employee for an employee signature")
    void requiresEmployeeForEmployeeSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.EMPLOYEE, null, null, "Gérant",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le salarié de la signature est obligatoire.");

        when(employees.findByIdAndDeletedFalse(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(SignatureType.EMPLOYEE, null, 99L, "Gérant",
                file("signature.png", PNG)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Salarié introuvable.");
    }

    @Test
    @DisplayName("Rejects a landlord on an employee signature")
    void rejectsLandlordOnEmployeeSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.ENTREPRISE_CEO, 1L, EMPLOYEE_ID, "Gérant",
                file("signature.jpg", JPEG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une signature de gérant ne peut pas être liée à un bailleur.");
    }

    @Test
    @DisplayName("Rejects an employee on a landlord signature")
    void rejectsEmployeeOnLandlordSignature() {
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, EMPLOYEE_ID, "Bailleur",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Une signature de bailleur ne peut pas être liée à un salarié.");
    }

    @Test
    @DisplayName("Accepts a JPEG signature through its magic bytes")
    void acceptsJpegMagicBytes() {
        when(employees.findByIdAndDeletedFalse(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "")));
        when(employees.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "")));
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        stubSavedSignature();

        SignatureDto dto = service.create(SignatureType.ENTREPRISE_CEO, null, EMPLOYEE_ID, "Gérant",
                file("signature.jpg", JPEG));

        assertThat(dto.mimeType()).isEqualTo("image/jpeg");
        assertThat(dto.landlordId()).isNull();
        assertThat(dto.landlordName()).isNull();
    }

    @Test
    @DisplayName("Rejects a file that is not a PNG or JPEG image")
    void rejectsNonImage() {
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, "Bailleur",
                file("signature.gif", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");

        byte[] wrongMagic = new byte[]{'h', 'e', 'l', 'l', 'o'};
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, "Bailleur",
                file("signature.png", wrongMagic)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");
    }

    @Test
    @DisplayName("Rejects an image larger than 2 MB")
    void rejectsOversizedImage() {
        byte[] oversized = new byte[(int) FileTypeDetector.MAX_SIGNATURE_SIZE + 1];
        System.arraycopy(PNG, 0, oversized, 0, PNG.length);

        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, "Bailleur",
                file("signature.png", oversized)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Image trop volumineuse (maximum 2 Mo).");
    }

    @Test
    @DisplayName("Requires a type, a name and a file")
    void requiresTypeNameAndFile() {
        assertThatThrownBy(() -> service.create(null, 1L, null, "Bailleur", file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le type de signature est obligatoire.");
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, "  ",
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est obligatoire.");
        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, "Bailleur",
                file("signature.png", new byte[0])))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier de signature est obligatoire.");
    }

    @Test
    @DisplayName("Rejects a name longer than 255 characters instead of hitting the DB constraint")
    void rejectsOversizedName() {
        String tooLong = "a".repeat(256);

        assertThatThrownBy(() -> service.create(SignatureType.LANDLORD, 1L, null, tooLong,
                file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est trop long (255 caractères maximum).");

        verify(repository, never()).save(any(Signature.class));

        when(landlords.findByIdAndDeletedFalse(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(landlords.findById(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        stubSavedSignature();
        assertThat(service.create(SignatureType.LANDLORD, 1L, null, "a".repeat(255),
                file("signature.png", PNG)).name()).hasSize(255);
    }

    @Test
    @DisplayName("Logical delete hides the signature and makes it unusable")
    void logicalDelete() {
        Signature stored = signature(4L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", false);
        when(repository.findById(4L)).thenReturn(Optional.of(stored));

        service.delete(4L);

        assertThat(stored.isDeleted()).isTrue();
        verify(repository).save(stored);
        assertThatThrownBy(() -> service.dataUri(4L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Builds a data URI from the stored bytes")
    void buildsDataUri() {
        when(repository.findById(5L))
                .thenReturn(Optional.of(signature(5L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", false)));

        assertThat(service.dataUri(5L))
                .isEqualTo("data:image/png;base64," + Base64.getEncoder().encodeToString(PNG));
    }

    @Test
    @DisplayName("A missing or deleted signature is not readable")
    void missingSignatureIsNotReadable() {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.dataUri(99L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Signature introuvable.");

        when(repository.findById(6L))
                .thenReturn(Optional.of(signature(6L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", true)));
        assertThatThrownBy(() -> service.resolveForLandlord(6L, 1L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Resolves a LANDLORD signature for the selected landlord")
    void resolvesSignatureForLandlord() {
        Signature linked = signature(10L, SignatureType.LANDLORD, 1L, null, null, "Bailleur 1", false);
        Signature legacy = signature(11L, SignatureType.LANDLORD, null, null, null, "Ancienne signature", false);
        Signature otherLandlord = signature(12L, SignatureType.LANDLORD, 2L, null, null, "Bailleur 2", false);
        Signature employeeSignature = signature(13L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID,
                "Gérant", false);

        when(repository.findById(10L)).thenReturn(Optional.of(linked));
        when(repository.findById(11L)).thenReturn(Optional.of(legacy));
        when(repository.findById(12L)).thenReturn(Optional.of(otherLandlord));
        when(repository.findById(13L)).thenReturn(Optional.of(employeeSignature));

        assertThat(service.resolveForLandlord(10L, 1L)).contains(linked);
        // A legacy unlinked signature stays usable as a fallback.
        assertThat(service.resolveForLandlord(11L, 1L)).contains(legacy);

        assertThatThrownBy(() -> service.resolveForLandlord(12L, 1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas à ce bailleur.");
        assertThatThrownBy(() -> service.resolveForLandlord(13L, 1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'est pas une signature de bailleur.");

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
                SignatureType.LANDLORD, 1L)).thenReturn(Optional.of(linked));
        assertThat(service.resolveForLandlord(null, 1L)).contains(linked);

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdOrderByNameAscIdAsc(
                SignatureType.LANDLORD, 1L)).thenReturn(Optional.empty());
        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD)).thenReturn(Optional.of(legacy));
        assertThat(service.resolveForLandlord(null, 1L)).contains(legacy);

        when(repository.findFirstByTypeAndDeletedFalseAndLandlordIdIsNullOrderByNameAscIdAsc(
                SignatureType.LANDLORD)).thenReturn(Optional.empty());
        assertThat(service.resolveForLandlord(null, 1L)).isEmpty();
    }

    @Test
    @DisplayName("Resolves an employee signature only for that employee")
    void resolvesSignatureForEmployee() {
        Signature linked = signature(20L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID, "Gérant", false);
        Signature otherEmployee = signature(21L, SignatureType.EMPLOYEE, null, 8L, COMPANY_ID, "Autre", false);
        Signature landlordSignature = signature(22L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", false);

        when(employees.findByIdAndDeletedFalse(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "")));
        when(repository.findById(20L)).thenReturn(Optional.of(linked));
        when(repository.findById(21L)).thenReturn(Optional.of(otherEmployee));
        when(repository.findById(22L)).thenReturn(Optional.of(landlordSignature));

        assertThat(service.resolveForEmployee(20L, EMPLOYEE_ID)).contains(linked);
        assertThatThrownBy(() -> service.resolveForEmployee(21L, EMPLOYEE_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas à ce salarié.");
        assertThatThrownBy(() -> service.resolveForEmployee(22L, EMPLOYEE_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'est pas une signature de salarié.");

        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.EMPLOYEE, EMPLOYEE_ID)).thenReturn(Optional.of(linked));
        assertThat(service.resolveForEmployee(null, EMPLOYEE_ID)).contains(linked);
        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.EMPLOYEE, EMPLOYEE_ID)).thenReturn(Optional.empty());
        assertThat(service.resolveForEmployee(null, EMPLOYEE_ID)).isEmpty();
    }

    @Test
    @DisplayName("Resolves the company signature with the CEO first, then any employee signature")
    void resolvesSignatureForCompany() {
        when(companies.findByIdAndDeletedFalse(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        Signature requested = signature(30L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID, "Gérant", false);
        Signature landlordSignature = signature(31L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", false);
        Signature otherCompany = signature(32L, SignatureType.EMPLOYEE, null, 8L, 2L, "Autre", false);
        when(repository.findById(30L)).thenReturn(Optional.of(requested));
        when(repository.findById(31L)).thenReturn(Optional.of(landlordSignature));
        when(repository.findById(32L)).thenReturn(Optional.of(otherCompany));

        assertThat(service.resolveForCompany(COMPANY_ID, 30L)).contains(requested);
        assertThatThrownBy(() -> service.resolveForCompany(COMPANY_ID, 31L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'est pas une signature de salarié.");
        assertThatThrownBy(() -> service.resolveForCompany(COMPANY_ID, 32L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas à cette société.");

        Employee ceo = employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "");
        when(employees.findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(COMPANY_ID, EmployeeTitle.CEO))
                .thenReturn(Optional.of(ceo));
        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.EMPLOYEE, EMPLOYEE_ID)).thenReturn(Optional.of(requested));
        assertThat(service.resolveForCompany(COMPANY_ID, null)).contains(requested);

        Signature legacyCeo = signature(33L, SignatureType.ENTREPRISE_CEO, null, EMPLOYEE_ID, COMPANY_ID, "PDG",
                false);
        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.EMPLOYEE, EMPLOYEE_ID)).thenReturn(Optional.empty());
        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.ENTREPRISE_CEO, EMPLOYEE_ID)).thenReturn(Optional.of(legacyCeo));
        assertThat(service.resolveForCompany(COMPANY_ID, null)).contains(legacyCeo);

        when(repository.findFirstByTypeAndDeletedFalseAndEmployeeIdOrderByNameAscIdAsc(
                SignatureType.ENTREPRISE_CEO, EMPLOYEE_ID)).thenReturn(Optional.empty());
        when(repository.findFirstByCompanyIdAndEmployeeIdIsNotNullAndDeletedFalseOrderByIdAsc(COMPANY_ID))
                .thenReturn(Optional.of(requested));
        assertThat(service.resolveForCompany(COMPANY_ID, null)).contains(requested);

        when(repository.findFirstByCompanyIdAndEmployeeIdIsNotNullAndDeletedFalseOrderByIdAsc(COMPANY_ID))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForCompany(COMPANY_ID, null)).isEmpty();

        when(employees.findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(COMPANY_ID, EmployeeTitle.CEO))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForCompany(COMPANY_ID, null)).isEmpty();
    }

    @Test
    @DisplayName("A company signature requires an existing company")
    void companySignatureRequiresCompany() {
        assertThatThrownBy(() -> service.resolveForCompany(null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez une société.");

        when(companies.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveForCompany(9L, null))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Société introuvable.");
    }

    @Test
    @DisplayName("Lists the non deleted signatures globally, per company or per employee")
    void listsSignatures() {
        Signature landlordSignature = signature(1L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", false);
        Signature employeeSignature = signature(2L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID,
                "Gérant", false);
        when(landlords.findById(1L)).thenReturn(Optional.of(landlord(1L, "M. Bailleur", false)));
        when(employees.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "")));
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        when(companies.findByIdAndDeletedFalse(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        when(employees.findByIdAndDeletedFalse(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.CEO, "Gérant", "")));

        when(repository.findByDeletedFalseOrderByTypeAscNameAscIdAsc())
                .thenReturn(List.of(landlordSignature, employeeSignature));
        when(repository.findVisibleForCompany(COMPANY_ID, SignatureType.LANDLORD))
                .thenReturn(List.of(landlordSignature, employeeSignature));
        when(repository.findByCompanyIdAndEmployeeIdAndDeletedFalseOrderByNameAscIdAsc(COMPANY_ID, EMPLOYEE_ID))
                .thenReturn(List.of(employeeSignature));

        assertThat(service.list(null, null)).hasSize(2);
        assertThat(service.list(COMPANY_ID, null)).extracting(SignatureDto::name)
                .containsExactly("Bailleur", "Gérant");
        assertThat(service.list(COMPANY_ID, EMPLOYEE_ID)).extracting(SignatureDto::employeeName)
                .containsExactly("Gérant");

        assertThatThrownBy(() -> service.list(2L, EMPLOYEE_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le salarié n'appartient pas à cette société.");
    }

    @Test
    @DisplayName("Listing per company requires an existing company")
    void listRequiresCompany() {
        when(companies.findByIdAndDeletedFalse(9L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.list(9L, null))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Société introuvable.");
    }

    @Test
    @DisplayName("A signature linked to a missing landlord maps a null landlord name")
    void toDtoWithMissingLandlord() {
        Signature signature = signature(1L, SignatureType.LANDLORD, 5L, null, null, "Bailleur", false);
        when(landlords.findById(5L)).thenReturn(Optional.empty());

        assertThat(service.toDto(signature).landlordName()).isNull();
        assertThat(service.toDto(signature).landlordId()).isEqualTo(5L);
        assertThat(service.toDto(signature).companyName()).isNull();
        assertThat(service.toDto(signature).employeeName()).isNull();
    }

    @Test
    @DisplayName("A signature linked to missing company and employee records maps null names")
    void toDtoWithMissingCompanyAndEmployee() {
        Signature signature = signature(2L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID, "Gérant", false);
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.empty());
        when(employees.findById(EMPLOYEE_ID)).thenReturn(Optional.empty());

        SignatureDto dto = service.toDto(signature);

        assertThat(dto.companyId()).isEqualTo(COMPANY_ID);
        assertThat(dto.companyName()).isNull();
        assertThat(dto.employeeId()).isEqualTo(EMPLOYEE_ID);
        assertThat(dto.employeeName()).isNull();
    }

    @Test
    @DisplayName("An unnamed employee is mapped to an empty name")
    void toDtoWithBlankEmployeeNames() {
        Signature signature = signature(2L, SignatureType.EMPLOYEE, null, EMPLOYEE_ID, COMPANY_ID, "Gérant", false);
        when(companies.findById(COMPANY_ID)).thenReturn(Optional.of(company(COMPANY_ID, "HKOF")));
        when(employees.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, COMPANY_ID, EmployeeTitle.EMPLOYEE, " ", null)));

        assertThat(service.toDto(signature).employeeName()).isEmpty();
    }

    @Test
    @DisplayName("The owner lookup never resolves a deleted signature")
    void entityIgnoresDeleted() {
        Signature deleted = signature(4L, SignatureType.LANDLORD, 1L, null, null, "Bailleur", true);
        when(repository.findById(4L)).thenReturn(Optional.of(deleted));
        assertThatThrownBy(() -> service.image(4L))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Signature introuvable.");
        verify(landlords, never()).findById(anyLong());
    }
}
