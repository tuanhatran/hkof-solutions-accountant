-- Every generated document belongs to one account. Rent receipts (with their additional
-- charges) and expense statements (with their lines) are backfilled to the seeded thtran
-- account created by V20, then the owner column becomes mandatory and every read path gets
-- an owner index. The existing version uniqueness indexes stay untouched: statements are
-- already company-scoped and rent receipts stay scoped by person pair until persons are
-- owned by an account.

ALTER TABLE rent_receipt ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE rent_receipt_additional_charge ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE expense_statement ADD COLUMN user_id BIGINT REFERENCES app_user (id);
ALTER TABLE expense_line ADD COLUMN user_id BIGINT REFERENCES app_user (id);

UPDATE rent_receipt
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE rent_receipt_additional_charge
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE expense_statement
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);
UPDATE expense_line
SET user_id = (SELECT id FROM app_user WHERE lower(email) = 'thtran@homeofficeexpenses.local' ORDER BY id LIMIT 1);

ALTER TABLE rent_receipt ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE rent_receipt_additional_charge ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expense_statement ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expense_line ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX ix_rent_receipt_user_month ON rent_receipt (user_id, billing_month);
CREATE INDEX ix_rent_receipt_additional_charge_user_receipt
    ON rent_receipt_additional_charge (user_id, rent_receipt_id);
CREATE INDEX ix_expense_statement_user_company_month ON expense_statement (user_id, company_id, billing_month);
CREATE INDEX ix_expense_line_user_statement ON expense_line (user_id, statement_id);
