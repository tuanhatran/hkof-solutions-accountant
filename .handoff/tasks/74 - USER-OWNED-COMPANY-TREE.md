# 74 - USER-OWNED-COMPANY-TREE

Status: DONE · Branch: feat/74-user-owned-company-tree · Base: 150119e · Size: L · Round: 1/2

## Goal

Scope every company, lease, employee, expense-item and address read/write to the authenticated account (new rows stamped, cross-account ids invisible), backfilling existing rows to thtran. Out of scope: Person/Signature API scoping, document ownership and filters, DTO/route shapes, admin gating, password reset.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/AuthService.java (AuthenticatedUser, restoreSeedUser),config/SecurityConfig.java (securityFilterChain),service/PersonService.java,service/SignatureService.java}`, `backend/src/test/resources/application-test.yml`, `frontend/cypress/support/e2e.ts`.
Routes (shapes unchanged, data scoped): `/api/companies`, `/api/leases`, `/api/companies/{id}/employees`, `/api/expense-items`, `/api/addresses`.
Writable backend: `backend/src/main/resources/db/migration/V20__user_ownership.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Company,Lease,Person,ExpenseItem,Address}.java,repository/{Company,Lease,Employee,ExpenseItem,Address}Repository.java,service/{OwnershipContext,Company,Lease,Employee,ExpenseItem,Address,E2eResetService}.java,config/{DataInitializer,OwnershipEntityListener}.java}` (the two new config/service classes only if the chosen stamping design needs them); `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{Company,Lease,Employee,ExpenseItem,Address}ServiceTest.java,service/UserOwnershipMigrationPostgresTest.java,web/UserIsolationIntegrationTest.java,config/DataInitializerTest.java}`.
Affected tests (run all; edit only if they break): `codegraph affected` on the 5 services — `web/{ApiIntegrationTest,CompanyLeaseIntegrationTest,MultiLeaseExpensesIntegrationTest,E2eResetIntegrationTest,DocumentDraftIntegrationTest,ExpenseStatementActiveIntegrationTest,SignatureControllerIntegrationTest,ApiErrorContractIntegrationTest,AuthIntegrationTest}.java`; `service/{DocumentDraftServiceTest,DocumentDraftPersistencePostgresTest,ExpenseStatementServiceTest,ExpenseStatementDocumentServiceTest,ExpenseStatementLineCalculatorTest,RentReceiptServiceTest,template/TemplateDataServiceTest}.java`. Max 40 files; stop and report if exceeded.

## Constraints

Contract: none (ownership server-side; no OpenAPI change, no `gen:api`). Money untouched (`CalculationService` only). `person` is the single table for Employee (SINGLE_TABLE inheritance): `user_id` lives on `Person`, but this task stamps/backfills only employee rows; person and signature scoping plus NOT NULL on non-employee persons belong to task 75. V20 runs before DataInitializer: it must leave a fresh and an upgraded PostgreSQL with every company/lease/expense-item/address and employee row owned by thtran, then enforce NOT NULL and per-user uniqueness (global siren becomes per-user; existing company-scoped uniques stay) — never edit V1–V19. One component resolves the owner from the authenticated principal; with `app.security.enabled=false` it resolves the seeded thtran account (never "all users"), so current web tests keep their data. E2e reset is unauthenticated and must leave the seeded tree owned by `e2e@homeofficeexpenses.local` for the existing specs; it never deletes users. Another account's row is a 404 (`*_NOT_FOUND`), never a leak or a 500; no account id in logs or DTOs. French messages, no `any`, builder commits once with explicit paths, nobody pushes.

## Acceptance

- [x] Two accounts on the same API each list and mutate only their own companies, leases, employees, expense items and addresses; a guessed foreign id yields 404; counts exclude foreign rows.
- [x] Upgraded pre-V20 data is owned by thtran; fresh schema + e2e reset leave seeded configuration owned by the e2e account; `app.security.enabled=false` keeps the existing web tests green.
- [x] Backend gates pass (see Commands): `verify` green, changed-line coverage >= 80%, one full E2E run green; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 150119e backend` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance) · commit once with explicit paths; no push. Frontend and contract untouched: no Vitest/lint gate, no `gen:api`; record `frontend: unchanged` in evidence. Evidence must carry real counts, no retried-only greens.

