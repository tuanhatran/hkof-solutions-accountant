# 102 - BACKEND-SEPARATE-LANDLORD-AND-TENANT-MODEL-AND-API

Status: DONE
Branch: feat/102-backend-separate-landlord-and-tenant-model-and-api
Base: 9208826
Size: L
Round: 0/2

## Goal

Separate natural persons into `Landlord` and `Tenant` subtypes over the existing `person` SINGLE_TABLE (`kind`), add Flyway `V31__separate_landlord_tenant.sql`, expose `/api/landlords` and `/api/tenants` in `openapi/openapi.yaml`, and keep `/api/persons` and lease creation backward compatible. Out of scope: employee endpoints and all frontend files (103 regenerates `schema.ts`).

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Person,Employee,Lease,LeaseTenant}.java,repository/{SignatureRepository,LeaseRepository}.java,service/{OwnershipContext,LeaseMapper}.java}`.
Writable contract: `openapi/openapi.yaml`.
Writable backend:
- `backend/src/main/resources/db/migration/V31__separate_landlord_tenant.sql`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Landlord,Tenant,Person}.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/repository/{LandlordRepository,TenantRepository,PersonRepository}.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{LandlordService,TenantService,PersonService,LeaseService,LeaseTenantBinder}.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/web/{LandlordController,TenantController,PersonController}.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/web/dto/{LandlordDtos,TenantDtos,RentConfigurationDtos}.java`
- `backend/src/main/java/fr/hkof/homeofficeexpenses/config/ModuleAccessFilter.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/service/{LandlordServiceTest,TenantServiceTest,PersonServiceTest,LeaseServiceTest,PersonMigrationPostgresTest}.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/domain/MultiTenantLeaseTest.java`
- `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{LandlordIntegrationTest,TenantIntegrationTest}.java`
Affected tests: `service/{PersonServiceTest,LeaseServiceTest,PersonMigrationPostgresTest}.java`, `domain/MultiTenantLeaseTest.java`.
Touched E2E: `none`.

## Constraints

YAML first, then backend · `kind` LANDLORD/TENANT/EMPLOYEE/PERSON; Landlord/Tenant extend Person; Tenant exposes the shared `person.email` column already created by V10 — do not add a duplicate column (moving the mapping to Person is allowed if Hibernate requires it) · V31 backfills `lease.landlord_id`/signature-linked rows to LANDLORD, `lease.tenant_id`/`lease_tenant.person_id` rows to TENANT, unlinked PERSON rows to LANDLORD, EMPLOYEE rows stay EMPLOYEE · `PersonRepository.findAllNaturalPersons`/`findNaturalPersonById` must cover every non-employee kind (LANDLORD/TENANT/PERSON), not only `kind='PERSON'` · `/api/persons` keeps listing/mutating non-employee kinds and creates a LANDLORD by default · `LeaseService`/`LeaseTenantBinder` reject a tenant as landlord and a landlord as tenant · `ModuleAccessFilter` gates `/api/landlords` and `/api/tenants` with LMNP like `/api/persons` · services owner-scoped through `OwnershipContext`; logical deletion only · classes < 300 lines · commit once, no push.

## Acceptance

- [ ] V31 reuses `person.email`, backfills LANDLORD/TENANT and preserves EMPLOYEE; the PostgreSQL migration test covers each case.
- [ ] `/api/landlords` and `/api/tenants` expose full CRUD (landlord: name, address, phone, addressNote, issuePlace, signatures; tenant: name, address, phone, email, addressNote) and return 403 when LMNP is disabled.
- [ ] `/api/persons` remains operational; lease create/update enforces the landlord/tenant kinds.
- [ ] Existing person, lease and multi-tenant tests stay green; new tests are red-then-green.
- [ ] `cd backend && ./mvnw -B verify` green; `scripts/diff-coverage.sh 9208826 backend` >= 80%; `E2E: skipped (no touched spec)`.

## Commands

Run once, at the end:
- backend: `cd backend && ./mvnw -B verify`
- coverage: `scripts/diff-coverage.sh 9208826 backend` (>= 80% changed lines)
- e2e: `E2E: skipped (no touched spec)`

