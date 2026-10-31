package fr.hkof.homeofficeexpenses.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Verifies {@code V20__user_ownership.sql} on a real PostgreSQL instance: pre-V20 companies,
 * leases, expense items, addresses and employees are backfilled to thtran, the ownership
 * columns become mandatory, and the siren and address-label uniqueness become per account.
 * A fresh database must also migrate to latest with every seeded row owned by thtran.
 */
@Testcontainers(disabledWithoutDocker = true)
class UserOwnershipMigrationPostgresTest {

    private static final String THTRAN_EMAIL = "thtran@homeofficeexpenses.local";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @Test
    @DisplayName("V20 backfills the company tree to thtran and enforces per-account uniqueness")
    void backfillsLegacyRows() throws Exception {
        resetSchema();
        migrateTo("19");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
                    VALUES ('thtran@homeofficeexpenses.local', 'seed', TRUE, TRUE, NOW(), NOW())
                    """);
            statement.execute("""
                    INSERT INTO company (id, name, siren, deleted, created_at)
                    VALUES (2, 'Ancienne société', '111 222 333', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO address (id, label, deleted, created_at)
                    VALUES (1, '1 rue Ancienne', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO person (id, kind, name, deleted, created_at)
                    VALUES (100, 'PERSON', 'Bailleur ancien', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO person (id, kind, company_id, first_name, last_name, title, deleted, created_at)
                    VALUES (101, 'EMPLOYEE', 1, 'Ancien', 'Salarié', 'CEO', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO lease (id, landlord_id, company_id, company_lease, address_id,
                        rent_excl_charges, charges, deleted, created_at)
                    VALUES (1, 100, 1, TRUE, 1, 1300.00, 0.00, FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO expense_item (id, company_id, code, label, pro_rata_pct, periodicity,
                        active, sort_order, multiple_lines_allowed, deleted)
                    VALUES (1, 1, 'gaz', 'Gaz', 35.71, 'MONTHLY', TRUE, 10, FALSE, FALSE)
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            assertThat(singleLong(statement, "SELECT user_id FROM company WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM company WHERE id = 2")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM lease WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM expense_item WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM address WHERE id = 1")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM person WHERE id = 101")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM person WHERE id = 100")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM person WHERE user_id IS NULL")).isZero();

            for (String table : List.of("company", "lease", "expense_item", "address", "person", "signature")) {
                assertThat(singleLong(statement, """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = '%s' AND column_name = 'user_id' AND is_nullable = 'NO'
                        """.formatted(table))).isEqualTo(1);
            }

            long other = insertOtherUser(statement);
            statement.execute("""
                    INSERT INTO company (id, name, siren, user_id, deleted, created_at)
                    VALUES (10, 'Autre société', '111 222 333', %d, FALSE, NOW())
                    """.formatted(other));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO company (id, name, siren, user_id, deleted, created_at)
                    VALUES (11, 'Doublon', '111 222 333', %d, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);

            statement.execute("""
                    INSERT INTO address (id, label, user_id, deleted, created_at)
                    VALUES (10, '1 rue Ancienne', %d, FALSE, NOW())
                    """.formatted(other));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO address (id, label, user_id, deleted, created_at)
                    VALUES (11, '1 RUE ANCIENNE', %d, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("A fresh database migrates to latest with every seeded row owned by thtran")
    void migratesFreshDatabase() throws Exception {
        resetSchema();
        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, """
                    SELECT COUNT(*) FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local'
                    """)).isEqualTo(1);
            long owner = ownerId(statement, THTRAN_EMAIL);
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM company WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM company WHERE user_id = " + owner))
                    .isEqualTo(singleLong(statement, "SELECT COUNT(*) FROM company"));
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM person WHERE kind = 'EMPLOYEE'"))
                    .isEqualTo(singleLong(statement, """
                            SELECT COUNT(*) FROM person WHERE kind = 'EMPLOYEE' AND user_id = %d
                            """.formatted(owner)));
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM person WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM person WHERE user_id = " + owner))
                    .isEqualTo(singleLong(statement, "SELECT COUNT(*) FROM person"));
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM signature WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM template_document WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM llm_config WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM receipt WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM document_analysis WHERE user_id IS NULL")).isZero();
            assertThat(singleLong(statement, "SELECT COUNT(*) FROM document_draft WHERE user_id IS NULL")).isZero();
        }
    }

    @Test
    @DisplayName("V23 backfills persons and signatures to their owner or thtran, and scopes lease unique indexes per account")
    void backfillsPersonsAndSignaturesAndScopesLeaseIndexes() throws Exception {
        resetSchema();
        migrateTo("22");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            long other = insertOtherUser(statement);
            statement.execute("""
                    INSERT INTO company (id, name, user_id, deleted, created_at)
                    VALUES (10, 'Société Autre', %d, FALSE, NOW())
                    """.formatted(other));
            statement.execute("""
                    INSERT INTO person (id, kind, name, deleted, created_at)
                    VALUES (200, 'PERSON', 'Bailleur pré-V23', FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO person (id, kind, user_id, company_id, first_name, last_name, title, deleted, created_at)
                    VALUES (201, 'EMPLOYEE', %d, 10, 'Salarié', 'Autre', 'CEO', FALSE, NOW())
                    """.formatted(other));
            statement.execute("""
                    INSERT INTO signature (id, person_id, name, mime_type, image, deleted, created_at)
                    VALUES (300, 200, 'Sig bailleur', 'image/png', '\\x89504e47'::bytea, FALSE, NOW()),
                           (301, 201, 'Sig salarié autre', 'image/png', '\\x89504e47'::bytea, FALSE, NOW()),
                           (302, NULL, 'Sig orpheline supprimée', 'image/png', '\\x89504e47'::bytea, TRUE, NOW())
                    """);
        }

        // Scope to V23: V29 replaces the active-pair index with the lease-tenant join table.
        migrateTo("23");

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            long other = ownerId(statement, "autre@homeofficeexpenses.local");
            assertThat(singleLong(statement, "SELECT user_id FROM person WHERE id = 200")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM person WHERE id = 201")).isEqualTo(other);
            assertThat(singleLong(statement, "SELECT user_id FROM signature WHERE id = 300")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM signature WHERE id = 301")).isEqualTo(other);
            assertThat(singleLong(statement, "SELECT user_id FROM signature WHERE id = 302")).isEqualTo(owner);

            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ix_signature_user_person_deleted'"))
                    .isEqualTo(1);
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('ux_lease_active_pair', 'ux_lease_active_company')"))
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('ux_lease_user_active_pair', 'ux_lease_user_active_company')"))
                    .isEqualTo(2);

            statement.execute("""
                    INSERT INTO person (id, user_id, kind, name, deleted, created_at)
                    VALUES (202, %d, 'PERSON', 'Locataire pré-V23', FALSE, NOW())
                    """.formatted(owner));
            statement.execute("""
                    INSERT INTO address (id, user_id, label, deleted, created_at)
                    VALUES (20, %d, '20 rue Bail', FALSE, NOW())
                    """.formatted(owner));
            statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, tenant_id, company_lease, address_id,
                        rent_excl_charges, charges, deleted, created_at)
                    VALUES (20, %d, 200, 202, FALSE, 20, 900.00, 0.00, FALSE, NOW())
                    """.formatted(owner));
            // Same active landlord/tenant pair under another account is allowed by ux_lease_user_active_pair:
            statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, tenant_id, company_lease, address_id,
                        rent_excl_charges, charges, deleted, created_at)
                    VALUES (21, %d, 200, 202, FALSE, 20, 900.00, 0.00, FALSE, NOW())
                    """.formatted(other));
            // Duplicate inside the same account is rejected:
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, tenant_id, company_lease, address_id,
                        rent_excl_charges, charges, deleted, created_at)
                    VALUES (22, %d, 200, 202, FALSE, 20, 900.00, 0.00, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);

            // Company lease active pair is also per account:
            statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, company_id, company_lease, address_id,
                        rent_excl_charges, charges, total_area, business_area, deleted, created_at)
                    VALUES (23, %d, 200, 1, TRUE, 20, 900.00, 0.00, 70.00, 25.00, FALSE, NOW())
                    """.formatted(owner));
            statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, company_id, company_lease, address_id,
                        rent_excl_charges, charges, total_area, business_area, deleted, created_at)
                    VALUES (24, %d, 200, 1, TRUE, 20, 900.00, 0.00, 70.00, 25.00, FALSE, NOW())
                    """.formatted(other));
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO lease (id, user_id, landlord_id, company_id, company_lease, address_id,
                        rent_excl_charges, charges, total_area, business_area, deleted, created_at)
                    VALUES (25, %d, 200, 1, TRUE, 20, 900.00, 0.00, 70.00, 25.00, FALSE, NOW())
                    """.formatted(owner))).isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("V24 backfills template documents and LLM configs to thtran, scopes unique indexes, and sets identity")
    void backfillsTemplatesAndLlmConfig() throws Exception {
        resetSchema();
        migrateTo("23");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO template_document (id, type, name, version, format, file_path, active, built_in, deleted, created_at)
                    VALUES (10, 'RENT_RECEIPT', 'Modèle legacy', 1, 'HTML', '/legacy/quittance.html', TRUE, TRUE, FALSE, NOW())
                    """);
            statement.execute("""
                    INSERT INTO llm_config (id, active, provider, url, model, extraction_prompt, updated_at)
                    VALUES (1, TRUE, 'OLLAMA', 'http://localhost:11434', 'legacy-model', 'Prompt', NOW())
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            long other = insertOtherUser(statement);

            assertThat(singleLong(statement, "SELECT user_id FROM template_document WHERE id = 10")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM llm_config WHERE id = 1")).isEqualTo(owner);

            for (String table : List.of("template_document", "llm_config")) {
                assertThat(singleLong(statement, """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = '%s' AND column_name = 'user_id' AND is_nullable = 'NO'
                        """.formatted(table))).isEqualTo(1);
            }

            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ux_template_active'"))
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ux_template_user_active'"))
                    .isEqualTo(1);
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ix_template_user_type'"))
                    .isEqualTo(1);
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ux_llm_config_user'"))
                    .isEqualTo(1);

            // Other user can also have an active RENT_RECEIPT template:
            statement.execute("""
                    INSERT INTO template_document (type, name, version, format, file_path, active, built_in, deleted, created_at, user_id)
                    VALUES ('RENT_RECEIPT', 'Modèle autre', 1, 'HTML', '/other/quittance.html', TRUE, TRUE, FALSE, NOW(), %d)
                    """.formatted(other));

            // But same user cannot have two active templates of the same type:
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO template_document (type, name, version, format, file_path, active, built_in, deleted, created_at, user_id)
                    VALUES ('RENT_RECEIPT', 'Modèle doublon', 2, 'HTML', '/owner/quittance2.html', TRUE, FALSE, FALSE, NOW(), %d)
                    """.formatted(owner))).isInstanceOf(SQLException.class);

            // Other user gets their own LLM config:
            statement.execute("""
                    INSERT INTO llm_config (user_id, active, provider, url, extraction_prompt)
                    VALUES (%d, TRUE, 'OLLAMA', 'http://localhost:11434', 'Prompt autre')
                    """.formatted(other));

            // Same user cannot have two LLM configs:
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO llm_config (user_id, active, provider, url, extraction_prompt)
                    VALUES (%d, TRUE, 'OLLAMA', 'http://localhost:11434', 'Prompt doublon')
                    """.formatted(owner))).isInstanceOf(SQLException.class);
        }
    }

    @Test
    @DisplayName("V25 backfills receipts, analyses and drafts to thtran or receipt owner, and scopes draft indexes per account")
    void backfillsReceiptsAnalysesAndDrafts() throws Exception {
        resetSchema();
        migrateTo("24");
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("""
                    INSERT INTO receipt (id, file_name, mime_type, file_path, file_size, created_at, deleted)
                    VALUES (10, 'facture1.pdf', 'application/pdf', '/tmp/facture1.pdf', 100, NOW(), FALSE),
                           (11, 'facture2.pdf', 'application/pdf', '/tmp/facture2.pdf', 200, NOW(), FALSE)
                    """);
            statement.execute("""
                    INSERT INTO document_analysis (id, receipt_id, status, created_at, updated_at)
                    VALUES (20, 10, 'DONE', NOW(), NOW()),
                           (21, 11, 'PENDING', NOW(), NOW())
                    """);
            statement.execute("""
                    INSERT INTO document_draft (id, draft_type, billing_month, landlord_id, tenant_id, payload, saved_at, deleted)
                    VALUES (30, 'RENT_RECEIPT', '2026-01', 4, 7, '{}', NOW(), FALSE)
                    """);
            statement.execute("""
                    INSERT INTO document_draft (id, draft_type, billing_month, company_id, lease_id, payload, saved_at, deleted)
                    VALUES (31, 'EXPENSE_STATEMENT', '2026-01', 3, 5, '{}', NOW(), FALSE)
                    """);
        }

        migrate();

        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            long owner = ownerId(statement, THTRAN_EMAIL);
            long other = insertOtherUser(statement);

            assertThat(singleLong(statement, "SELECT user_id FROM receipt WHERE id = 10")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM receipt WHERE id = 11")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM document_analysis WHERE id = 20")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM document_analysis WHERE id = 21")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM document_draft WHERE id = 30")).isEqualTo(owner);
            assertThat(singleLong(statement, "SELECT user_id FROM document_draft WHERE id = 31")).isEqualTo(owner);

            for (String table : List.of("receipt", "document_analysis", "document_draft")) {
                assertThat(singleLong(statement, """
                        SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_name = '%s' AND column_name = 'user_id' AND is_nullable = 'NO'
                        """.formatted(table))).isEqualTo(1);
            }

            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ix_receipt_user_deleted'"))
                    .isEqualTo(1);
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'ix_document_analysis_user_receipt'"))
                    .isEqualTo(1);
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('ux_document_draft_rent_scope', 'ux_document_draft_statement_scope')"))
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('ux_document_draft_user_rent_scope', 'ux_document_draft_user_statement_scope')"))
                    .isEqualTo(2);

            // Other user can have an active rent receipt draft with the exact same scope:
            statement.execute("""
                    INSERT INTO document_draft (draft_type, billing_month, landlord_id, tenant_id, payload, saved_at, deleted, user_id)
                    VALUES ('RENT_RECEIPT', '2026-01', 4, 7, '{}', NOW(), FALSE, %d)
                    """.formatted(other));

            // But same user cannot have duplicate active rent receipt draft:
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO document_draft (draft_type, billing_month, landlord_id, tenant_id, payload, saved_at, deleted, user_id)
                    VALUES ('RENT_RECEIPT', '2026-01', 4, 7, '{}', NOW(), FALSE, %d)
                    """.formatted(owner))).isInstanceOf(SQLException.class);

            // Other user can have an active expense statement draft with the exact same scope:
            statement.execute("""
                    INSERT INTO document_draft (draft_type, billing_month, company_id, lease_id, payload, saved_at, deleted, user_id)
                    VALUES ('EXPENSE_STATEMENT', '2026-01', 3, 5, '{}', NOW(), FALSE, %d)
                    """.formatted(other));

            // But same user cannot have duplicate active expense statement draft:
            assertThatThrownBy(() -> statement.execute("""
                    INSERT INTO document_draft (draft_type, billing_month, company_id, lease_id, payload, saved_at, deleted, user_id)
                    VALUES ('EXPENSE_STATEMENT', '2026-01', 3, 5, '{}', NOW(), FALSE, %d)
                    """.formatted(owner))).isInstanceOf(SQLException.class);
        }
    }

    private Connection connection() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private Flyway flyway() {
        return Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load();
    }

    private void migrate() {
        flyway().migrate();
    }

    private void migrateTo(String target) {
        Flyway.configure()
                .dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load()
                .migrate();
    }

    private void resetSchema() {
        flyway().clean();
    }

    private long ownerId(Statement statement, String email) throws SQLException {
        return singleLong(statement, "SELECT id FROM app_user WHERE lower(email) = '" + email + "'");
    }

    private long insertOtherUser(Statement statement) throws SQLException {
        statement.execute("""
                INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
                VALUES ('autre@homeofficeexpenses.local', 'seed', TRUE, FALSE, NOW(), NOW())
                """);
        return ownerId(statement, "autre@homeofficeexpenses.local");
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
