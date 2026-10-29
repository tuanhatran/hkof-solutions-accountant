package fr.hkof.homeofficeexpenses.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
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

    private static final Set<String> RESERVED_NAMES = Set.of(
            "CON", "PRN", "AUX", "NUL",
            "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
            "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9");

    private final Path root;
    private final FileTypeDetector detector;

    public StorageService(AppProperties properties, FileTypeDetector detector) {
        this.root = Path.of(properties.dataDir()).toAbsolutePath().normalize();
        this.detector = detector;
        init();
    }

    private void init() {
        try {
            Files.createDirectories(root.resolve("justificatifs"));
            Files.createDirectories(root.resolve("sorties"));
            Files.createDirectories(root.resolve("templates"));
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de créer le data directory " + root, ex);
        }
    }

    public StoredFile storeReceipt(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("RECEIPT_FILE_REQUIRED", "Le fichier justificatif est obligatoire.");
        }
        try {
            byte[] content = file.getBytes();
            FileTypeDetector.DetectedFile detected = detector.detectReceipt(file.getOriginalFilename(), content);
            String name = sanitizeName(file.getOriginalFilename());
            String storedName = UUID.randomUUID() + "." + detected.extension();
            Path target = root.resolve("justificatifs").resolve(storedName).normalize();
            Files.write(target, content);
            return new StoredFile(name, detected.mimeType(), target.toString(), content.length, sha256(content));
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le justificatif.", ex);
        }
    }

    public String storeTemplate(Long userId, byte[] content, String type, int version) {
        try {
            String prefix = userId != null ? "u" + userId + "_" : "";
            Path target = root.resolve("templates")
                    .resolve(prefix + type.toLowerCase(Locale.ROOT) + "_v" + version + ".html")
                    .normalize();
            Files.write(target, content);
            return target.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le template.", ex);
        }
    }

    public String storeTemplate(byte[] content, String type, int version) {
        return storeTemplate(null, content, type, version);
    }

    public String storePdf(String relativeName, byte[] content) {
        try {
            Path target = root.resolve("sorties").resolve(relativeName).normalize();
            checkInternal(target);
            Files.createDirectories(target.getParent());
            Files.write(target, content);
            return target.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible d'enregistrer le PDF.", ex);
        }
    }

    public byte[] read(String path) {
        if (path == null || path.isBlank()) {
            throw new NotFoundException("FILE_NOT_FOUND", "Fichier introuvable.");
        }
        try {
            if (path.startsWith("classpath:")) {
                String resource = path.substring("classpath:".length());
                try (InputStream in = new ClassPathResource(resource).getInputStream()) {
                    return in.readAllBytes();
                }
            }
            Path file = Path.of(path).toAbsolutePath().normalize();
            checkInternal(file);
            if (!Files.exists(file)) {
                throw new NotFoundException("FILE_NOT_FOUND", "Fichier introuvable.");
            }
            return Files.readAllBytes(file);
        } catch (IOException ex) {
            throw new NotFoundException("FILE_NOT_FOUND", "Fichier introuvable.");
        }
    }

    public String temporaryPath(String fileName, byte[] content) {
        try {
            Path folder = Files.createTempDirectory("homeofficeexpenses-");
            Path target = folder.resolve(sanitizeName(fileName));
            Files.copy(new java.io.ByteArrayInputStream(content), target, StandardCopyOption.REPLACE_EXISTING);
            target.toFile().deleteOnExit();
            folder.toFile().deleteOnExit();
            return target.toString();
        } catch (IOException ex) {
            throw new IllegalStateException("Impossible de préparer le fichier temporaire.", ex);
        }
    }

    public Path root() {
        return root;
    }

    private void checkInternal(Path file) {
        if (!file.startsWith(root)) {
            throw new BusinessException("FILE_ACCESS_DENIED", "Accès fichier refusé.");
        }
    }

    static String sanitizeName(String name) {
        // Strip both separators so Windows-style names are handled on every OS.
        String base = name == null
                ? "fichier"
                : name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        String sanitized = base.replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]", "_").trim();
        sanitized = sanitized.replaceAll("[. ]+$", "");
        if (sanitized.isBlank()) {
            sanitized = "fichier";
        }
        int dotIndex = sanitized.lastIndexOf('.');
        String baseName = dotIndex > 0 ? sanitized.substring(0, dotIndex) : sanitized;
        if (RESERVED_NAMES.contains(baseName.toUpperCase(Locale.ROOT))) {
            sanitized = "_" + sanitized;
        }
        if (sanitized.length() > 180) {
            int lastDot = sanitized.lastIndexOf('.');
            String extension = lastDot > 0 && sanitized.length() - lastDot <= 20
                    ? sanitized.substring(lastDot)
                    : "";
            sanitized = sanitized.substring(0, 180 - extension.length()) + extension;
        }
        return sanitized;
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
