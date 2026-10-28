package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Verifies {@code V15__document_draft_scope_unique.sql} on a real PostgreSQL
 * instance: one active draft per scope, safe with the nullable tenant columns.
 */
@Testcontainers(disabledWithoutDocker = true)
class DocumentDraftMigrationPostgresTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    private static final String RENT_PERSON = """
            INSERT INTO document_draft (draft_type, billing_month, landlord_id, tenant_id, payload, saved_at)
            VALUES ('RENT_RECEIPT', '2026-01', 4, 7, '{}', NOW())
            """;

    private static final String RENT_COMPANY = """
            INSERT INTO document_draft (draft_type, billing_month, landlord_id, tenant_company_id, payload, saved_at)
            VALUES ('RENT_RECEIPT', '2026-01', 4, 7, '{}', NOW())
            """;

    private static final String STATEMENT = """
            INSERT INTO document_draft (draft_type, billing_month, company_id, payload, saved_at)
            VALUES ('EXPENSE_STATEMENT', '2026-01', 3, '{}', NOW())
            """;

    @Test
    @DisplayName("V15 rejects a duplicate active scope and keeps the non-unique indexes' behaviour for deleted rows")
    void enforcesOneActiveDraftPerScope() throws Exception {
        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute(RENT_PERSON);
            assertThatThrownBy(() -> statement.execute(RENT_PERSON)).isInstanceOf(SQLException.class);

            statement.execute(RENT_COMPANY);
            assertThatThrownBy(() -> statement.execute(RENT_COMPANY)).isInstanceOf(SQLException.class);

            statement.execute(STATEMENT);
            assertThatThrownBy(() -> statement.execute(STATEMENT)).isInstanceOf(SQLException.class);

            statement.execute("UPDATE document_draft SET deleted = TRUE");
            statement.execute(RENT_PERSON);
            statement.execute(RENT_COMPANY);
            statement.execute(STATEMENT);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private void migrate() {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .load()
                .migrate();
    }
}
