package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import fr.hkof.homeofficeexpenses.config.AppProperties;

@Service
public class StockageService {

    private static final Set<String> NOMS_RESERVES = Set.of(
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9");

    private final Path racine;
    private final FileTypeDetector detector;

    public StockageService(AppProperties properties, FileTypeDetector detector) {
        this.racine = Path.of(properties.dataDir()).toAbsolutePath().normalize();
        this.detector = detector;
        initialiser();
    }

    private void initialiser() {
        try {
            Files.createDirectories(racine.resolve("justificatifs"));
            Files.createDirectories(racine.resolve("sorties"));
            Files.createDirectories(racine.resolve("templates"));
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de créer le dossier de données " + racine, ex);
        }
    }

    public StoredFile stockerJustificatif(MultipartFile fichier) {
        if (fichier == null || fichier.isEmpty()) {
            throw new BusinessException("Le fichier justificatif est obligatoire.");
        }
        try {
            byte[] contenu = fichier.getBytes();
            FileTypeDetector.DetectedFile detecte = detector.detecterJustificatif(fichier.getOriginalFilename(), contenu);
            String nom = assainirNom(fichier.getOriginalFilename());
            String stocke = UUID.randomUUID() + "." + detecte.extension();
            Path cible = racine.resolve("justificatifs").resolve(stocke).normalize();
            Files.write(cible, contenu);
            return new StoredFile(nom, detecte.typeMime(), cible.toString(), contenu.length, sha256(contenu));
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le justificatif.", ex);
        }
    }

    public String stockerTemplate(byte[] contenu, String type, int version) {
        try {
            Path cible = racine.resolve("templates")
                    .resolve(type.toLowerCase() + "_v" + version + ".html")
                    .normalize();
            Files.write(cible, contenu);
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le template.", ex);
        }
    }

    public String stockerPdf(String nomRelatif, byte[] contenu) {
        try {
            Path cible = racine.resolve("sorties").resolve(nomRelatif).normalize();
            verifierInterne(cible);
            Files.createDirectories(cible.getParent());
            Files.write(cible, contenu);
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le PDF.", ex);
        }
    }

    public byte[] lire(String chemin) {
        if (chemin == null || chemin.isBlank()) {
            throw new NotFoundException("Fichier introuvable.");
        }
        try {
            if (chemin.startsWith("classpath:")) {
                String resource = chemin.substring("classpath:".length());
                try (InputStream in = new ClassPathResource(resource).getInputStream()) {
                    return in.readAllBytes();
                }
            }
            Path fichier = Path.of(chemin).toAbsolutePath().normalize();
            verifierInterne(fichier);
            if (!Files.exists(fichier)) {
                throw new NotFoundException("Fichier introuvable.");
            }
            return Files.readAllBytes(fichier);
        } catch (IOException ex) {
            throw new NotFoundException("Fichier introuvable.");
        }
    }

    public String cheminTemporaire(String nomFichier, byte[] contenu) {
        try {
            Path dossier = Files.createTempDirectory("homeofficeexpenses-");
            Path cible = dossier.resolve(assainirNom(nomFichier));
            Files.copy(new java.io.ByteArrayInputStream(contenu), cible, StandardCopyOption.REPLACE_EXISTING);
            cible.toFile().deleteOnExit();
            dossier.toFile().deleteOnExit();
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de préparer le fichier temporaire.", ex);
        }
    }

    public Path racine() {
        return racine;
    }

    private void verifierInterne(Path fichier) {
        if (!fichier.startsWith(racine)) {
            throw new BusinessException("Accès fichier refusé.");
        }
    }

    static String assainirNom(String nom) {
        String base;
        try {
            base = nom == null ? "fichier" : Path.of(nom).getFileName().toString();
        } catch (InvalidPathException ex) {
            base = nom;
        }
        String propre = base.replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]", "_").trim();
        propre = propre.replaceAll("[. ]+$", "");
        if (propre.isBlank()) {
            propre = "fichier";
        }
        int point = propre.lastIndexOf('.');
        String radical = point > 0 ? propre.substring(0, point) : propre;
        if (NOMS_RESERVES.contains(radical.toUpperCase(Locale.ROOT))) {
            propre = "_" + propre;
        }
        if (propre.length() > 180) {
            int dernierPoint = propre.lastIndexOf('.');
            String extension = dernierPoint > 0 && propre.length() - dernierPoint <= 20
                    ? propre.substring(dernierPoint)
                    : "";
            propre = propre.substring(0, 180 - extension.length()) + extension;
        }
        return propre;
    }

    private String sha256(byte[] contenu) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenu));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record StoredFile(String nomFichier, String typeMime, String chemin, long taille, String hashSha256) {
    }
}
