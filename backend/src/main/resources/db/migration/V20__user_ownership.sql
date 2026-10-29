-- Every company, lease, expense item, address and employee row belongs to one account.
-- Existing rows are backfilled to the seeded thtran account, which V20 creates when it does
-- not exist yet (a fresh database runs this before DataInitializer). Natural persons stay
-- unowned until the person scoping task; employee rows share the person table and are
-- backfilled here. Siren and address-label uniqueness become per account, the company-scoped
-- uniqueness of expense items and employees stays.

INSERT INTO app_user (email, password_hash, confirmed, must_change_password, created_at, updated_at)
SELECT 'thtran@homeofficeexpenses.local',
       '$2b$10$phs/icYKtJRDziFoc45lsuAluRvripCmZDESRW4jnVJAkYOBTO6yu',
       TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local'
);

ALTER TABLE company ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE lease ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE expense_item ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE address ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE person ADD COLUMN user_id BIGINT REFERENCES app_user (id);

UPDATE company
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE lease
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE expense_item
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE address
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE person
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
WHERE kind = 'EMPLOYEE';

ALTER TABLE company ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE lease ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expense_item ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE address ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX ix_company_user_deleted_name ON company (user_id, deleted, name);
CREATE INDEX ix_lease_user_deleted ON lease (user_id, deleted);
CREATE INDEX ix_expense_item_user_company_deleted ON expense_item (user_id, company_id, deleted);
CREATE INDEX ix_address_user_deleted_label ON address (user_id, deleted, label);
CREATE INDEX ix_person_user_kind_deleted ON person (user_id, kind, deleted);

-- A SIREN is unique per account now, on active rows only.
CREATE UNIQUE INDEX ux_company_user_siren ON company (user_id, siren)
    WHERE siren IS NOT NULL AND NOT deleted;

-- Address labels stay unique per account, case-insensitively, on active rows only.
DROP INDEX IF EXISTS ux_address_label_active;
CREATE UNIQUE INDEX ux_address_user_label_active ON address (user_id, lower(label)) WHERE NOT deleted;
