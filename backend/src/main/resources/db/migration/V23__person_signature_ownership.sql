-- Every natural person and every signature belongs to one account. Pre-V23 natural person rows
-- without an owner are backfilled to the seeded thtran account, and signature rows inherit the
-- owner of their person (falling back to thtran on legacy deleted rows without a person). Lease
-- active-pair uniqueness becomes per account so two accounts never block each other.

UPDATE person
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE person ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE signature ADD COLUMN user_id BIGINT REFERENCES app_user (id);

UPDATE signature s
SET user_id = p.user_id
FROM person p
WHERE s.person_id = p.id;

UPDATE signature
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE signature ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX ix_signature_user_person_deleted ON signature (user_id, person_id, deleted);

DROP INDEX IF EXISTS ux_lease_active_pair;
DROP INDEX IF EXISTS ux_lease_active_company;

CREATE UNIQUE INDEX ux_lease_user_active_pair ON lease (user_id, landlord_id, tenant_id)
    WHERE NOT deleted AND NOT company_lease;

CREATE UNIQUE INDEX ux_lease_user_active_company ON lease (user_id, landlord_id, company_id)
    WHERE NOT deleted AND company_lease;
