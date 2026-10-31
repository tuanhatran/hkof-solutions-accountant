package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Person;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.PersonRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.PersonDto;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.PersonRequest;

/**
 * Natural person directory: lease parties and signature owners. Employees share the person
 * table but are managed by {@link EmployeeService} and never appear here.
 */
@Service
public class PersonService {

    private final PersonRepository persons;
    private final LeaseRepository leases;
    private final SignatureRepository signatures;
    private final OwnershipContext ownership;
    private final Clock clock;

    public PersonService(PersonRepository persons, LeaseRepository leases, SignatureRepository signatures,
            OwnershipContext ownership, Clock clock) {
        this.persons = persons;
        this.leases = leases;
        this.signatures = signatures;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PersonDto> list() {
        return persons.findAllNaturalPersons(ownership.currentUserId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public PersonDto create(PersonRequest request) {
        Person person = new Person();
        person.setUserId(ownership.currentUserId());
        apply(person, request);
        person.setDeleted(false);
        person.setCreatedAt(Instant.now(clock));
        person.setUpdatedAt(Instant.now(clock));
        return toDto(persons.save(person));
    }

    @Transactional
    public PersonDto update(Long id, PersonRequest request) {
        Person person = entity(id);
        apply(person, request);
        person.setUpdatedAt(Instant.now(clock));
        return toDto(persons.save(person));
    }

    @Transactional
    public void delete(Long id) {
        Person person = entity(id);
        if (signatures.existsByPersonIdAndDeletedFalse(id)) {
            throw new BusinessException("PERSON_HAS_SIGNATURES",
                    "Cette personne porte des signatures et ne peut pas être supprimée.");
        }
        if (leases.existsByLandlordIdAndDeletedFalse(id) || leases.existsByTenantIdAndDeletedFalse(id)) {
            throw new BusinessException("PERSON_IN_USE",
                    "Cette personne est utilisée par un bail actif et ne peut pas être supprimée.");
        }
        person.setDeleted(true);
        person.setUpdatedAt(Instant.now(clock));
        persons.save(person);
    }

    @Transactional(readOnly = true)
    public Person entity(Long id) {
        if (id == null) {
            throw new BusinessException("PERSON_REQUIRED", "Sélectionnez une personne.");
        }
        return persons.findNaturalPersonById(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("PERSON_NOT_FOUND", "Personne introuvable."));
    }

    public PersonDto toDto(Person person) {
        long count = person.getId() == null ? 0 : signatures.countByPersonIdAndDeletedFalse(person.getId());
        return new PersonDto(person.getId(), person.getName(), person.getAddress(), person.getPhone(),
                person.getAddressNote(), person.getIssuePlace(), (int) count);
    }

    private void apply(Person person, PersonRequest request) {
        person.setName(requiredText(request.name(), "PERSON_NAME_REQUIRED",
                "Le nom de la personne est obligatoire."));
        person.setAddress(optionalText(request.address()));
        person.setPhone(optionalText(request.phone()));
        person.setAddressNote(optionalText(request.addressNote()));
        person.setIssuePlace(optionalText(request.issuePlace()));
    }

    private String requiredText(String value, String code, String message) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException(code, message);
        }
        return cleaned;
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
