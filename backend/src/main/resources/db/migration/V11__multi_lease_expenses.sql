-- Multi-lease company expenses: a company can now own several leases and each expense item
-- and expense statement belongs to exactly one of them. Rows inherited from the single-lease
-- model are backfilled onto the company's unique active lease; rows of companies without one
-- stay NULL (unassigned legacy data), and no row is ever deleted. The one-active-lease-per-
-- company index is dropped; the per-pair (landlord, company) uniqueness is kept so the LMNP
-- receipt resolution stays unambiguous.

ALTER TABLE expense_item ADD COLUMN lease_id BIGINT;
ALTER TABLE expense_statement ADD COLUMN lease_id BIGINT;

UPDATE expense_item item
SET lease_id = (
    SELECT l.id
    FROM lease l
    WHERE l.company_id = item.company_id
      AND NOT l.deleted
      AND l.id = (
          SELECT MIN(l2.id)
          FROM lease l2
          WHERE l2.company_id = item.company_id
            AND NOT l2.deleted
      )
)
WHERE item.lease_id IS NULL;

UPDATE expense_statement statement
SET lease_id = (
    SELECT l.id
    FROM lease l
    WHERE l.company_id = statement.company_id
      AND NOT l.deleted
      AND l.id = (
          SELECT MIN(l2.id)
          FROM lease l2
          WHERE l2.company_id = statement.company_id
            AND NOT l2.deleted
      )
)
WHERE statement.lease_id IS NULL;

CREATE INDEX ix_expense_item_lease ON expense_item (lease_id);
CREATE INDEX ix_expense_statement_lease ON expense_statement (lease_id);

DROP INDEX IF EXISTS ux_lease_company_active;
