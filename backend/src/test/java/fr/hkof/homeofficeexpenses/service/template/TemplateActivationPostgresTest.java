package fr.hkof.homeofficeexpenses.service.template;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import fr.hkof.homeofficeexpenses.domain.TemplateDocument;
import fr.hkof.homeofficeexpenses.domain.TemplateType;
import fr.hkof.homeofficeexpenses.repository.TemplateDocumentRepository;
import fr.hkof.homeofficeexpenses.web.dto.Dtos.TemplateDto;

/**
 * Regression guard for the PostgreSQL partial unique index {@code ux_template_active}:
 * activating a new template version must deactivate the previous one before flushing the
 * new active row. H2 does not enforce partial unique indexes, so this test requires a real
 * PostgreSQL container and the Flyway migrations.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
@ActiveProfiles("test")
class TemplateActivationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private TemplateService templateService;

    @Autowired
    private TemplateDocumentRepository repository;

    @Test
    @DisplayName("Activating a second version keeps exactly one active template per type")
    void activatesSecondVersionWithPartialUniqueIndex() {
        byte[] html = templateService.defaultFile(TemplateType.RENT_RECEIPT);
        TemplateDto uploaded = templateService.upload(TemplateType.RENT_RECEIPT, "Quittance test",
                new MockMultipartFile("file", "quittance-test.html", "text/html", html));

        TemplateDto activated = templateService.activate(uploaded.id());

        assertThat(activated.active()).isTrue();
        assertThat(activeTemplateIds()).containsExactly(uploaded.id());

        TemplateDto reset = templateService.reset(TemplateType.RENT_RECEIPT);

        assertThat(reset.active()).isTrue();
        assertThat(activeTemplateIds()).hasSize(1);
        assertThat(reset.id()).isNotEqualTo(uploaded.id());
    }

    private List<Long> activeTemplateIds() {
        return repository.findByTypeAndActiveTrueAndDeletedFalse(TemplateType.RENT_RECEIPT).stream()
                .map(TemplateDocument::getId)
                .toList();
    }
}
