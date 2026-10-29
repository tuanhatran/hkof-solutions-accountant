# 76 - USER-OWNED-PERSONS-SIGNATURES

Status: DONE · Branch: feat/76-user-owned-persons-signatures · Base: d9f9ee2 · Size: L · Round: 1/2

## Goal

Scope every natural person and signature read/write/lookup to the authenticated account, backfill legacy rows to thtran, enforce NOT NULL, and scope lease active-pair unique indexes per account. Out of scope: templates, LLM config, uploaded receipts/analyses/drafts, DTO/route/OpenAPI changes.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{OwnershipContext,EmployeeService,RentReceiptService,ExpenseStatementDocumentService}.java`, `backend/src/main/resources/db/migration/{V10__person_lmnp,V20__user_ownership,V21__document_ownership,V22__rent_receipt_user_uniqueness}.sql`, `backend/src/test/resources/application-test.yml`.
Routes (shapes unchanged, data scoped): `/api/persons` (`GET`, `POST`, `PUT /{id}`, `DELETE /{id}`), `/api/signatures` (`GET ?personId=`, `POST`, `DELETE /{id}`, `GET /{id}/image`).
Writable backend: `backend/src/main/resources/db/migration/V23__person_signature_ownership.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Person,Signature}.java,repository/{Person,Signature}Repository.java,service/{PersonService,SignatureService,LeaseService,CompanyService,RentReceiptMapper,E2eResetService}.java,config/DataInitializer.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{PersonServiceTest,SignatureServiceTest,SignatureServiceEdgeCasesTest,LeaseServiceTest,CompanyServiceTest,RentReceiptServiceTest,UserOwnershipMigrationPostgresTest,UserDocumentOwnershipMigrationPostgresTest,PersonMigrationPostgresTest}.java,web/{UserIsolationIntegrationTest,UserDocumentIsolationIntegrationTest,SignatureControllerIntegrationTest,E2eResetIntegrationTest}.java,config/DataInitializerTest.java}`.
Affected tests (run all; edit only if they break): `codegraph affected` on PersonService, SignatureService, LeaseService, CompanyService, RentReceiptMapper — adds `service/{DocumentDraftPersistencePostgresTest,DocumentDraftServiceTest,EmployeeServiceTest,ExpenseItemServiceTest,ExpenseStatementDocumentServiceTest,ExpenseStatementLineCalculatorTest,ExpenseStatementServiceTest,template/TemplateDataServiceTest}.java`, `web/{ApiErrorContractIntegrationTest,ApiIntegrationTest,AuthIntegrationTest,CompanyLeaseIntegrationTest,DocumentDraftIntegrationTest,ExpenseStatementActiveIntegrationTest,MultiLeaseExpensesIntegrationTest}.java`. Max 40 files; stop and report if exceeded.

## Constraints

Contract: none (ownership server-side; no OpenAPI/DTO/route change, no frontend change, no `gen:api`). Money untouched (`CalculationService` only). Owner comes from `service/OwnershipContext` (authenticated principal; deterministic thtran fallback when `app.security.enabled=false`). V23 backfills `person.user_id` where `user_id IS NULL` to thtran and sets `person.user_id NOT NULL`; adds `signature.user_id BIGINT REFERENCES app_user (id)`, backfills from `person.user_id` (falling back to thtran when `person_id IS NULL` on legacy deleted rows), sets `signature.user_id NOT NULL`, and adds `ix_signature_user_person_deleted (user_id, person_id, deleted)`; drops global `ux_lease_active_pair` and `ux_lease_active_company` and recreates `ux_lease_user_active_pair ON lease (user_id, landlord_id, tenant_id) WHERE NOT deleted AND NOT company_lease` and `ux_lease_user_active_company ON lease (user_id, landlord_id, company_id) WHERE NOT deleted AND company_lease`; never edit V1–V22. Scope `PersonService`, `SignatureService` (for both natural persons and employees), `LeaseService.party`, `CompanyService.delete` & `CompanyService.find`, `RentReceiptMapper`, `DataInitializer` and `E2eResetService` to the owner; foreign person id yields 404 `PERSON_NOT_FOUND`, foreign signature id yields 404 `SIGNATURE_NOT_FOUND`. Production classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [x] Two accounts each list, create, update and delete only their own persons and signatures; a guessed foreign person or signature id yields 404 (`PERSON_NOT_FOUND` / `SIGNATURE_NOT_FOUND`) on every read, mutation, lease creation and document generation path.
- [x] Pre-V23 persons and signatures are backfilled to thtran with `user_id NOT NULL`; lease active-pair unique indexes are scoped per account (`ux_lease_user_active_pair`, `ux_lease_user_active_company`); fresh schema + e2e reset leave seeded persons and signatures owned by the target account; `app.security.enabled=false` keeps existing web tests green.
- [x] Backend gates pass (see Commands): `verify` green, changed-line coverage >= 80%, one full E2E run green; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh d9f9ee2 backend` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance) · commit once with explicit paths; no push. Frontend and contract untouched: no Vitest/lint gate, no `gen:api`; record `frontend: unchanged` in evidence. Evidence must carry real counts, no retried-only greens.

