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
    private final StorageService stockage;
    private final Clock clock;

    public ReceiptService(ReceiptRepository repository, ExpenseLineRepository lineRepository,
            StorageService stockage, Clock clock) {
        this.repository = repository;
        this.lineRepository = lineRepository;
        this.stockage = stockage;
        this.clock = clock;
    }

    @Transactional
    public ReceiptDto uploader(MultipartFile file) {
        StorageService.StoredFile stocke = stockage.stockerReceipt(file);
        Receipt receipt = new Receipt();
        receipt.setFileName(stocke.fileName());
        receipt.setMimeType(stocke.mimeType());
        receipt.setPath(stocke.path());
        receipt.setSize(stocke.size());
        receipt.setHashSha256(stocke.hashSha256());
        receipt.setCreatedAt(Instant.now(clock));
        receipt.setDeleted(false);
        return versDto(repository.save(receipt));
    }

    @Transactional(readOnly = true)
    public Receipt entity(Long id) {
        return repository.findById(id)
                .filter(j -> !j.isDeleted())
                .orElseThrow(() -> new NotFoundException("Justificatif introuvable."));
    }

    @Transactional(readOnly = true)
    public ReceiptDto obtenir(Long id) {
        return versDto(entity(id));
    }

    public byte[] file(Long id) {
        return stockage.lire(entity(id).getPath());
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

    public ReceiptDto versDto(Receipt j) {
        return new ReceiptDto(j.getId(), j.getFileName(), j.getMimeType(), j.getSize(), j.getCreatedAt());
    }
}