## Evidence

Append one line per event; never rewrite a previous line.

- Files changed: 28 backend (V20 migration, OwnershipContext, 5 domain entities, 5 repositories, 6 services + DataInitializer, 5 unit tests, 2 new tests, DataInitializerTest, E2eResetIntegrationTest).
- RED UserOwnershipMigrationPostgresTest: Tests run 4, Failures 3, Errors 1 (`user_id` missing; thtran not seeded; NOT NULL/uniques absent).
- GREEN UserOwnershipMigrationPostgresTest: Tests run 2, Failures 0, Errors 0 (V20 backfill, NOT NULL, per-user siren/label, fresh DB).
- RED UserIsolationIntegrationTest: same siren for account B returned 400 COMPANY_SIREN_DUPLICATE; foreign employee/expense lists returned 200.
- GREEN UserIsolationIntegrationTest: Tests run 2, Failures 0, Errors 0 (per-account lists, foreign ids 404 COMPANY/LEASE/EMPLOYEE/EXPENSE_ITEM_NOT_FOUND).
- GREEN targeted unit tests (CompanyServiceTest, LeaseServiceTest, EmployeeServiceTest, ExpenseItemServiceTest, AddressServiceTest, DataInitializerTest): exit 0.
- GREEN E2eResetIntegrationTest rewritten to security-enabled, unauthenticated reset + e2e login/CSRF: Tests run 2, Failures 0, Errors 0.
- PASS codegraph affected regressions: Tests run 276, Failures 0, Errors 0, Skipped 0 (30 files incl. ApiIntegrationTest, AuthIntegrationTest, Postgres draft/persistence tests).
- PASS `cd backend && ./mvnw -B verify`: Tests run 589, Failures 0, Errors 0, Skipped 1, BUILD SUCCESS.
- PASS `scripts/diff-coverage.sh 150119e backend`: 95% changed-line coverage (135 lines, 6 missing; >= 80%).
- PASS `make e2e-up`: exit 0, stack healthy (db, backend, frontend, mailpit, mock-ollama).
- PASS `make e2e`: exit 0, 7/7 specs, 34/34 tests passing, 0 failing/skipped; stack left up, no retry-only green.
- frontend: unchanged (no npm/Vitest/lint/gen:api run); contract: none (no OpenAPI change).
- Class sizes: max 295 lines (DataInitializer 295, LeaseService 295, CompanyService 288, E2eResetService 248, OwnershipContext 35).
- Deviation: E2eResetIntegrationTest (listed affected) rewritten to assert e2e-owned reset under security; DataInitializer.seed split into initUsers + seedData to avoid double user seeding. Natural Person rows keep user_id NULL until task 75, as specified.
- Commit: 9cfdaea 28 files +1059/-268
- 2026-10-29 lead: VERDICT: PASS (reviewer, round 1) — V20 backfill/NOT NULL/per-user indexes verified (seed bcrypt matches `thtran`), fallback unreachable for foreign reads, all five services owner-scoped on ids/lists/uniqueness/cascades, e2e reset owns only the e2e account and deletes no user, new tests genuine red→green. `CompanyService.find` unscoped accepted until task 76 (document name lookup only). Status set to USER_REVIEW.
- 2026-10-29 lead: DONE — user accepted
- 2026-10-29 lead: residual risk (DONE, not reopened): `ux_lease_active_pair` / `ux_lease_active_company` (V5/V10) stay global while persons are shared, so two accounts referencing the same landlord+tenant pair hit the DB constraint (500). Fix with the persons ownership task (per-user index or per-user persons).
