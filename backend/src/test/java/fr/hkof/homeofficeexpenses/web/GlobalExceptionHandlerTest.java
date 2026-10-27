package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import fr.hkof.homeofficeexpenses.service.BusinessException;
import fr.hkof.homeofficeexpenses.service.NotFoundException;
import jakarta.validation.ConstraintViolationException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    private void assertProblem(ResponseEntity<ProblemDetail> response, HttpStatus status, String title, String code) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo(title);
        assertThat(response.getBody().getProperties()).containsEntry("code", code);
    }

    private MethodParameter parameter() throws NoSuchMethodException {
        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("sample", String.class);
        return new MethodParameter(method, 0);
    }

    @SuppressWarnings("unused")
    private void sample(String value) {
    }

    @Test
    @DisplayName("Not found and business exceptions map to RFC 9457 problems with default codes")
    void notFoundAndBusiness() {
        assertProblem(handler.notFound(new NotFoundException("Quittance introuvable.")),
                HttpStatus.NOT_FOUND, "Ressource introuvable", "RESOURCE_NOT_FOUND");
        assertThat(handler.notFound(new NotFoundException("Quittance introuvable.")).getBody().getDetail())
                .isEqualTo("Quittance introuvable.");

        assertProblem(handler.businessRule(new BusinessException("Requête refusée")),
                HttpStatus.BAD_REQUEST, "Requête invalide", "BUSINESS_ERROR");
    }

    @Test
    @DisplayName("Exceptions keep a custom code and its params")
    void customCodes() {
        ResponseEntity<ProblemDetail> business = handler.businessRule(new BusinessException(
                "RENT_ALREADY_ISSUED", "Quittance déjà générée.", Map.of("month", "2026-01")));
        assertProblem(business, HttpStatus.BAD_REQUEST, "Requête invalide", "RENT_ALREADY_ISSUED");
        assertThat(business.getBody().getProperties()).containsEntry("params", Map.of("month", "2026-01"));

        assertProblem(handler.notFound(new NotFoundException("LEASE_NOT_FOUND", "Bail absent.")),
                HttpStatus.NOT_FOUND, "Ressource introuvable", "LEASE_NOT_FOUND");
    }

    @Test
    @DisplayName("A validation error lists the invalid fields")
    void validation() throws Exception {
        BeanPropertyBindingResult binding = new BeanPropertyBindingResult(new Object(), "request");
        binding.addError(new FieldError("request", "name", "obligatoire"));
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter(), binding);

        ResponseEntity<ProblemDetail> response = handler.validation(ex);

        assertProblem(response, HttpStatus.BAD_REQUEST, "Requête invalide", "VALIDATION_FAILED");
        assertThat(response.getBody().getProperties()).containsKey("champs");
    }

    @Test
    @DisplayName("Constraint, handler validation and parameter errors map to 400")
    void parameterErrors() throws Exception {
        assertProblem(handler.constraints(new ConstraintViolationException("invalide", Set.of())),
                HttpStatus.BAD_REQUEST, "Requête invalide", "REQUEST_INVALID");
        assertProblem(handler.validationSettings(mock(HandlerMethodValidationException.class)),
                HttpStatus.BAD_REQUEST, "Requête invalide", "INVALID_PARAMETER");
        assertProblem(handler.invalidParameter(new MissingServletRequestParameterException("month", "String")),
                HttpStatus.BAD_REQUEST, "Requête invalide", "MISSING_OR_INVALID_PARAMETER");
        assertProblem(handler.invalidParameter(new MissingRequestHeaderException("X-Test", parameter())),
                HttpStatus.BAD_REQUEST, "Requête invalide", "MISSING_OR_INVALID_PARAMETER");
        assertProblem(handler.invalidParameter(new MethodArgumentTypeMismatchException(
                        "abc", Long.class, "id", parameter(), null)),
                HttpStatus.BAD_REQUEST, "Requête invalide", "MISSING_OR_INVALID_PARAMETER");
    }

    @Test
    @DisplayName("Protocol errors keep their 4xx status with a stable code")
    void protocolErrors() {
        assertProblem(handler.methodNotAllowed(new HttpRequestMethodNotSupportedException("PUT")),
                HttpStatus.METHOD_NOT_ALLOWED, "Méthode non autorisée", "METHOD_NOT_ALLOWED");
        assertProblem(handler.unsupportedMediaType(new HttpMediaTypeNotSupportedException("text/plain")),
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Format non pris en charge", "UNSUPPORTED_MEDIA_TYPE");

        ResponseEntity<ProblemDetail> notAcceptable = handler.notAcceptable(
                new HttpMediaTypeNotAcceptableException(List.of(MediaType.APPLICATION_XML)));
        assertProblem(notAcceptable, HttpStatus.NOT_ACCEPTABLE, "Format non disponible", "NOT_ACCEPTABLE");
        assertThat(notAcceptable.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    @DisplayName("An unreadable body maps to 400")
    void unreadableBody() {
        ResponseEntity<ProblemDetail> response = handler.unreadableBody(
                new HttpMessageNotReadableException("mal formé", new MockHttpInputMessage(new byte[0])));
        assertProblem(response, HttpStatus.BAD_REQUEST, "Requête invalide", "INVALID_BODY");
    }

    @Test
    @DisplayName("Upload errors carry their code, size params and French messages")
    void uploadErrors() {
        ResponseEntity<ProblemDetail> tooLarge = handler.fileTooLarge(new MaxUploadSizeExceededException(10));
        assertProblem(tooLarge, HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux", "FILE_TOO_LARGE");
        assertThat(tooLarge.getBody().getDetail()).contains("10 Mo");
        assertThat(tooLarge.getBody().getProperties()).containsEntry("params",
                Map.of("maxJustificatif", "10", "maxTemplate", "5"));

        assertProblem(handler.invalidMultipart(new MultipartException("boom")),
                HttpStatus.BAD_REQUEST, "Fichier invalide", "INVALID_FILE");
    }

    @Test
    @DisplayName("An unknown route maps to 404")
    void unknownRoute() {
        assertProblem(handler.unknownRoute(new NoResourceFoundException(HttpMethod.GET, "/absent", "absent")),
                HttpStatus.NOT_FOUND, "Ressource introuvable", "RESOURCE_NOT_FOUND");
    }
}
