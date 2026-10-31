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
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.PersonDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.PersonRequest;

class PersonServiceTest {

    private static final Long USER_ID = 42L;

    private PersonRepository persons;
    private LeaseRepository leases;
    private SignatureRepository signatures;
    private OwnershipContext ownership;
    private PersonService service;

    @BeforeEach
    void setUp() {
        persons = mock(PersonRepository.class);
        leases = mock(LeaseRepository.class);
        signatures = mock(SignatureRepository.class);
        ownership = mock(OwnershipContext.class);
        when(ownership.currentUserId()).thenReturn(USER_ID);
        service = new PersonService(persons, leases, signatures, ownership,
                Clock.fixed(Instant.parse("2026-10-01T10:00:00Z"), ZoneOffset.UTC));
    }

    private Person person(Long id, String name) {
        Person person = new Person();
        person.setId(id);
        person.setUserId(USER_ID);
        person.setName(name);
        person.setAddress("Adresse");
        return person;
    }

    @Test
    @DisplayName("Natural persons are listed with their signature count")
    void lists() {
        when(persons.findAllNaturalPersons(USER_ID)).thenReturn(List.of(person(1L, "Alice")));
        when(signatures.countByPersonIdAndDeletedFalse(1L)).thenReturn(2L);

        assertThat(service.list()).extracting(PersonDto::name).containsExactly("Alice");
        assertThat(service.list().get(0).signatureCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Persons can be created, updated and logically deleted")
    void crud() {
        when(persons.save(any(Person.class))).thenAnswer(invocation -> {
            Person saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        PersonDto created = service.create(new PersonRequest("  Alice ", "  ", "  Lyon  "));
        assertThat(created.name()).isEqualTo("Alice");
        assertThat(created.address()).isNull();
        assertThat(created.issuePlace()).isEqualTo("Lyon");

        Person existing = person(1L, "Alice");
        when(persons.findNaturalPersonById(1L, USER_ID)).thenReturn(Optional.of(existing));
        PersonDto updated = service.update(1L, new PersonRequest("Alicia", "2 rue", "   "));
        assertThat(updated.name()).isEqualTo("Alicia");
        assertThat(updated.address()).isEqualTo("2 rue");
        assertThat(updated.issuePlace()).isNull();

        service.delete(1L);
        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    @DisplayName("Onboarding profile exposes the phone and the address note")
    void profileFields() {
        when(persons.save(any(Person.class))).thenAnswer(invocation -> {
            Person saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        PersonDto created = service.create(
                new PersonRequest("Alice", null, null, "  06 12 34 56 78 ", "  Bâtiment B  "));
        assertThat(created.phone()).isEqualTo("06 12 34 56 78");
        assertThat(created.addressNote()).isEqualTo("Bâtiment B");

        Person existing = person(1L, "Alice");
        when(persons.findNaturalPersonById(1L, USER_ID)).thenReturn(Optional.of(existing));
        PersonDto updated = service.update(1L, new PersonRequest("Alice", null, null, "   ", null));
        assertThat(updated.phone()).isNull();
        assertThat(updated.addressNote()).isNull();
    }

    @Test
    @DisplayName("A person with signatures or an active lease cannot be deleted")
    void deletionGuards() {
        when(persons.findNaturalPersonById(1L, USER_ID)).thenReturn(Optional.of(person(1L, "Alice")));
        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cette personne porte des signatures et ne peut pas être supprimée.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PERSON_HAS_SIGNATURES"));
        verify(persons, never()).save(any());

        when(signatures.existsByPersonIdAndDeletedFalse(1L)).thenReturn(false);
        when(leases.existsByTenantIdAndDeletedFalse(1L)).thenReturn(true);
        assertThatThrownBy(() -> service.delete(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Cette personne est utilisée par un bail actif et ne peut pas être supprimée.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PERSON_IN_USE"));
    }

    @Test
    @DisplayName("Blank names and missing persons are rejected in French")
    void validation() {
        assertThatThrownBy(() -> service.create(new PersonRequest(null, null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Le nom de la personne est obligatoire.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PERSON_NAME_REQUIRED"));
        assertThatThrownBy(() -> service.create(new PersonRequest(" ", null, null)))
                .isInstanceOf(BusinessException.class);

        when(persons.findNaturalPersonById(9L, USER_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(9L, new PersonRequest("x", null, null)))
                .isInstanceOf(NotFoundException.class).hasMessage("Personne introuvable.")
                .satisfies(ex -> assertThat(((NotFoundException) ex).getCode()).isEqualTo("PERSON_NOT_FOUND"));
        assertThatThrownBy(() -> service.delete(9L))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.entity(null))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Sélectionnez une personne.")
                .satisfies(ex -> assertThat(((BusinessException) ex).getCode()).isEqualTo("PERSON_REQUIRED"));
    }
}
