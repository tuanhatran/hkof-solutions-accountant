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
    private final OwnershipContext ownership;
    private final Clock clock;

    public AddressService(AddressRepository addresses, OwnershipContext ownership, Clock clock) {
        this.addresses = addresses;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<AddressDto> list() {
        return addresses.findAllByUserIdAndDeletedFalseOrderByLabelAsc(ownership.currentUserId()).stream()
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
            throw new BusinessException("ADDRESS_REQUIRED", "L'adresse du bien est obligatoire.");
        }
        Long owner = ownership.currentUserId();
        return addresses.findFirstByUserIdAndDeletedFalseAndLabelIgnoreCase(owner, cleaned)
                .orElseGet(() -> create(cleaned, owner));
    }

    private Address create(String label, Long owner) {
        Address address = new Address();
        address.setUserId(owner);
        address.setLabel(label);
        address.setDeleted(false);
        address.setCreatedAt(Instant.now(clock));
        return addresses.save(address);
    }
}
