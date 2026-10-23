package fr.hkof.homeofficeexpenses.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.stereotype.Component;

@Component
public class FileTypeDetector {

    public static final long MAX_RECEIPT_SIZE = 10L * 1024 * 1024;
    public static final long MAX_TEMPLATE_SIZE = 5L * 1024 * 1024;
    public static final long MAX_SIGNATURE_SIZE = 2L * 1024 * 1024;

    private static final Map<String, String> MIME_BY_EXTENSION = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls", "application/vnd.ms-excel",
            "csv", "text/csv",
            "txt", "text/plain",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png");

    public DetectedFile detectReceipt(String fileName, byte[] content) {
        if (content == null || content.length == 0) {
            throw new BusinessException("Le fichier est vide.");
        }
        if (content.length > MAX_RECEIPT_SIZE) {
            throw new BusinessException("Fichier trop volumineux (maximum 10 Mo).");
        }
        String extension = extension(fileName);
        String mime = MIME_BY_EXTENSION.get(extension);
        if (mime == null) {
            throw new BusinessException("Format non accepté. Formats autorisés : PDF, DOCX, XLSX/XLS, CSV, TXT, JPG, PNG.");
        }
        boolean valid = switch (extension) {
            case "pdf" -> startsWithBytes(content, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "jpg", "jpeg" -> startsWithBytes(content, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case "png" -> startsWithBytes(content, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            case "docx" -> isZipContaining(content, "word/");
            case "xlsx" -> isZipContaining(content, "xl/");
            case "xls" -> startsWithBytes(content, new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1});
            case "csv", "txt" -> isText(content);
            default -> false;
        };
        if (!valid) {
            throw new BusinessException("Le contenu du fichier ne correspond pas à son extension (« ." + extension + " »).");
        }
        return new DetectedFile(fileName, extension, mime);
    }

    /**
     * Detects a signature image: PNG or JPEG only, checked by magic bytes and capped at
     * {@link #MAX_SIGNATURE_SIZE}.
     */
    public DetectedFile detectSignature(String fileName, byte[] content) {
        if (content == null || content.length == 0) {
            throw new BusinessException("Le fichier est vide.");
        }
        if (content.length > MAX_SIGNATURE_SIZE) {
            throw new BusinessException("Image trop volumineuse (maximum 2 Mo).");
        }
        String extension = extension(fileName);
        String mime = switch (extension) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            default -> null;
        };
        if (mime == null) {
            throw new BusinessException("La signature doit être une image PNG ou JPEG.");
        }
        boolean valid = switch (extension) {
            case "jpg", "jpeg" -> startsWithBytes(content, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case "png" -> startsWithBytes(content, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            default -> false;
        };
        if (!valid) {
            throw new BusinessException("La signature doit être une image PNG ou JPEG.");
        }
        return new DetectedFile(fileName, extension, mime);
    }

    public void validateTemplateHtml(String fileName, byte[] content) {
        if (content == null || content.length == 0) {
            throw new BusinessException("Le fichier template est vide.");
        }
        if (content.length > MAX_TEMPLATE_SIZE) {
            throw new BusinessException("Template trop volumineux (maximum 5 Mo).");
        }
        String extension = extension(fileName);
        if (!extension.equals("html") && !extension.equals("htm")) {
            throw new BusinessException("Le template doit être un fichier HTML (.html).");
        }
        if (!isText(content)) {
            throw new BusinessException("Le template HTML doit être un fichier texte UTF-8.");
        }
    }

    public String extension(String fileName) {
        if (fileName == null) {
            return "";
        }
        int point = fileName.lastIndexOf('.');
        if (point < 0 || point == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(point + 1).toLowerCase(Locale.ROOT);
    }

    private boolean startsWithBytes(byte[] content, byte[] signature) {
        if (content.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (content[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean isZipContaining(byte[] content, String prefix) {
        if (content.length < 4 || content[0] != 'P' || content[1] != 'K') {
            return false;
        }
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(content))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.getName().startsWith(prefix)) {
                    return true;
                }
            }
        } catch (IOException ignored) {
            return false;
        }
        return false;
    }

    private boolean isText(byte[] content) {
        int limit = Math.min(content.length, 4096);
        for (int i = 0; i < limit; i++) {
            if (content[i] == 0) {
                return false;
            }
        }
        return true;
    }

    public record DetectedFile(String fileName, String extension, String mimeType) {
    }
}
