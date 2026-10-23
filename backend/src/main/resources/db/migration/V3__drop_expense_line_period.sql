-- An expense line no longer carries an invoice period: the monthly amount is the invoice
-- amount (or its override) and it is fully claimed for the statement month.
-- Existing period values are dropped on purpose (accepted data loss).
ALTER TABLE expense_line
    DROP COLUMN period_start,
    DROP COLUMN period_end;
