-- Expense statements and their drafts become scoped by company + month + lease, so
-- generating lease A never archives, versions or clears lease B. Legacy rows keep
-- lease_id NULL and form their own scope; COALESCE(lease_id, 0) keeps NULL distinct
-- from real ids in the unique indexes (a real lease id is never 0).
ALTER TABLE document_draft ADD COLUMN lease_id BIGINT;
CREATE INDEX ix_document_draft_lease ON document_draft (lease_id);

ALTER TABLE expense_statement DROP CONSTRAINT uq_expense_statement_company_month_version;
DROP INDEX ux_expense_statement_active;
CREATE UNIQUE INDEX uq_expense_statement_company_month_lease_version
    ON expense_statement (company_id, billing_month, COALESCE(lease_id, 0), version);
CREATE UNIQUE INDEX ux_expense_statement_active
    ON expense_statement (company_id, billing_month, COALESCE(lease_id, 0))
    WHERE status = 'ACTIVE';

DROP INDEX ux_document_draft_statement_scope;
CREATE UNIQUE INDEX ux_document_draft_statement_scope
    ON document_draft (billing_month, company_id, COALESCE(lease_id, 0))
    WHERE NOT deleted AND draft_type = 'EXPENSE_STATEMENT';
