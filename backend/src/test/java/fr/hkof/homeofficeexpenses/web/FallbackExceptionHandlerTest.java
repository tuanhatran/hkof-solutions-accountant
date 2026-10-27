package fr.hkof.homeofficeexpenses.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

class FallbackExceptionHandlerTest {

    private final FallbackExceptionHandler handler = new FallbackExceptionHandler();

    @Test
    @DisplayName("An unexpected error maps to a 500 problem with INTERNAL_ERROR")
    void unexpected() {
        ResponseEntity<ProblemDetail> response = handler.unexpected(new IllegalStateException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Erreur interne");
        assertThat(response.getBody().getDetail())
                .isEqualTo("Une erreur inattendue est survenue. Consultez les journaux du serveur.");
        assertThat(response.getBody().getProperties()).containsEntry("code", "INTERNAL_ERROR");
    }
}
