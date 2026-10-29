-- Every receipt, document analysis and persisted form draft belongs to one account.
-- Existing rows are backfilled: document_analysis from receipt.user_id with fallback to thtran;
-- receipt and document_draft to thtran.

ALTER TABLE receipt ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE document_analysis ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE document_draft ADD COLUMN user_id BIGINT REFERENCES app_user (id);

UPDATE receipt
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

UPDATE document_analysis da
SET user_id = COALESCE(
    (SELECT r.user_id FROM receipt r WHERE r.id = da.receipt_id),
    (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
)
WHERE user_id IS NULL;

UPDATE document_draft
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE receipt ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE document_analysis ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE document_draft ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX ix_receipt_user_deleted ON receipt (user_id, deleted);
CREATE INDEX ix_document_analysis_user_receipt ON document_analysis (user_id, receipt_id);

DROP INDEX IF EXISTS ux_document_draft_rent_scope;
DROP INDEX IF EXISTS ux_document_draft_statement_scope;

CREATE UNIQUE INDEX ux_document_draft_user_rent_scope
    ON document_draft (user_id, billing_month, landlord_id, COALESCE(tenant_id, 0), COALESCE(tenant_company_id, 0))
    WHERE NOT deleted AND draft_type = 'RENT_RECEIPT';

CREATE UNIQUE INDEX ux_document_draft_user_statement_scope
    ON document_draft (user_id, billing_month, company_id, COALESCE(lease_id, 0))
    WHERE NOT deleted AND draft_type = 'EXPENSE_STATEMENT';
