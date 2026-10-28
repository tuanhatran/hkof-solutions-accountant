-- V14 created non-unique scope indexes, so "one active draft per scope" was only a
-- service rule. Enforce it in the database with partial unique indexes. The nullable
-- tenant columns are coalesced so a person scope (tenant_id set) and a company scope
-- (tenant_company_id set) can never collide on NULL semantics.
DROP INDEX IF EXISTS ix_document_draft_rent_scope;
DROP INDEX IF EXISTS ix_document_draft_statement_scope;

CREATE UNIQUE INDEX ux_document_draft_rent_scope
    ON document_draft (billing_month, landlord_id, COALESCE(tenant_id, 0), COALESCE(tenant_company_id, 0))
    WHERE NOT deleted AND draft_type = 'RENT_RECEIPT';

CREATE UNIQUE INDEX ux_document_draft_statement_scope
    ON document_draft (billing_month, company_id)
    WHERE NOT deleted AND draft_type = 'EXPENSE_STATEMENT';
