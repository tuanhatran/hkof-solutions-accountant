-- Cross-user rent receipts: a landlord's account stores the receipt, while the tenant
-- company belongs to another account. Received reads filter by tenant company and month,
-- ignoring receipts the current account issued itself, so the lookup gets a partial index
-- that keeps the access path small on the shared rent_receipt table.
CREATE INDEX ix_rent_receipt_tenant_company_month
    ON rent_receipt (tenant_company_id, billing_month, status)
    WHERE tenant_company_id IS NOT NULL;
