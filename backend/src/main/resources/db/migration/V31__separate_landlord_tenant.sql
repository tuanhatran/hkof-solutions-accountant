-- Split natural persons into landlords and tenants. The person table keeps one row per
-- human being: only the discriminator changes, so leases, receipts and signatures keep
-- their identifiers. Employees stay EMPLOYEE and tenants reuse the existing person.email
-- column created by V10; no column is added.

-- The V10 check only accepts PERSON and EMPLOYEE shapes, so it is dropped before the
-- discriminator backfill and recreated below with the new landlord and tenant shapes.
ALTER TABLE person DROP CONSTRAINT IF EXISTS ck_person_kind;

-- 1. Every former natural person becomes a landlord by default.
UPDATE person SET kind = 'LANDLORD' WHERE kind = 'PERSON';

-- 2. A person referenced as a tenant, without any landlord or signature reference, becomes
--    a tenant. A person who is both a landlord and a tenant somewhere keeps the landlord
--    kind: the landlord role carries the stricter shape (no email).
UPDATE person p SET kind = 'TENANT'
WHERE p.kind = 'LANDLORD'
  AND (EXISTS (SELECT 1 FROM lease l WHERE l.tenant_id = p.id)
       OR EXISTS (SELECT 1 FROM lease_tenant lt WHERE lt.person_id = p.id)
       OR EXISTS (SELECT 1 FROM rent_receipt r WHERE r.tenant_id = p.id))
  AND NOT EXISTS (SELECT 1 FROM lease l WHERE l.landlord_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM rent_receipt r WHERE r.landlord_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM signature s WHERE s.person_id = p.id);

-- 3. Tenants may carry an email; landlords and legacy persons keep the natural-person shape.
ALTER TABLE person ADD CONSTRAINT ck_person_kind CHECK (
    (kind IN ('PERSON', 'LANDLORD') AND name IS NOT NULL AND company_id IS NULL
        AND first_name IS NULL AND last_name IS NULL AND email IS NULL AND title IS NULL)
    OR (kind = 'TENANT' AND name IS NOT NULL AND company_id IS NULL
        AND first_name IS NULL AND last_name IS NULL AND title IS NULL)
    OR (kind = 'EMPLOYEE' AND name IS NULL AND company_id IS NOT NULL AND first_name IS NOT NULL
        AND last_name IS NOT NULL AND title IS NOT NULL)
);
