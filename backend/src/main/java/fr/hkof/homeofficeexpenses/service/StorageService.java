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
public class StorageService {

    private static final Set<String> NOMS_RESERVES = Set.of(
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9");

    private final Path racine;
    private final FileTypeDetector detector;

    public StorageService(AppProperties properties, FileTypeDetector detector) {
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

    public StoredFile stockerReceipt(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Le fichier justificatif est obligatoire.");
        }
        try {
            byte[] content = file.getBytes();
            FileTypeDetector.DetectedFile detecte = detector.detecterReceipt(file.getOriginalFilename(), content);
            String name = assainirName(file.getOriginalFilename());
            String stocke = UUID.randomUUID() + "." + detecte.extension();
            Path cible = racine.resolve("justificatifs").resolve(stocke).normalize();
            Files.write(cible, content);
            return new StoredFile(name, detecte.mimeType(), cible.toString(), content.length, sha256(content));
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le justificatif.", ex);
        }
    }

    public String stockerTemplate(byte[] content, String type, int version) {
        try {
            Path cible = racine.resolve("templates")
                    .resolve(type.toLowerCase() + "_v" + version + ".html")
                    .normalize();
            Files.write(cible, content);
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le template.", ex);
        }
    }

    public String stockerPdf(String nameRelatif, byte[] content) {
        try {
            Path cible = racine.resolve("sorties").resolve(nameRelatif).normalize();
            verifierInterne(cible);
            Files.createDirectories(cible.getParent());
            Files.write(cible, content);
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le PDF.", ex);
        }
    }

    public byte[] lire(String path) {
        if (path == null || path.isBlank()) {
            throw new NotFoundException("Fichier introuvable.");
        }
        try {
            if (path.startsWith("classpath:")) {
                String resource = path.substring("classpath:".length());
                try (InputStream in = new ClassPathResource(resource).getInputStream()) {
                    return in.readAllBytes();
                }
            }
            Path file = Path.of(path).toAbsolutePath().normalize();
            verifierInterne(file);
            if (!Files.exists(file)) {
                throw new NotFoundException("Fichier introuvable.");
            }
            return Files.readAllBytes(file);
        } catch (IOException ex) {
            throw new NotFoundException("Fichier introuvable.");
        }
    }

    public String pathTemporaire(String fileName, byte[] content) {
        try {
            Path folder = Files.createTempDirectory("homeofficeexpenses-");
            Path cible = folder.resolve(assainirName(fileName));
            Files.copy(new java.io.ByteArrayInputStream(content), cible, StandardCopyOption.REPLACE_EXISTING);
            cible.toFile().deleteOnExit();
            folder.toFile().deleteOnExit();
            return cible.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de préparer le fichier temporaire.", ex);
        }
    }

    public Path racine() {
        return racine;
    }

    private void verifierInterne(Path file) {
        if (!file.startsWith(racine)) {
            throw new BusinessException("Accès fichier refusé.");
        }
    }

    static String assainirName(String name) {
        String base;
        try {
            base = name == null ? "fichier" : Path.of(name).getFileName().toString();
        } catch (InvalidPathException ex) {
            base = name;
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

    private String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record StoredFile(String fileName, String mimeType, String path, long size, String hashSha256) {
    }
}
