package fr.hkof.homeofficeexpenses.service;

import java.time.Clock;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.domain.Justificatif;
import fr.hkof.homeofficeexpenses.repository.JustificatifRepository;
import fr.hkof.homeofficeexpenses.repository.LigneFraisRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.JustificatifDto;

@Service
public class JustificatifService {

    private final JustificatifRepository repository;
    private final LigneFraisRepository ligneRepository;
    private final StockageService stockage;
    private final Clock clock;

    public JustificatifService(JustificatifRepository repository, LigneFraisRepository ligneRepository,
            StockageService stockage, Clock clock) {
        this.repository = repository;
        this.ligneRepository = ligneRepository;
        this.stockage = stockage;
        this.clock = clock;
    }

    @Transactional
    public JustificatifDto uploader(MultipartFile fichier) {
        StockageService.StoredFile stocke = stockage.stockerJustificatif(fichier);
        Justificatif justificatif = new Justificatif();
        justificatif.setNomFichier(stocke.nomFichier());
        justificatif.setTypeMime(stocke.typeMime());
        justificatif.setChemin(stocke.chemin());
        justificatif.setTaille(stocke.taille());
        justificatif.setHashSha256(stocke.hashSha256());
        justificatif.setCreatedAt(Instant.now(clock));
        justificatif.setSupprime(false);
        return versDto(repository.save(justificatif));
    }

    @Transactional(readOnly = true)
    public Justificatif entite(Long id) {
        return repository.findById(id)
                .filter(j -> !j.isSupprime())
                .orElseThrow(() -> new NotFoundException("Justificatif introuvable."));
    }

    @Transactional(readOnly = true)
    public JustificatifDto obtenir(Long id) {
        return versDto(entite(id));
    }

    public byte[] fichier(Long id) {
        return stockage.lire(entite(id).getChemin());
    }

    @Transactional
    public void supprimer(Long id) {
        Justificatif justificatif = entite(id);
        if (ligneRepository.existsByJustificatifId(id)) {
            throw new BusinessException("Ce justificatif est utilisé par une note de frais et ne peut pas être supprimé.");
        }
        justificatif.setSupprime(true);
        repository.save(justificatif);
    }

    public JustificatifDto versDto(Justificatif j) {
        return new JustificatifDto(j.getId(), j.getNomFichier(), j.getTypeMime(), j.getTaille(), j.getCreatedAt());
    }
}
