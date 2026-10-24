package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Address;
import fr.hkof.homeofficeexpenses.repository.AddressRepository;
import fr.hkof.homeofficeexpenses.web.dto.RentConfigurationDtos.AddressDto;

/** Address directory shared by the leases; labels are unique and never overwritten. */
@Service
public class AddressService {

    private final AddressRepository addresses;
    private final Clock clock;

    public AddressService(AddressRepository addresses, Clock clock) {
        this.addresses = addresses;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<AddressDto> list() {
        return addresses.findAllByDeletedFalseOrderByLabelAsc().stream()
                .map(address -> new AddressDto(address.getId(), address.getLabel()))
                .toList();
    }

    /**
     * Returns the non-deleted address with the same trimmed, case-insensitive label, or
     * creates it. A logically deleted address with the same label is never revived.
     */
    @Transactional
    public Address findOrCreate(String label) {
        String cleaned = label == null ? "" : label.trim();
        if (cleaned.isEmpty()) {
            throw new BusinessException("L'adresse du bien est obligatoire.");
        }
        return addresses.findFirstByDeletedFalseAndLabelIgnoreCase(cleaned)
                .orElseGet(() -> create(cleaned));
    }

    private Address create(String label) {
        Address address = new Address();
        address.setLabel(label);
        address.setDeleted(false);
        address.setCreatedAt(Instant.now(clock));
        return addresses.save(address);
    }
}
