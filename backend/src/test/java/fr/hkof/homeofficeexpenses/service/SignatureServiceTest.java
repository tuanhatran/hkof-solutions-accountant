package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

import fr.hkof.homeofficeexpenses.domain.Employee;
import fr.hkof.homeofficeexpenses.domain.EmployeeTitle;
import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.SignatureDtos.SignatureDto;

class SignatureServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PERSON_ID = 3L;
    private static final Long EMPLOYEE_ID = 7L;
    private static final String SAMPLE_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=";
    private static final byte[] PNG = Base64.getDecoder().decode(SAMPLE_PNG);
    private static final byte[] JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

    private SignatureRepository repository;
    private PersonRepository persons;
    private EmployeeRepository employees;
    private SignatureService service;

    @BeforeEach
    void setUp() {
        repository = mock(SignatureRepository.class);
        persons = mock(PersonRepository.class);
        employees = mock(EmployeeRepository.class);
        service = new SignatureService(repository, persons, employees, new FileTypeDetector(), Clock.systemUTC());
    }

    private Person person(Long id, String name) {
        Person person = new Person();
        person.setId(id);
        person.setName(name);
        return person;
    }

    private Employee employee(Long id, EmployeeTitle title, String firstName, String lastName) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setCompanyId(COMPANY_ID);
        employee.setTitle(title);
        employee.setFirstName(firstName);
        employee.setLastName(lastName);
        return employee;
    }

    private Signature signature(Long id, Long personId, String name, boolean deleted) {
        Signature signature = new Signature();
        signature.setId(id);
        signature.setPersonId(personId);
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
    @DisplayName("Creates a PNG signature linked to its person")
    void createsSignatureForPerson() {
        when(persons.findByIdAndDeletedFalse(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "M. Bailleur")));
        when(persons.findById(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "M. Bailleur")));
        stubSavedSignature();

        SignatureDto dto = service.create(PERSON_ID, "  Bailleur  ", file("signature.png", PNG));

        assertThat(dto.personId()).isEqualTo(PERSON_ID);
        assertThat(dto.personName()).isEqualTo("M. Bailleur");
        assertThat(dto.name()).isEqualTo("Bailleur");
        assertThat(dto.mimeType()).isEqualTo("image/png");
        assertThat(dto.createdAt()).isNotNull();

        ArgumentCaptor<Signature> saved = ArgumentCaptor.forClass(Signature.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getPersonId()).isEqualTo(PERSON_ID);
    }

    @Test
    @DisplayName("An employee signature maps the full employee name")
    void createsSignatureForEmployee() {
        when(persons.findByIdAndDeletedFalse(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, EmployeeTitle.CEO, "Gérant", "HKOF")));
        when(persons.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, EmployeeTitle.CEO, "Gérant", "HKOF")));
        stubSavedSignature();

        SignatureDto dto = service.create(EMPLOYEE_ID, "Gérant", file("signature.jpg", JPEG));

        assertThat(dto.personId()).isEqualTo(EMPLOYEE_ID);
        assertThat(dto.personName()).isEqualTo("Gérant HKOF");
        assertThat(dto.mimeType()).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("Requires an existing non deleted person")
    void requiresPerson() {
        assertThatThrownBy(() -> service.create(null, "Bailleur", file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La personne de la signature est obligatoire.");
        when(persons.findByIdAndDeletedFalse(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(99L, "Bailleur", file("signature.png", PNG)))
                .isInstanceOf(NotFoundException.class)
                .hasMessage("Personne introuvable.");
        verify(repository, never()).save(any(Signature.class));
    }

    @Test
    @DisplayName("Rejects invalid image types and oversized images")
    void rejectsInvalidImages() {
        when(persons.findByIdAndDeletedFalse(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "Bailleur")));

        assertThatThrownBy(() -> service.create(PERSON_ID, "Bailleur", file("signature.gif", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature doit être une image PNG ou JPEG.");
        assertThatThrownBy(() -> service.create(PERSON_ID, "Bailleur",
                file("signature.png", new byte[]{'h', 'e', 'l', 'l', 'o'})))
                .isInstanceOf(BusinessException.class);
        byte[] oversized = new byte[(int) FileTypeDetector.MAX_SIGNATURE_SIZE + 1];
        System.arraycopy(PNG, 0, oversized, 0, PNG.length);
        assertThatThrownBy(() -> service.create(PERSON_ID, "Bailleur", file("signature.png", oversized)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Image trop volumineuse (maximum 2 Mo).");
    }

    @Test
    @DisplayName("Requires a name, a file and a bounded name")
    void requiresNameAndFile() {
        when(persons.findByIdAndDeletedFalse(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "Bailleur")));

        assertThatThrownBy(() -> service.create(PERSON_ID, "  ", file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est obligatoire.");
        assertThatThrownBy(() -> service.create(PERSON_ID, "Bailleur", file("signature.png", new byte[0])))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le fichier de signature est obligatoire.");
        assertThatThrownBy(() -> service.create(PERSON_ID, "a".repeat(256), file("signature.png", PNG)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la signature est trop long (255 caractères maximum).");

        stubSavedSignature();
        assertThat(service.create(PERSON_ID, "a".repeat(255), file("signature.png", PNG)).name()).hasSize(255);
    }

    @Test
    @DisplayName("Logical delete hides the signature and makes it unusable")
    void logicalDelete() {
        Signature stored = signature(4L, PERSON_ID, "Bailleur", false);
        when(repository.findById(4L)).thenReturn(Optional.of(stored));

        service.delete(4L);

        assertThat(stored.isDeleted()).isTrue();
        verify(repository).save(stored);
        assertThatThrownBy(() -> service.dataUri(4L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Builds a data URI from the stored bytes")
    void buildsDataUri() {
        when(repository.findById(5L)).thenReturn(Optional.of(signature(5L, PERSON_ID, "Bailleur", false)));

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

        when(repository.findById(6L)).thenReturn(Optional.of(signature(6L, PERSON_ID, "Bailleur", true)));
        assertThatThrownBy(() -> service.image(6L))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Resolves a signature only for its person, then the first stored one")
    void resolvesForPerson() {
        Signature linked = signature(10L, PERSON_ID, "Bailleur 1", false);
        Signature other = signature(11L, 9L, "Autre", false);
        when(persons.findByIdAndDeletedFalse(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "Bailleur")));
        when(repository.findById(10L)).thenReturn(Optional.of(linked));
        when(repository.findById(11L)).thenReturn(Optional.of(other));

        assertThat(service.resolveForPerson(10L, PERSON_ID)).contains(linked);
        assertThatThrownBy(() -> service.resolveForPerson(11L, PERSON_ID))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas à cette personne.");

        when(repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(PERSON_ID))
                .thenReturn(Optional.of(linked));
        assertThat(service.resolveForPerson(null, PERSON_ID)).contains(linked);
        when(repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(PERSON_ID))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForPerson(null, PERSON_ID)).isEmpty();
    }

    @Test
    @DisplayName("The statement signature is restricted to the company CEO")
    void resolvesForCompanyCeo() {
        Signature ceoSignature = signature(30L, EMPLOYEE_ID, "Gérant", false);
        Signature other = signature(31L, PERSON_ID, "Bailleur", false);
        when(repository.findById(30L)).thenReturn(Optional.of(ceoSignature));
        when(repository.findById(31L)).thenReturn(Optional.of(other));
        when(employees.findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(COMPANY_ID, EmployeeTitle.CEO))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, EmployeeTitle.CEO, "Gérant", "")));

        assertThat(service.resolveForCompanyCeo(COMPANY_ID, 30L)).contains(ceoSignature);
        assertThatThrownBy(() -> service.resolveForCompanyCeo(COMPANY_ID, 31L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La signature sélectionnée n'appartient pas au gérant de cette société.");

        when(repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(EMPLOYEE_ID))
                .thenReturn(Optional.of(ceoSignature));
        assertThat(service.resolveForCompanyCeo(COMPANY_ID, null)).contains(ceoSignature);

        when(repository.findFirstByPersonIdAndDeletedFalseOrderByNameAscIdAsc(EMPLOYEE_ID))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForCompanyCeo(COMPANY_ID, null)).isEmpty();

        when(employees.findFirstByCompanyIdAndTitleAndDeletedFalseOrderByIdAsc(COMPANY_ID, EmployeeTitle.CEO))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForCompanyCeo(COMPANY_ID, null)).isEmpty();

        assertThatThrownBy(() -> service.resolveForCompanyCeo(null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La société de la signature est obligatoire.");
    }

    @Test
    @DisplayName("Lists the non deleted signatures of one person only")
    void listsSignatures() {
        Signature first = signature(1L, PERSON_ID, "Bailleur", false);
        when(persons.findByIdAndDeletedFalse(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "Bailleur")));
        when(persons.findById(PERSON_ID)).thenReturn(Optional.of(person(PERSON_ID, "Bailleur")));
        when(repository.findByPersonIdAndDeletedFalseOrderByNameAscIdAsc(PERSON_ID)).thenReturn(List.of(first));

        assertThat(service.list(PERSON_ID)).extracting(SignatureDto::personName).containsExactly("Bailleur");

        assertThatThrownBy(() -> service.list(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La personne de la signature est obligatoire.");

        when(persons.findByIdAndDeletedFalse(EMPLOYEE_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.list(EMPLOYEE_ID))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Missing person records map null names")
    void toDtoWithMissingPerson() {
        Signature signature = signature(1L, 5L, "Bailleur", false);
        when(persons.findById(5L)).thenReturn(Optional.empty());

        assertThat(service.toDto(signature).personName()).isNull();
        assertThat(service.toDto(signature).personId()).isEqualTo(5L);
    }

    @Test
    @DisplayName("An unnamed employee maps a null name and a null person maps null")
    void toDtoWithBlankEmployeeNames() {
        Signature signature = signature(2L, EMPLOYEE_ID, "Gérant", false);
        when(persons.findById(EMPLOYEE_ID))
                .thenReturn(Optional.of(employee(EMPLOYEE_ID, EmployeeTitle.EMPLOYEE, " ", null)));
        assertThat(service.toDto(signature).personName()).isNull();

        Signature orphan = signature(3L, null, "Orpheline", true);
        assertThat(service.toDto(orphan).personName()).isNull();
    }
}
