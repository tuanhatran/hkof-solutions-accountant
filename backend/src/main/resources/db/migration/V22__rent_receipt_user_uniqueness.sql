-- Rent receipt versions are numbered per account, but natural persons are still shared between
-- accounts until person scoping lands. The former unique index on (billing_month, landlord_id,
-- tenant pair, version) was global, so a second account reusing a shared landlord/tenant pair for
-- the same month restarted at version 1 and collided. Scope the uniqueness to the owner first:
-- versions restart per account, while a duplicate inside one account stays rejected.

DROP INDEX uq_rent_receipt_month_tenant_version;

CREATE UNIQUE INDEX uq_rent_receipt_user_month_tenant_version ON rent_receipt (
    user_id,
    billing_month,
    landlord_id,
    COALESCE(tenant_id, 0),
    COALESCE(tenant_company_id, 0),
    version
);
