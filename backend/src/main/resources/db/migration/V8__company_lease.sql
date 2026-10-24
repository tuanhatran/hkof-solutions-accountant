-- Move the dwelling data to the lease. A company may be linked to at most one active
-- lease; that lease carries the surfaces used by the company pro-rata. The company
-- columns stay in place as a rollback aid for one task.

ALTER TABLE lease ADD COLUMN company_lease BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE lease ADD COLUMN total_area NUMERIC(8, 2);
ALTER TABLE lease ADD COLUMN business_area NUMERIC(8, 2);

-- Copy the legacy dwelling data of each company onto its lowest active lease and mark
-- that lease as a company lease.
UPDATE lease l
SET company_lease = TRUE,
    total_area = c.total_area,
    business_area = c.business_area
FROM company c
WHERE l.company_id = c.id
  AND NOT l.deleted
  AND l.id = (
      SELECT MIN(l2.id)
      FROM lease l2
      WHERE l2.company_id = c.id
        AND NOT l2.deleted
  );

-- A company keeps only one active lease: extra links are cleared, the lease rows remain.
UPDATE lease l
SET company_id = NULL
WHERE l.company_id IS NOT NULL
  AND NOT l.deleted
  AND l.id <> (
      SELECT MIN(l2.id)
      FROM lease l2
      WHERE l2.company_id = l.company_id
        AND NOT l2.deleted
  );

CREATE UNIQUE INDEX ux_lease_company_active
    ON lease (company_id)
    WHERE company_id IS NOT NULL AND NOT deleted;
