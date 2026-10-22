package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.ValidationReportDto;

class TemplateServiceValidationTest {

    private final TemplateService service = new TemplateService(null, null, null, null, null, Clock.systemUTC());

    private String resource(String path) throws IOException {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    @DisplayName("Bundled templates pass validation, including the line loop")
    void bundledModelsValid() throws IOException {
        ValidationReportDto statement = service.validate(TemplateType.EXPENSE_STATEMENT, resource("templates/defaut/note-frais.html"));
        assertThat(statement.structureValid()).isTrue();
        assertThat(statement.unknownVariables()).isEmpty();
        assertThat(statement.missingVariables()).isEmpty();
        assertThat(statement.recognizedVariables()).contains("lignes", "lignes.poste", "lignes.montant_retenu");

        ValidationReportDto rentReceipt = service.validate(TemplateType.RENT_RECEIPT,
                resource("templates/defaut/quittance.html"));
        assertThat(rentReceipt.structureValid()).isTrue();
        assertThat(rentReceipt.unknownVariables()).isEmpty();
        assertThat(rentReceipt.missingVariables()).isEmpty();
    }

    @Test
    @DisplayName("An unknown variable inside the loop remains an explicit error")
    void reportsUnknownVariable() {
        ValidationReportDto report = service.validate(TemplateType.EXPENSE_STATEMENT, """
                <html><body>
                {{#lignes}}<p>{{poste}} {{montant_retenu}} {{inconnue}}</p>{{/lignes}}
                </body></html>
                """);
        assertThat(report.structureValid()).isFalse();
        assertThat(report.unknownVariables()).containsExactly("inconnue");
        assertThat(report.recognizedVariables()).contains("lignes.poste", "lignes.montant_retenu");
        assertThat(report.errors()).anyMatch(error -> error.contains("Variables inconnues"));
    }

    @Test
    @DisplayName("Missing required variables are a warning, not a blocker")
    void reportsMissingVariables() {
        ValidationReportDto report = service.validate(TemplateType.RENT_RECEIPT,
                "<html><body>{{bailleur.nom}}</body></html>");
        assertThat(report.structureValid()).isTrue();
        assertThat(report.missingVariables()).contains("locataire.nom", "total");
    }

    @Test
    @DisplayName("A script or executable expression invalidates the template")
    void securityRefused() {
        ValidationReportDto script = service.validate(TemplateType.RENT_RECEIPT,
                "<html><body><script>alert(1)</script>{{bailleur.nom}}</body></html>");
        assertThat(script.structureValid()).isFalse();
        assertThat(script.errors()).anyMatch(error -> error.contains("script"));

        ValidationReportDto thymeleaf = service.validate(TemplateType.RENT_RECEIPT,
                "<html><body><p th:text=\"${danger}\">{{bailleur.nom}}</p></body></html>");
        assertThat(thymeleaf.structureValid()).isFalse();
        assertThat(thymeleaf.errors()).anyMatch(error -> error.contains("Thymeleaf"));
    }
}
