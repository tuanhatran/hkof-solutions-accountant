package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Landlord;
import fr.hkof.homeofficeexpenses.repository.LandlordRepository;
import fr.hkof.homeofficeexpenses.repository.LeaseRepository;
import fr.hkof.homeofficeexpenses.repository.SignatureRepository;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordDto;
import fr.hkof.homeofficeexpenses.web.dto.LandlordDtos.LandlordRequest;

/**
 * Landlord directory: the party issuing rent receipts and signing leases. Landlords share the
 * person table with tenants and employees but are managed only from this service.
 */
@Service
public class LandlordService {

    private final LandlordRepository landlords;
    private final LeaseRepository leases;
    private final SignatureRepository signatures;
    private final OwnershipContext ownership;
    private final Clock clock;

    public LandlordService(LandlordRepository landlords, LeaseRepository leases,
            SignatureRepository signatures, OwnershipContext ownership, Clock clock) {
        this.landlords = landlords;
        this.leases = leases;
        this.signatures = signatures;
        this.ownership = ownership;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<LandlordDto> list() {
        return landlords.findAllByUserId(ownership.currentUserId()).stream().map(this::toDto).toList();
    }

    @Transactional
    public LandlordDto create(LandlordRequest request) {
        Landlord landlord = new Landlord();
        landlord.setUserId(ownership.currentUserId());
        apply(landlord, request);
        Instant now = Instant.now(clock);
        landlord.setDeleted(false);
        landlord.setCreatedAt(now);
        landlord.setUpdatedAt(now);
        return toDto(landlords.save(landlord));
    }

    @Transactional
    public LandlordDto update(Long id, LandlordRequest request) {
        Landlord landlord = entity(id);
        apply(landlord, request);
        landlord.setUpdatedAt(Instant.now(clock));
        return toDto(landlords.save(landlord));
    }

    @Transactional
    public void delete(Long id) {
        Landlord landlord = entity(id);
        if (signatures.existsByPersonIdAndDeletedFalse(id)) {
            throw new BusinessException("LANDLORD_HAS_SIGNATURES",
                    "Ce bailleur porte des signatures et ne peut pas être supprimé.");
        }
        if (leases.existsByLandlordIdAndDeletedFalse(id)) {
            throw new BusinessException("LANDLORD_IN_USE",
                    "Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.");
        }
        landlord.setDeleted(true);
        landlord.setUpdatedAt(Instant.now(clock));
        landlords.save(landlord);
    }

    @Transactional(readOnly = true)
    public Landlord entity(Long id) {
        return landlords.findByIdAndUserIdAndDeletedFalse(id, ownership.currentUserId())
                .orElseThrow(() -> new NotFoundException("LANDLORD_NOT_FOUND", "Bailleur introuvable."));
    }

    public LandlordDto toDto(Landlord landlord) {
        long count = landlord.getId() == null ? 0 : signatures.countByPersonIdAndDeletedFalse(landlord.getId());
        return new LandlordDto(landlord.getId(), landlord.getName(), landlord.getAddress(), landlord.getPhone(),
                landlord.getAddressNote(), landlord.getIssuePlace(), (int) count);
    }

    private void apply(Landlord landlord, LandlordRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            throw new BusinessException("LANDLORD_NAME_REQUIRED", "Le nom du bailleur est obligatoire.");
        }
        landlord.setName(name);
        landlord.setAddress(OptionalTexts.trimToNull(request.address()));
        landlord.setPhone(OptionalTexts.preserve(request.phone(), landlord.getPhone()));
        landlord.setAddressNote(OptionalTexts.preserve(request.addressNote(), landlord.getAddressNote()));
        landlord.setIssuePlace(OptionalTexts.trimToNull(request.issuePlace()));
    }
}
