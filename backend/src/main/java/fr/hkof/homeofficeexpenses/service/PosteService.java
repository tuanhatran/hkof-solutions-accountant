package fr.hkof.homeofficeexpenses.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.hkof.homeofficeexpenses.domain.Periodicite;
import fr.hkof.homeofficeexpenses.domain.Poste;
import fr.hkof.homeofficeexpenses.repository.PosteRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.PosteDto;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.PosteRequest;

@Service
public class PosteService {

    private final PosteRepository repository;

    public PosteService(PosteRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<PosteDto> lister(boolean tous) {
        List<Poste> postes = tous
                ? repository.findBySupprimeFalseOrderByOrdreAsc()
                : repository.findBySupprimeFalseAndActifTrueOrderByOrdreAsc();
        return postes.stream().map(this::versDto).toList();
    }

    @Transactional(readOnly = true)
    public Poste entite(String code) {
        return repository.findByCodeAndSupprimeFalse(code)
                .orElseThrow(() -> new BusinessException("Type de frais inconnu : " + code));
    }

    @Transactional
    public PosteDto creer(PosteRequest request) {
        if (request.libelle() == null || request.libelle().isBlank()) {
            throw new BusinessException("Le libellé du poste est obligatoire.");
        }
        String code = request.code() == null || request.code().isBlank()
                ? genererCode(request.libelle())
                : normaliserCode(request.code());
        if (repository.existsByCode(code)) {
            throw new BusinessException("Un poste avec le code « " + code + " » existe déjà.");
        }
        Poste poste = new Poste();
        poste.setCode(code);
        appliquer(poste, request);
        poste.setSupprime(false);
        return versDto(repository.save(poste));
    }

    @Transactional
    public PosteDto mettreAJour(Long id, PosteRequest request) {
        Poste poste = repository.findById(id)
                .filter(p -> !p.isSupprime())
                .orElseThrow(() -> new NotFoundException("Poste introuvable."));
        appliquer(poste, request);
        return versDto(repository.save(poste));
    }

    @Transactional
    public void supprimer(Long id) {
        Poste poste = repository.findById(id)
                .filter(p -> !p.isSupprime())
                .orElseThrow(() -> new NotFoundException("Poste introuvable."));
        poste.setSupprime(true);
        poste.setActif(false);
        repository.save(poste);
    }

    private void appliquer(Poste poste, PosteRequest request) {
        if (request.libelle() == null || request.libelle().isBlank()) {
            throw new BusinessException("Le libellé du poste est obligatoire.");
        }
        poste.setLibelle(request.libelle().trim());
        poste.setFournisseur(request.fournisseur() == null ? null : request.fournisseur().trim());
        poste.setProrataPct(Montants.pourcentage(request.prorataPct()));
        poste.setPeriodicite(periodicite(request.periodicite()));
        poste.setActif(request.actif() == null || request.actif());
        poste.setOrdre(request.ordre() == null ? 0 : request.ordre());
        poste.setPlusieursLignesAutorisees(Boolean.TRUE.equals(request.plusieursLignesAutorisees()));
    }

    private Periodicite periodicite(String valeur) {
        if (valeur == null || valeur.isBlank()) {
            return Periodicite.MENSUELLE;
        }
        try {
            return Periodicite.valueOf(valeur.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Périodicité invalide : " + valeur);
        }
    }

    private String normaliserCode(String valeur) {
        String code = Normalizer.normalize(valeur.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toLowerCase(Locale.ROOT);
        if (code.isBlank()) {
            throw new BusinessException("Le code du poste est invalide.");
        }
        return code;
    }

    private String genererCode(String libelle) {
        return normaliserCode(libelle);
    }

    public PosteDto versDto(Poste p) {
        return new PosteDto(
                p.getId(),
                p.getCode(),
                p.getLibelle(),
                p.getFournisseur(),
                Montants.valeurApi(p.getProrataPct()),
                p.getPeriodicite().name(),
                p.isActif(),
                p.getOrdre(),
                p.isPlusieursLignesAutorisees());
    }
}
