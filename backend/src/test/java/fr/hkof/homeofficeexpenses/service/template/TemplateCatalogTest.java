package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.web.dto.TemplateDtos.TemplateVariableDto;

class TemplateCatalogTest {

    @Test
    @DisplayName("Both catalogs expose their variables and required names")
    void catalogs() {
        List<TemplateVariableDto> rentReceipt = TemplateCatalog.variables(TemplateType.RENT_RECEIPT);
        List<TemplateVariableDto> statement = TemplateCatalog.variables(TemplateType.EXPENSE_STATEMENT);

        assertThat(rentReceipt).extracting(TemplateVariableDto::name).contains("bailleur.nom", "signature");
        assertThat(statement).extracting(TemplateVariableDto::name).contains("lignes.montant_retenu", "total");
        assertThat(TemplateCatalog.requiredNames(TemplateType.RENT_RECEIPT)).contains("bailleur.nom", "total");
        assertThat(TemplateCatalog.allowedNames(TemplateType.EXPENSE_STATEMENT)).contains("lignes");
    }

    @Test
    @DisplayName("A description is only returned for a known variable")
    void descriptions() {
        assertThat(TemplateCatalog.description(TemplateType.RENT_RECEIPT, "bailleur.nom")).isEqualTo("Nom du bailleur");
        assertThat(TemplateCatalog.description(TemplateType.RENT_RECEIPT, "inconnue")).isNull();
    }
}