## Evidence

(Append one line per event; never rewrite a previous line)

- Contract first: `openapi/openapi.yaml` +37 new paths/schemas: `/api/landlords`, `/api/landlords/{id}`, `/api/tenants`, `/api/tenants/{id}`, schemas `LandlordRequest/LandlordDto/TenantRequest/TenantDto`; `/api/persons` GET/POST descriptions updated; header 403 note extended (67 paths parsed OK). No frontend/schema.ts change.
- Files: V31__separate_landlord_tenant.sql; domain Landlord, Tenant, Person (email moved from Employee), Employee; repositories LandlordRepository, TenantRepository, PersonRepository (JPQL type(p) <> Employee), LeaseTenantRepository; services LandlordService, TenantService, PersonService, LeaseService, LeaseTenantBinder, E2eResetService; web LandlordController, TenantController, dto LandlordDtos, TenantDtos; config ModuleAccessFilter, DataInitializer.
- RED MultiTenantLeaseTest: "Tenant cannot be resolved to a type" before Tenant entity existed -> GREEN 5 tests.
- RED PersonMigrationPostgresTest.splitsLandlordsAndTenants: V31 failed `violates check constraint "ck_person_kind"` -> GREEN after dropping/recreating constraint (10 LANDLORD/TENANT assertions, 1 email column).
- RED LeaseServiceTest.rejectsWrongPartyKinds + Landlord/TenantService/Integration tests (new, 5+5+3+3) -> GREEN 16 tests.
- FAIL targeted run: 3 regressions (ApiIntegrationTest.addressesAreListedAndReused, ApiIntegrationTest.fullFlow, UserIsolationIntegrationTest.linksForeignCompanyBySiren) 400 LEASE_LANDLORD_INVALID; root cause Hibernate lazy Person proxy on lease FK defeats instanceof; fixed with `Hibernate.unproxy()` in LeaseService.landlord() and LeaseTenantBinder.party(); debug `MockMvcResultHandlers.print()` lines removed.
- PASS `./mvnw -B test -Dtest='ApiIntegrationTest,UserIsolationIntegrationTest,LandlordServiceTest,TenantServiceTest,PersonServiceTest,LeaseServiceTest,LandlordIntegrationTest,TenantIntegrationTest,ModuleAccessIntegrationTest'`: Tests run 62, failures 0.
- PASS `codegraph sync`: 466 references resolved.
- PASS line limits: largest changed production file LeaseService 282 lines (< 300).
- PASS `cd backend && ./mvnw -B verify`: Tests run 694, Failures 0, Errors 0, Skipped 1, BUILD SUCCESS (first run had 7 MultiLeaseExpenseMigrationPostgresTest errors from a dead Testcontainers port 52852; rerun of both Postgres test classes 12/12 green, full verify then green — infrastructure flake, not code).
- PASS `scripts/diff-coverage.sh 9208826 backend`: 127 changed lines, 0 missing, 100% (>= 80%).
- PASS `git diff --check`: exit 0, no whitespace errors. No frontend files touched, so frontend gates not applicable.
- E2E: skipped (no touched spec).
- Contract impact: additive only; `/api/persons` now creates a LANDLORD and lists all non-employee kinds, so frontend tenant creation must move to `/api/tenants` (task 103).
- Deviations (outside handoff writable list): LeaseTenantRepository (+existsByPersonIdAndLeaseDeletedFalse), Employee (email moved to Person base), DataInitializer (creates Landlord), E2eResetService (seeds Tenant), and 7 existing test classes switched tenant creation from `/api/persons` to `/api/tenants` (ApiIntegrationTest, UserIsolationIntegrationTest, RentReceiptCrossUserIntegrationTest, CompanyLeaseIntegrationTest, UserDocumentIsolationIntegrationTest, E2eResetIntegrationTest, ModuleAccessIntegrationTest).
- Commit: 1bec1e7 37 files +1610/-84
- 2026-10-31 lead: VERDICT: PASS (reviewer, round 1)
- 2026-10-31 lead: DONE — user accepted
