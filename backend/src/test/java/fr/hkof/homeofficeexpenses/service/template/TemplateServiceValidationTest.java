package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import fr.hkof.homeofficeexpenses.domain.TypeTemplate;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.RapportValidationDto;

class TemplateServiceValidationTest {

    private final TemplateService service = new TemplateService(null, null, null, null, null, Clock.systemUTC());

    private String ressource(String chemin) throws IOException {
        try (InputStream in = new ClassPathResource(chemin).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    @DisplayName("Les modèles intégrés passent la validation, y compris la boucle des lignes")
    void modelesIntegresValides() throws IOException {
        RapportValidationDto note = service.valider(TypeTemplate.NOTE_FRAIS, ressource("templates/defaut/note-frais.html"));
        assertThat(note.structureValide()).isTrue();
        assertThat(note.variablesInconnues()).isEmpty();
        assertThat(note.variablesManquantes()).isEmpty();
        assertThat(note.variablesReconnues()).contains("lignes", "lignes.poste", "lignes.montant_retenu");

        RapportValidationDto quittance = service.valider(TypeTemplate.QUITTANCE,
                ressource("templates/defaut/quittance.html"));
        assertThat(quittance.structureValide()).isTrue();
        assertThat(quittance.variablesInconnues()).isEmpty();
        assertThat(quittance.variablesManquantes()).isEmpty();
    }

    @Test
    @DisplayName("Une variable inconnue dans la boucle reste une erreur explicite")
    void variableInconnueSignalee() {
        RapportValidationDto rapport = service.valider(TypeTemplate.NOTE_FRAIS, """
                <html><body>
                {{#lignes}}<p>{{poste}} {{montant_retenu}} {{inconnue}}</p>{{/lignes}}
                </body></html>
                """);
        assertThat(rapport.structureValide()).isFalse();
        assertThat(rapport.variablesInconnues()).containsExactly("inconnue");
        assertThat(rapport.variablesReconnues()).contains("lignes.poste", "lignes.montant_retenu");
        assertThat(rapport.erreurs()).anyMatch(erreur -> erreur.contains("Variables inconnues"));
    }

    @Test
    @DisplayName("Les variables obligatoires manquantes sont un avertissement, pas un blocage")
    void variablesManquantesSignalees() {
        RapportValidationDto rapport = service.valider(TypeTemplate.QUITTANCE,
                "<html><body>{{bailleur.nom}}</body></html>");
        assertThat(rapport.structureValide()).isTrue();
        assertThat(rapport.variablesManquantes()).contains("locataire.nom", "total");
    }

    @Test
    @DisplayName("Un script ou une expression exécutable invalide le template")
    void securiteRefusee() {
        RapportValidationDto script = service.valider(TypeTemplate.QUITTANCE,
                "<html><body><script>alert(1)</script>{{bailleur.nom}}</body></html>");
        assertThat(script.structureValide()).isFalse();
        assertThat(script.erreurs()).anyMatch(erreur -> erreur.contains("script"));

        RapportValidationDto thymeleaf = service.valider(TypeTemplate.QUITTANCE,
                "<html><body><p th:text=\"${danger}\">{{bailleur.nom}}</p></body></html>");
        assertThat(thymeleaf.structureValide()).isFalse();
        assertThat(thymeleaf.erreurs()).anyMatch(erreur -> erreur.contains("Thymeleaf"));
    }
}
