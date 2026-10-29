package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.ValidationReportDto;

class TemplateValidatorSecurityTest {

    private final TemplateService service = new TemplateService(null, null, null, null, null, null, Clock.systemUTC());

    private ValidationReportDto validate(String content) {
        return service.validate(TemplateType.RENT_RECEIPT, content);
    }

    @Test
    @DisplayName("Comments are ignored and closing sections do not fail")
    void commentsAndSections() {
        ValidationReportDto report = service.validate(TemplateType.EXPENSE_STATEMENT, """
                <html><body>{{! commentaire libre }}{{societe.raison_sociale}}
                {{#lignes}}{{poste}}{{/lignes}}{{total}}</body></html>
                """);
        assertThat(report.structureValid()).isTrue();
    }

    @Test
    @DisplayName("A variable known only inside the lignes loop is recognized")
    void lineLoopVariables() {
        ValidationReportDto report = service.validate(TemplateType.EXPENSE_STATEMENT, """
                <html><body>{{societe.raison_sociale}}{{gerant}}{{numero}}{{total}}
                {{#lignes}}{{poste}}{{montant_retenu}}{{/lignes}}</body></html>
                """);
        assertThat(report.structureValid()).isTrue();
        assertThat(report.recognizedVariables()).contains("lignes.poste", "lignes.montant_retenu");
    }

    @Test
    @DisplayName("Unknown variables are reported once and make the template invalid")
    void unknownVariablesDeduplicated() {
        ValidationReportDto report = service.validate(TemplateType.EXPENSE_STATEMENT, """
                <html><body>{{societe.raison_sociale}}{{inconnue}}{{inconnue}}
                {{#lignes}}{{poste}}{{inconnue}}{{/lignes}}{{total}}</body></html>
                """);
        assertThat(report.structureValid()).isFalse();
        assertThat(report.unknownVariables()).containsExactly("inconnue");
    }

    @Test
    @DisplayName("A malformed Mustache structure is reported")
    void malformedMustache() {
        ValidationReportDto report = validate("<html><body>{{#lignes}}</body></html>");
        assertThat(report.structureValid()).isFalse();
        assertThat(report.errors()).anyMatch(error -> error.startsWith("Structure Mustache invalide"));
    }

    @Test
    @DisplayName("Every forbidden HTML tag is reported")
    void forbiddenTags() {
        for (String tag : new String[]{"script", "iframe", "object", "embed", "form", "base"}) {
            ValidationReportDto report = validate("<html><body><" + tag + "></" + tag + "></body></html>");
            assertThat(report.structureValid()).as(tag).isFalse();
            assertThat(report.errors()).as(tag).anyMatch(error -> error.contains("<" + tag + ">"));
        }
    }

    @Test
    @DisplayName("Unescaped and executable expressions are reported")
    void executableExpressions() {
        assertThat(validate("<html><body>{{{bailleur.nom}}}</body></html>").errors())
                .anyMatch(error -> error.contains("non échappées"));
        assertThat(validate("<html><body>{{&bailleur.nom}}</body></html>").errors())
                .anyMatch(error -> error.contains("non échappées"));
        assertThat(validate("<html><body>#{danger}</body></html>").errors())
                .anyMatch(error -> error.contains("Thymeleaf"));
        assertThat(validate("<html><body><% out.print(1); %></body></html>").errors())
                .anyMatch(error -> error.contains("Thymeleaf"));
        assertThat(validate("<html><body><a href=\"javascript:alert(1)\">lien</a></body></html>").errors())
                .anyMatch(error -> error.contains("JavaScript"));
    }

    @Test
    @DisplayName("Remote CSS resources are reported whatever the scheme")
    void remoteCss() {
        for (String value : new String[]{"http://exemple.fr/a.png", "https://exemple.fr/a.png",
                "//exemple.fr/a.png", "file:///etc/passwd"}) {
            ValidationReportDto report = validate(
                    "<html><body><div style=\"background:url('" + value + "')\">x</div></body></html>");
            assertThat(report.structureValid()).as(value).isFalse();
            assertThat(report.errors()).as(value).anyMatch(error -> error.contains("distantes"));
        }
    }

    @Test
    @DisplayName("Event and Thymeleaf attributes are reported")
    void forbiddenAttributes() {
        ValidationReportDto report = validate(
                "<html><body><p onclick=\"x()\" data-th-text=\"${x}\">texte</p></body></html>");
        assertThat(report.structureValid()).isFalse();
        assertThat(report.errors()).anyMatch(error -> error.contains("événement"));
        assertThat(report.errors()).anyMatch(error -> error.contains("Thymeleaf"));
    }

    @Test
    @DisplayName("External links are rejected while anchors and data images are accepted")
    void linksAndImages() {
        ValidationReportDto external = validate(
                "<html><body><a href=\"https://exemple.fr\">lien</a></body></html>");
        assertThat(external.structureValid()).isFalse();
        assertThat(external.errors()).anyMatch(error -> error.contains("liens externes"));

        ValidationReportDto anchor = validate("<html><body><a href=\"#top\">haut</a></body></html>");
        assertThat(anchor.errors()).noneMatch(error -> error.contains("liens externes"));

        ValidationReportDto dataImage = validate(
                "<html><body><img src=\"data:image/png;base64,AAAA\"></body></html>");
        assertThat(dataImage.errors()).noneMatch(error -> error.contains("data URI"));

        ValidationReportDto dataAttribute = validate(
                "<html><body><object data=\"data:image/png;base64,AAAA\"></object></body></html>");
        assertThat(dataAttribute.errors()).noneMatch(error -> error.contains("data URI"));

        ValidationReportDto remoteImage = validate("<html><body><img src=\"https://exemple.fr/a.png\"></body></html>");
        assertThat(remoteImage.structureValid()).isFalse();
        assertThat(remoteImage.errors()).anyMatch(error -> error.contains("data URI"));
    }
}
