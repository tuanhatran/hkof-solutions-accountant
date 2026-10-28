package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import fr.hkof.homeofficeexpenses.domain.DocumentDraft;
import fr.hkof.homeofficeexpenses.repository.DocumentDraftRepository;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.RentReceiptDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftDto;
import fr.hkof.homeofficeexpenses.web.dto.DocumentDraftDtos.StatementDraftRequest;
import fr.hkof.homeofficeexpenses.web.dto.StatementDtos.ExpenseLineRequest;

/**
 * Regression guard for the persisted drafts on a real PostgreSQL instance with the V15
 * partial unique indexes applied: the second save of the same scope must logically
 * delete the previous row before the new insert is flushed, otherwise the unique index
 * rejects the insert (Hibernate flushes inserts before updates).
 */
@SpringBootTest(properties = "app.data-dir=./target/test-data")
@Testcontainers(disabledWithoutDocker = true)
class DocumentDraftPersistencePostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", POSTGRES::getDriverClassName);
    }

    @Autowired
    private DocumentDraftService service;

    @Autowired
    private DocumentDraftRepository repository;

    private static RentReceiptDraftRequest rentReceipt(String month, String rentExclCharges) {
        return new RentReceiptDraftRequest(
                month, 4L, 7L, null,
                month + "-01", month + "-28", rentExclCharges, "50", month + "-05", month + "-05", 9L,
                null);
    }

    private static StatementDraftRequest statement(String month, String amount) {
        return new StatementDraftRequest(
                3L, month, 9L, true,
                List.of(new ExpenseLineRequest("gaz", amount, "100", 5L, "MANUAL", null, null)));
    }

    @Test
    @DisplayName("A second rent receipt save replaces the active draft despite the V15 unique index")
    void replacesRentReceiptDraftOnPostgres() {
        RentReceiptDraftDto first = service.saveRentReceipt(rentReceipt("2026-01", "1 300,00"));
        RentReceiptDraftDto second = service.saveRentReceipt(rentReceipt("2026-01", "1 450,00"));

        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(second.rentExclCharges()).isEqualTo("1450.00");

        List<DocumentDraft> rows = repository.findAll().stream()
                .filter(draft -> draft.getType() == DocumentDraft.Type.RENT_RECEIPT)
                .filter(draft -> "2026-01".equals(draft.getMonth()))
                .filter(draft -> Long.valueOf(4L).equals(draft.getLandlordId()))
                .filter(draft -> Long.valueOf(7L).equals(draft.getTenantId()))
                .toList();
        assertThat(rows).hasSize(2);
        assertThat(rows).filteredOn(draft -> !draft.isDeleted()).singleElement()
                .satisfies(active -> {
                    assertThat(active.getId()).isEqualTo(second.id());
                    assertThat(active.getPayload()).contains("\"rentExclCharges\":\"1450.00\"");
                });
    }

    @Test
    @DisplayName("A second expense statement save replaces the active draft despite the V15 unique index")
    void replacesStatementDraftOnPostgres() {
        StatementDraftDto first = service.saveStatement(statement("2026-01", "80,00"));
        StatementDraftDto second = service.saveStatement(statement("2026-01", "95,00"));

        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(second.lines()).singleElement()
                .satisfies(line -> assertThat(line.amountInclVat()).isEqualTo("95.00"));

        List<DocumentDraft> rows = repository.findAll().stream()
                .filter(draft -> draft.getType() == DocumentDraft.Type.EXPENSE_STATEMENT)
                .filter(draft -> "2026-01".equals(draft.getMonth()))
                .filter(draft -> Long.valueOf(3L).equals(draft.getCompanyId()))
                .toList();
        assertThat(rows).hasSize(2);
        assertThat(rows).filteredOn(draft -> !draft.isDeleted()).singleElement()
                .satisfies(active -> {
                    assertThat(active.getId()).isEqualTo(second.id());
                    assertThat(active.getPayload()).contains("\"amountInclVat\":\"95.00\"");
                });
    }

    @Test
    @DisplayName("Generation cleanup still soft-deletes the active draft on PostgreSQL")
    void clearsActiveRentReceiptDraftOnPostgres() {
        service.saveRentReceipt(rentReceipt("2026-05", "1 300,00"));

        service.deleteActiveRentReceipt("2026-05", 4L, 7L, null);

        assertThat(repository.findAll().stream()
                .filter(draft -> draft.getType() == DocumentDraft.Type.RENT_RECEIPT)
                .filter(draft -> "2026-05".equals(draft.getMonth()))
                .toList())
                .singleElement()
                .satisfies(draft -> assertThat(draft.isDeleted()).isTrue());
    }
}
