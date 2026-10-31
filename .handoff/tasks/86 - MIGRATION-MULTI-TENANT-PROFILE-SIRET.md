# 86 - MIGRATION-MULTI-TENANT-PROFILE-SIRET

Status: DONE
Branch: feat/86-migration-multi-tenant-profile-siret
Base: 0185fd5
Size: L
Round: 1/2

## Goal

Add Flyway V29 (`lease_tenant` join table, `person.phone`/`address_note`, `company.siret`, `app_user.onboarding_completed`) and map it in JPA so one lease can carry several tenants. Out of scope: service, contract and frontend work (tasks 87-90), money path.

## Files

Context (read only): `backend/src/main/resources/db/migration/{V19__auth.sql,V23__person_signature_ownership.sql,V27__cross_user_company_lease.sql,V28__cross_user_rent_receipt.sql}`, `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Lease.java,Person.java,Company.java,AppUser.java}`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/CrossUserCompanyLeaseMigrationPostgresTest.java` (Testcontainers + Flyway `target` pattern).
Writable backend: `backend/src/main/resources/db/migration/V29__multi_tenant_leases_and_user_profile.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{LeaseTenant.java,Lease.java,Person.java,Company.java,AppUser.java},repository/LeaseTenantRepository.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/service/MultiTenantMigrationPostgresTest.java`.
Symbols: `LeaseTenant` (`lease`, `person`, `primary`), `Lease.getTenants()`, `Person.getPhone()/getAddressNote()`, `Company.getSiret()`, `AppUser.isOnboardingCompleted()`.
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{LeaseServiceTest.java,CrossUserCompanyLeaseMigrationPostgresTest.java},web/{MultiLeaseExpensesIntegrationTest.java,RentReceiptCrossUserIntegrationTest.java}}`.
Touched E2E: `none`

## Constraints

Migration + entities only; never edit V1-V28 · backfill `INSERT INTO lease_tenant (lease_id, person_id, is_primary) SELECT id, tenant_id, TRUE FROM lease WHERE tenant_id IS NOT NULL` · after adding `onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE`, run `UPDATE app_user SET onboarding_completed = TRUE` so existing accounts are never redirected by the later guard; new registrations stay FALSE · keep `lease.tenant_id` as the primary tenant (`is_primary = TRUE`) · drop `ux_lease_user_active_pair`, add unique `ux_lease_tenant_pair (lease_id, person_id)`; add no unique index on `lease.address_id` (several leases per address must stay allowed) · production classes < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [ ] V29 runs on real PostgreSQL; `lease_tenant`, `person.phone`, `person.address_note`, `company.siret`, `app_user.onboarding_completed` exist after V29 and not at V28.
- [ ] Legacy leases are backfilled with `is_primary = TRUE`; existing users end with `onboarding_completed = TRUE`.
- [ ] Two leases can share one `address_id`; one lease accepts 2+ tenants; a duplicate `(lease_id, person_id)` is rejected; `ux_lease_user_active_pair` is gone.
- [ ] `MultiTenantMigrationPostgresTest` is genuinely red before V29 (asserts V28 absence, not only post-migration success) and green after.
- [ ] Backend + frontend gates pass; changed-line coverage backend >= 80%.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 0185fd5 backend` · E2E: skipped (no touched spec).

## Evidence

- Files: V29__multi_tenant_leases_and_user_profile.sql; domain/{LeaseTenant(new),Lease,Person,Company,AppUser}; repository/LeaseTenantRepository(new); tests service/MultiTenantMigrationPostgresTest(new), service/UserOwnershipMigrationPostgresTest(V23 case scoped to target 23), domain/MultiTenantLeaseTest(new).
- Red->green: MultiTenantMigrationPostgresTest RED (Flyway "No migration with a target version 29" after the V28 absence assertions passed) -> GREEN 1/1 after V29.
- PASS `cd backend && ./mvnw -B verify` - 645 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS.
- PASS `cd frontend && npm run test:coverage` - 72 files, 992 tests passed, 96.54% lines.
- PASS `cd frontend && npm run lint` - no error.
- PASS `cd frontend && npm run format:check` - all files Prettier-clean.
- PASS `cd frontend && npm run build` - built in 1.34s, dist assets emitted.
- PASS `scripts/diff-coverage.sh 0185fd5 backend` - 27 changed lines, 0 missing, 100% (>= 80%).
- PASS `git diff --check` - clean. All production classes < 300 lines (max 198).
- E2E: skipped (no touched spec).
- Deviations: dropping ux_lease_user_active_pair required scoping the V23 case of UserOwnershipMigrationPostgresTest to target 23 (assertions unchanged). Two full verify runs hit transient Testcontainers "connection refused" on unrelated classes (green in isolation); final run green.
- Contract impact: none (openapi untouched).
- Commit: 1cdc636 10 files +453/-1
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — V29 backfills, pair-uniqueness swap and JPA mapping match the goal; V28-absence red evidence is genuine. Note: `phone`/`siret` columns are `VARCHAR(50)`/`VARCHAR(20)` (spec said 30/14); harmless laxity, service validation enforces 14 digits — recorded as a deviation.
- 2026-10-31 lead: DONE — user accepted