## Evidence

Append one line per event; never rewrite a previous line.

- Files changed (25): `backend/src/main/resources/db/migration/V23__person_signature_ownership.sql`, `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Person,Signature}.java,repository/{Person,Signature,Employee,Company}Repository.java,service/{PersonService,SignatureService,LeaseService,CompanyService,RentReceiptMapper,E2eResetService}.java,config/DataInitializer.java}`, `backend/src/test/java/fr/hkof/homeofficeexpenses/{config/DataInitializerTest.java,service/{PersonServiceTest,SignatureServiceTest,SignatureServiceEdgeCasesTest,LeaseServiceTest,CompanyServiceTest,RentReceiptServiceTest,UserOwnershipMigrationPostgresTest,UserDocumentOwnershipMigrationPostgresTest}.java,web/{UserIsolationIntegrationTest,UserDocumentIsolationIntegrationTest}.java}`
- TDD Block 1 (`UserOwnershipMigrationPostgresTest#backfillsPersonsAndSignaturesAndScopesLeaseIndexes`, `UserOwnershipMigrationPostgresTest`, `UserDocumentOwnershipMigrationPostgresTest`, `PersonMigrationPostgresTest`): RED 10 run, 2 failures, 1 error (`column "user_id" does not exist`) -> GREEN 10 run, 0 failures.
- TDD Block 2 (`PersonServiceTest`, `SignatureServiceTest`, `SignatureServiceEdgeCasesTest`): RED 21 run, 21 errors (`constructor SignatureService(..., OwnershipContext, Clock) undefined`) -> GREEN 21 run, 0 failures.
- TDD Block 3 (`LeaseServiceTest`, `CompanyServiceTest`, `RentReceiptServiceTest`): RED 58 run, 6 failures, 27 errors (`constructor RentReceiptMapper(..., OwnershipContext) undefined`) -> GREEN 58 run, 0 failures.
- TDD Block 4 (`DataInitializerTest`, `UserIsolationIntegrationTest#isolatesCompaniesLeasesAndAddresses`, `UserDocumentIsolationIntegrationTest#isolatesSignaturesAndPersonsInDocuments`, `SignatureControllerIntegrationTest`, `E2eResetIntegrationTest`): RED 14 run, 14 errors (`findAllNaturalPersons(Long) not applicable for ()`) -> GREEN 14 run, 0 failures.
- PASS `codegraph affected` regression suite (15 test classes): exit 0, all green.
- PASS `codegraph sync`: synced 71 changed files (2,206 nodes).
- PASS `cd backend && ./mvnw -B verify`: exit 0, Tests run: 595, Failures: 0, Errors: 0, Skipped: 1, BUILD SUCCESS.
- PASS `scripts/diff-coverage.sh d9f9ee2 backend`: exit 0, 100% changed-line coverage (53/53 lines, 0 missing).
- PASS `make e2e-up && make e2e`: exit 0, 7/7 specs passed (`00-settings`, `01-rent-receipt`, `02-expense-statement`, `03-statement-finalization`, `04-admin-templates`, `05-multi-company`, `06-auth`), 34/34 tests green on first run (0 retries, stack left running).
- Frontend: unchanged. Contract: none.
- Deviations: added `EmployeeRepository.findFirstByUserIdAndCompanyIdAndTitleAndDeletedFalseOrderByIdAsc` and `CompanyRepository.findByIdAndUserId` (not explicitly listed in Writable backend) to support owner-scoped queries in `SignatureService.resolveForCompanyCeo`, `E2eResetService` and `CompanyService.find`. All touched production classes < 300 lines (max 296 lines).
- Commit: e510bee 25 files +435/-168

- 2026-10-29 lead: VERDICT: PASS (reviewer, round 1) — V23 backfills natural persons and signatures to thtran, enforces NOT NULL, replaces global lease active-pair unique indexes with per-user indexes (`ux_lease_user_active_pair`, `ux_lease_user_active_company`); `PersonService`, `SignatureService`, `LeaseService.party`, `CompanyService`, `RentReceiptMapper`, `DataInitializer` and `E2eResetService` are owner-scoped; red-to-green tests, verify 595/0/0/1, diff-coverage 100% (53/53), E2E 34/34 green. Status set to USER_REVIEW.
- 2026-10-29 lead: DONE — user accepted
