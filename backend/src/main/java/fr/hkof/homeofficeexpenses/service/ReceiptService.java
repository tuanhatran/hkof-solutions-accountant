package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Receipt;
import fr.hkof.homeofficeexpenses.repository.ReceiptRepository;
import fr.hkof.homeofficeexpenses.repository.ExpenseLineRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ReceiptDto;

@Service
public class ReceiptService {

    private final ReceiptRepository repository;
    private final ExpenseLineRepository lineRepository;
    private final StorageService storage;
    private final Clock clock;

    public ReceiptService(ReceiptRepository repository, ExpenseLineRepository lineRepository,
            StorageService storage, Clock clock) {
        this.repository = repository;
        this.lineRepository = lineRepository;
        this.storage = storage;
        this.clock = clock;
    }

    @Transactional
    public ReceiptDto upload(MultipartFile file) {
        StorageService.StoredFile storedFile = storage.storeReceipt(file);
        Receipt receipt = new Receipt();
        receipt.setFileName(storedFile.fileName());
        receipt.setMimeType(storedFile.mimeType());
        receipt.setPath(storedFile.path());
        receipt.setSize(storedFile.size());
        receipt.setHashSha256(storedFile.hashSha256());
        receipt.setCreatedAt(Instant.now(clock));
        receipt.setDeleted(false);
        return toDto(repository.save(receipt));
    }

    @Transactional(readOnly = true)
    public Receipt entity(Long id) {
        return repository.findById(id)
                .filter(receipt -> !receipt.isDeleted())
                .orElseThrow(() -> new NotFoundException("Justificatif introuvable."));
    }

    @Transactional(readOnly = true)
    public ReceiptDto get(Long id) {
        return toDto(entity(id));
    }

    public byte[] file(Long id) {
        return storage.read(entity(id).getPath());
    }

    @Transactional
    public void delete(Long id) {
        Receipt receipt = entity(id);
        if (lineRepository.existsByReceiptId(id)) {
            throw new BusinessException("Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé.");
        }
        receipt.setDeleted(true);
        repository.save(receipt);
    }

    public ReceiptDto toDto(Receipt receipt) {
        return new ReceiptDto(receipt.getId(), receipt.getFileName(), receipt.getMimeType(), receipt.getSize(), receipt.getCreatedAt());
    }
}
