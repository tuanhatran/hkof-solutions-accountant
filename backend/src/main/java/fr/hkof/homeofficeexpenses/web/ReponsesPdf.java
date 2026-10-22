package fr.hkof.homeofficeexpenses.web;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

public final class ReponsesPdf {

    private ReponsesPdf() {
    }

    public static ResponseEntity<byte[]> pdf(byte[] contenu, String nomFichier) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(nomFichier).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(contenu);
    }

    public static ResponseEntity<byte[]> fichier(byte[] contenu, String typeMime, String nomFichier) {
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(typeMime);
        } catch (RuntimeException ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(nomFichier).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(contenu);
    }
}
