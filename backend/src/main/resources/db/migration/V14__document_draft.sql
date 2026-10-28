-- Editable form drafts of the two generation pages. A draft is never a document: it
-- stores validated form values as JSON. One scope keeps one active draft; each save
-- inserts a new row and logically deletes the previous active row.
CREATE TABLE document_draft (
    id BIGSERIAL PRIMARY KEY,
    draft_type VARCHAR(20) NOT NULL,
    billing_month VARCHAR(7) NOT NULL,
    company_id BIGINT,
    landlord_id BIGINT,
    tenant_id BIGINT,
    tenant_company_id BIGINT,
    payload TEXT NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_document_draft_rent_scope
    ON document_draft (billing_month, landlord_id, tenant_id, tenant_company_id)
    WHERE NOT deleted AND draft_type = 'RENT_RECEIPT';

CREATE INDEX ix_document_draft_statement_scope
    ON document_draft (billing_month, company_id)
    WHERE NOT deleted AND draft_type = 'EXPENSE_STATEMENT';
