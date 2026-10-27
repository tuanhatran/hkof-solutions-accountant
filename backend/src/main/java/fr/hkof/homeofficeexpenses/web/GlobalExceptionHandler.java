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
    public ResponseEntity<ProblemDetail> notFound(NotFoundException ex) {
        return response(HttpStatus.NOT_FOUND, "Ressource introuvable", ex.getMessage(), ex.getCode(), ex.getParams());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ProblemDetail> businessRule(BusinessException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide", ex.getMessage(), ex.getCode(), ex.getParams());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Certains champs sont invalides.", "VALIDATION_FAILED");
        problem.setProperty("champs", fields);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> constraints(ConstraintViolationException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide", ex.getMessage(), "REQUEST_INVALID");
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ProblemDetail> validationSettings(HandlerMethodValidationException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Un paramètre de la requête est invalide.", "INVALID_PARAMETER");
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ProblemDetail> invalidParameter(Exception ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Un paramètre de la requête est manquant ou invalide.", "MISSING_OR_INVALID_PARAMETER");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> unreadableBody(HttpMessageNotReadableException ex) {
        return response(HttpStatus.BAD_REQUEST, "Requête invalide",
                "Le corps de la requête est absent ou mal formé.", "INVALID_BODY");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ProblemDetail> fileTooLarge(MaxUploadSizeExceededException ex) {
        return response(HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux",
                "Le fichier dépasse la taille maximale autorisée (10 Mo pour un justificatif, 5 Mo pour un template).",
                "FILE_TOO_LARGE", Map.of("maxJustificatif", "10", "maxTemplate", "5"));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ProblemDetail> invalidMultipart(MultipartException ex) {
        return response(HttpStatus.BAD_REQUEST, "Fichier invalide",
                "Le fichier n'a pas pu être reçu. Vérifiez son format et sa taille.", "INVALID_FILE");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ProblemDetail> unknownRoute(NoResourceFoundException ex) {
        return response(HttpStatus.NOT_FOUND, "Ressource introuvable", "Cette adresse n'existe pas.",
                NotFoundException.DEFAULT_CODE);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> unexpected(Exception ex) {
        LOG.error("Unexpected error", ex);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne",
                "Une erreur inattendue est survenue. Consultez les journaux du serveur.", "INTERNAL_ERROR");
    }

    private ResponseEntity<ProblemDetail> response(HttpStatus status, String title, String detail, String code) {
        return response(status, title, detail, code, Map.of());
    }

    private ResponseEntity<ProblemDetail> response(HttpStatus status, String title, String detail, String code,
            Map<String, Object> params) {
        return ResponseEntity.status(status).body(problem(status, title, detail, code, params));
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String code) {
        return problem(status, title, detail, code, Map.of());
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String code,
            Map<String, Object> params) {
        ProblemDetail detailBody = ProblemDetail.forStatusAndDetail(status, detail);
        detailBody.setTitle(title);
        detailBody.setProperty("code", code);
        if (!params.isEmpty()) {
            detailBody.setProperty("params", params);
        }
        return detailBody;
    }
}
