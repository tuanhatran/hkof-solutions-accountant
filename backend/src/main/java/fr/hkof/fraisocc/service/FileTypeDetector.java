package fr.hkof.fraisocc.service;

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

    public static final long TAILLE_MAX_JUSTIFICATIF = 10L * 1024 * 1024;
    public static final long TAILLE_MAX_TEMPLATE = 5L * 1024 * 1024;

    private static final Map<String, String> MIME_PAR_EXTENSION = Map.of(
            "pdf", "application/pdf",
            "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls", "application/vnd.ms-excel",
            "csv", "text/csv",
            "txt", "text/plain",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png");

    public DetectedFile detecterJustificatif(String nomFichier, byte[] contenu) {
        if (contenu == null || contenu.length == 0) {
            throw new BusinessException("Le fichier est vide.");
        }
        if (contenu.length > TAILLE_MAX_JUSTIFICATIF) {
            throw new BusinessException("Fichier trop volumineux (maximum 10 Mo).");
        }
        String extension = extension(nomFichier);
        String mime = MIME_PAR_EXTENSION.get(extension);
        if (mime == null) {
            throw new BusinessException("Format non accepté. Formats autorisés : PDF, DOCX, XLSX/XLS, CSV, TXT, JPG, PNG.");
        }
        boolean valide = switch (extension) {
            case "pdf" -> commencePar(contenu, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case "jpg", "jpeg" -> commencePar(contenu, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case "png" -> commencePar(contenu, new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            case "docx" -> estZipAvec(contenu, "word/");
            case "xlsx" -> estZipAvec(contenu, "xl/");
            case "xls" -> commencePar(contenu, new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1});
            case "csv", "txt" -> estTexte(contenu);
            default -> false;
        };
        if (!valide) {
            throw new BusinessException("Le contenu du fichier ne correspond pas à son extension (« ." + extension + " »).");
        }
        return new DetectedFile(nomFichier, extension, mime);
    }

    public void validerTemplateHtml(String nomFichier, byte[] contenu) {
        if (contenu == null || contenu.length == 0) {
            throw new BusinessException("Le fichier template est vide.");
        }
        if (contenu.length > TAILLE_MAX_TEMPLATE) {
            throw new BusinessException("Template trop volumineux (maximum 5 Mo).");
        }
        String extension = extension(nomFichier);
        if (!extension.equals("html") && !extension.equals("htm")) {
            throw new BusinessException("Le template doit être un fichier HTML (.html).");
        }
        if (!estTexte(contenu)) {
            throw new BusinessException("Le template HTML doit être un fichier texte UTF-8.");
        }
    }

    public String extension(String nomFichier) {
        if (nomFichier == null) {
            return "";
        }
        int point = nomFichier.lastIndexOf('.');
        if (point < 0 || point == nomFichier.length() - 1) {
            return "";
        }
        return nomFichier.substring(point + 1).toLowerCase(Locale.ROOT);
    }

    private boolean commencePar(byte[] contenu, byte[] signature) {
        if (contenu.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (contenu[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean estZipAvec(byte[] contenu, String prefixe) {
        if (contenu.length < 4 || contenu[0] != 'P' || contenu[1] != 'K') {
            return false;
        }
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(contenu))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.getName().startsWith(prefixe)) {
                    return true;
                }
            }
        } catch (IOException ignored) {
            return false;
        }
        return false;
    }

    private boolean estTexte(byte[] contenu) {
        int limite = Math.min(contenu.length, 4096);
        for (int i = 0; i < limite; i++) {
            if (contenu[i] == 0) {
                return false;
            }
        }
        return true;
    }

    public record DetectedFile(String nomFichier, String extension, String typeMime) {
    }
}
