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

import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.domain.Signature;
import fr.hkof.homeofficeexpenses.repository.EmployeeRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;

class SignatureServiceEdgeCasesTest {

    private static final Long PERSON_ID = 3L;
    private static final Long USER_ID = 42L;
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=");

    private SignatureRepository repository;
    private PersonRepository persons;
    private OwnershipContext ownership;
    private SignatureService service;

    @BeforeEach
    void setUp() {
        repository = mock(SignatureRepository.class);
        persons = mock(PersonRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new SignatureService(repository, persons, mock(EmployeeRepository.class), new FileTypeDetector(),
                ownership, Clock.systemUTC());
    }

    private Person person() {
        Person person = new Person();
        person.setId(PERSON_ID);
        person.setUserId(USER_ID);
        person.setName("Bailleur");
        return person;
    }

    private Signature signature(Long id, String fileName) {
        Signature signature = new Signature();
        signature.setId(id);
        signature.setUserId(USER_ID);
        signature.setPersonId(PERSON_ID);
        signature.setName("Signature");
        signature.setMimeType("image/png");
        signature.setFileName(fileName);
        signature.setImage(PNG);
        return signature;
    }

    @Test
    @DisplayName("A file read failure is reported in French")
    void createReadFailure() throws IOException {
        when(persons.findByIdAndUserIdAndDeletedFalse(PERSON_ID, USER_ID)).thenReturn(Optional.of(person()));
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getBytes()).thenThrow(new IOException("boom"));

        assertThatThrownBy(() -> service.create(PERSON_ID, "Bailleur", file))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Impossible de lire le fichier de signature.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode())
                        .isEqualTo("SIGNATURE_FILE_UNREADABLE"));
    }

    @Test
    @DisplayName("An image without a file name gets a default name")
    void imageWithoutFileName() {
        when(repository.findByIdAndUserIdAndDeletedFalse(1L, USER_ID)).thenReturn(Optional.of(signature(1L, null)));
        assertThat(service.image(1L).fileName()).isEqualTo("signature");

        when(repository.findByIdAndUserIdAndDeletedFalse(2L, USER_ID)).thenReturn(Optional.of(signature(2L, " ")));
        assertThat(service.image(2L).fileName()).isEqualTo("signature");
    }

    @Test
    @DisplayName("Resolving a signature for a missing person is rejected")
    void resolveRequiresPerson() {
        assertThatThrownBy(() -> service.resolveForPerson(null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("La personne de la signature est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PERSON_REQUIRED"));
    }

    @Test
    @DisplayName("Resolving without a requested signature or default is empty")
    void resolveWithoutDefault() {
        when(persons.findByIdAndUserIdAndDeletedFalse(PERSON_ID, USER_ID)).thenReturn(Optional.of(person()));
        when(repository.findFirstByUserIdAndPersonIdAndDeletedFalseOrderByNameAscIdAsc(USER_ID, PERSON_ID))
                .thenReturn(Optional.empty());
        assertThat(service.resolveForPerson(null, PERSON_ID)).isEmpty();
    }
}
