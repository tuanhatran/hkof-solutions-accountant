package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.lang.reflect.Method;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    private void assertProblem(ResponseEntity<ProblemDetail> response, HttpStatus status, String title) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo(title);
    }

    private MethodParameter parameter() throws NoSuchMethodException {
        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("sample", String.class);
        return new MethodParameter(method, 0);
    }

    @SuppressWarnings("unused")
    private void sample(String value) {
    }

    @Test
    @DisplayName("Not found and business exceptions map to RFC 9457 problems")
    void notFoundAndBusiness() {
        assertProblem(handler.notFound(new NotFoundException("Quittance introuvable.")),
                HttpStatus.NOT_FOUND, "Ressource introuvable");
        assertThat(handler.notFound(new NotFoundException("Quittance introuvable.")).getBody().getDetail())
                .isEqualTo("Quittance introuvable.");

        assertProblem(handler.businessRule(new BusinessException("Requête refusée")),
                HttpStatus.BAD_REQUEST, "Requête invalide");
    }

    @Test
    @DisplayName("A validation error lists the invalid fields")
    void validation() throws Exception {
        BeanPropertyBindingResult binding = new BeanPropertyBindingResult(new Object(), "request");
        binding.addError(new FieldError("request", "name", "obligatoire"));
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter(), binding);

        ResponseEntity<ProblemDetail> response = handler.validation(ex);

        assertProblem(response, HttpStatus.BAD_REQUEST, "Requête invalide");
        assertThat(response.getBody().getProperties()).containsKey("champs");
    }

    @Test
    @DisplayName("Constraint, handler validation and parameter errors map to 400")
    void parameterErrors() throws Exception {
        assertProblem(handler.constraints(new ConstraintViolationException("invalide", Set.of())),
                HttpStatus.BAD_REQUEST, "Requête invalide");
        assertProblem(handler.validationSettings(mock(HandlerMethodValidationException.class)),
                HttpStatus.BAD_REQUEST, "Requête invalide");
        assertProblem(handler.invalidParameter(new MissingServletRequestParameterException("month", "String")),
                HttpStatus.BAD_REQUEST, "Requête invalide");
        assertProblem(handler.invalidParameter(new MethodArgumentTypeMismatchException(
                        "abc", Long.class, "id", parameter(), null)),
                HttpStatus.BAD_REQUEST, "Requête invalide");
    }

    @Test
    @DisplayName("An unreadable body maps to 400")
    void unreadableBody() {
        ResponseEntity<ProblemDetail> response = handler.unreadableBody(
                new HttpMessageNotReadableException("mal formé", new MockHttpInputMessage(new byte[0])));
        assertProblem(response, HttpStatus.BAD_REQUEST, "Requête invalide");
    }

    @Test
    @DisplayName("Upload errors carry their French messages")
    void uploadErrors() {
        ResponseEntity<ProblemDetail> tooLarge = handler.fileTooLarge(new MaxUploadSizeExceededException(10));
        assertProblem(tooLarge, HttpStatus.PAYLOAD_TOO_LARGE, "Fichier trop volumineux");
        assertThat(tooLarge.getBody().getDetail()).contains("10 Mo");

        assertProblem(handler.invalidMultipart(new MultipartException("boom")),
                HttpStatus.BAD_REQUEST, "Fichier invalide");
    }

    @Test
    @DisplayName("An unknown route maps to 404 and an unexpected error to 500")
    void unknownRouteAndUnexpected() {
        assertProblem(handler.unknownRoute(new NoResourceFoundException(HttpMethod.GET, "/absent", "absent")),
                HttpStatus.NOT_FOUND, "Ressource introuvable");
        assertProblem(handler.unexpected(new IllegalStateException("boom")),
                HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne");
    }
}
