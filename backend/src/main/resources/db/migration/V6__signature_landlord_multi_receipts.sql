-- Link every LANDLORD signature to its landlord. The link is nullable so legacy
-- signatures created before the landlord directory existed stay usable as a fallback.
ALTER TABLE signature ADD COLUMN landlord_id BIGINT REFERENCES landlord (id);
CREATE INDEX ix_signature_landlord ON signature (landlord_id);

-- Ambiguous databases keep their LANDLORD signatures unlinked: only backfill when there is
-- exactly one non-deleted landlord to choose from.
UPDATE signature
SET landlord_id = (SELECT id FROM landlord WHERE NOT deleted)
WHERE type = 'LANDLORD'
  AND landlord_id IS NULL
  AND (SELECT COUNT(*) FROM landlord WHERE NOT deleted) = 1;

-- Several receipts may now stay ACTIVE in the same month: versions are per landlord and
-- tenant pair, never per month.
ALTER TABLE rent_receipt DROP CONSTRAINT uq_rent_receipt_billing_month_version;
DROP INDEX ux_rent_receipt_active;
CREATE UNIQUE INDEX uq_rent_receipt_month_pair_version
    ON rent_receipt (billing_month, landlord_id, tenant_id, version);
