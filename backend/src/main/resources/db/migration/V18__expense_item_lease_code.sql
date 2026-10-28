-- Expense-item codes are unique per lease scope, not per company: two leases of the same
-- company may own the same code and the statement calculation resolves the item of the
-- selected lease. COALESCE(lease_id, 0) keeps the inherited NULL scope distinct from every
-- real lease (a lease id is never 0) and legacy rows keep their scope. Deleted rows still
-- reserve their code, and the old company-wide constraint is removed so duplicates across
-- leases become possible.
ALTER TABLE expense_item DROP CONSTRAINT uq_expense_item_company_code;
CREATE UNIQUE INDEX uq_expense_item_company_lease_code
    ON expense_item (company_id, COALESCE(lease_id, 0), code);
