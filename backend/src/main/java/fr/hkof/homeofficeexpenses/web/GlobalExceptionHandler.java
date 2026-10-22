package fr.hkof.homeofficeexpenses.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ProblemDetail> introuvable(NotFoundException ex) {
        return response(HttpStatus.NOT_FOUND, "Ressource introuvable", ex.getMessage());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ProblemDetail> regleMetier(BusinessException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        ProblemDetail probleme = probleme(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Certains champs sont invalides.");
        probleme.setProperty("champs", fields);
        return ResponseEntity.badRequest().body(probleme);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> contraintes(ConstraintViolationException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide", ex.getMessage());
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> validationSettings(HandlerMethodValidationException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Un paramètre de la requête est invalide.");
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ProblemDetail> parametreInvalide(Exception ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Un paramètre de la requête est manquant ou invalide.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> corpsIllisible(HttpMessageNotReadableException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Le corps de la requête est absent ou mal formé.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ProblemDetail> fileTropVolumineux(MaxUploadSizeExceededException ex) {
        return response(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux",
                "Le fichier dépasse la taille maximale autorisée (10 Mo pour un justificatif, 5 Mo pour un template).");
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ProblemDetail> multipartInvalide(MultipartException ex) {
        return response(HttpStatus.BAD_REQUEST, "Fichier invalide",
                "Le fichier n'a pas pu être reçu. Vérifiez son format et sa taille.");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetail> routeUnknown(NoResourceFoundException ex) {
        return response(HttpStatus.NOT_FOUND, "Ressource introuvable", "Cette adresse n'existe pas.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> inattendue(Exception ex) {
        LOG.error("Erreur inattendue", ex);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne",
                "Une erreur inattendue est survenue. Consultez les journaux du serveur.");
    }

    private ResponseEntity<ProblemDetail> response(HttpStatus status, String titre, String detail) {
        return ResponseEntity.status(status).body(probleme(status, titre, detail));
    }

    private ProblemDetail probleme(HttpStatus status, String titre, String detail) {
        ProblemDetail probleme = ProblemDetail.forStatusAndDetail(status, detail);
        probleme.setTitle(titre);
        return probleme;
    }
}
