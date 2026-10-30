-- Cross-user company leases: a landlord may link a corporate tenant (company) owned by
-- another account. Active-company uniqueness must stay scoped to the landlord's account,
-- never global, otherwise a second account could not reference the same company. V11 and
-- V23 already replaced the legacy global indexes; this migration re-asserts that ownership
-- scope explicitly and drops any leftover global one-company index. It also supports the
-- read-only cross-account public-identity resolution by company.

DROP INDEX IF EXISTS ux_lease_company_active;
DROP INDEX IF EXISTS ux_lease_user_active_company;

CREATE UNIQUE INDEX ux_lease_user_active_company ON lease (user_id, landlord_id, company_id)
    WHERE NOT deleted AND company_lease;

CREATE INDEX ix_lease_company_user_deleted ON lease (company_id, user_id, deleted);
