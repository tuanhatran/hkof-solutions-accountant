-- Active lease selection: a company explicitly stores the lease among those it owns that drives
-- its pro-rata and its expenses. Rows are backfilled with the oldest active lease of the company
-- (the same lowest-id rule V11 used for expense rows), so the switch never changes an existing
-- total. Companies without an active lease keep NULL, and no row is ever deleted.

ALTER TABLE company ADD COLUMN active_lease_id BIGINT;

UPDATE company c
SET active_lease_id = (
    SELECT MIN(l.id)
    FROM lease l
    WHERE l.company_id = c.id
      AND NOT l.deleted
);
