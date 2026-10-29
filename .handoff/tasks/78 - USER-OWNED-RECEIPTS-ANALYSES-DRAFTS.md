# 78 - USER-OWNED-RECEIPTS-ANALYSES-DRAFTS

Status: DONE · Branch: feat/78-user-owned-receipts-analyses-drafts · Base: 81637e3 · Size: L · Round: 1/2

## Goal

Scope every uploaded receipt, document analysis and persisted form draft read/write/delete/cancel to the authenticated account, backfill legacy rows to thtran, enforce NOT NULL and per-account draft scope unique indexes. Out of scope: DTO/route/OpenAPI changes, calculation logic, LLM prompt/extraction logic.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/OwnershipContext.java,service/ExpenseStatementLineCalculator.java,service/RentReceiptService.java,service/ExpenseStatementService.java,web/ReceiptController.java,web/AnalysisController.java,web/DocumentDraftController.java}`, `backend/src/main/resources/db/migration/{V1__init,V14__document_draft,V15__document_draft_scope_unique,V17__statement_lease_scope,V24__template_llm_ownership}.sql`, `backend/src/test/resources/application-test.yml`.
Routes (shapes unchanged, data scoped): `/api/receipts` (`POST`, `GET /{id}`, `GET /{id}/file`, `DELETE /{id}`, `POST /{id}/analysis`), `/api/analyses` (`GET /{id}`, `DELETE /{id}`), `/api/drafts` (`PUT /rent-receipts`, `GET /rent-receipts`, `PUT /expense-statements`, `GET /expense-statements`, `DELETE /{id}`).
Writable backend: `backend/src/main/resources/db/migration/V25__receipt_analysis_draft_ownership.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{Receipt,AnalysisDocument,DocumentDraft}.java,repository/{Receipt,AnalysisDocument,DocumentDraft}Repository.java,service/{ReceiptService,DocumentDraftService,E2eResetService}.java,service/llm/AnalysisJobService.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{ReceiptServiceTest,DocumentDraftServiceTest,DocumentDraftMigrationPostgresTest,DocumentDraftPersistencePostgresTest,UserOwnershipMigrationPostgresTest}.java,service/llm/AnalysisJobServiceTest.java,web/{UserDocumentIsolationIntegrationTest,DocumentDraftIntegrationTest,E2eResetIntegrationTest}.java}`.
Affected tests (run all; edit only if they break): `codegraph affected` on ReceiptService, AnalysisJobService, DocumentDraftService — adds `service/{ExpenseStatementDocumentServiceTest,ExpenseStatementLineCalculatorTest,ExpenseStatementServiceTest,RentReceiptServiceTest}.java`, `web/{ApiErrorContractIntegrationTest,ApiIntegrationTest,ExpenseStatementActiveIntegrationTest,MultiLeaseExpensesIntegrationTest,SignatureControllerIntegrationTest}.java`. Max 40 files; stop and report if exceeded.

## Constraints

Contract: none (ownership server-side; no OpenAPI/DTO/route change, no frontend change, no `gen:api`). Money untouched (`CalculationService` only). Owner comes from `service/OwnershipContext` (authenticated principal; deterministic thtran fallback when `app.security.enabled=false`). V25 adds `user_id BIGINT REFERENCES app_user (id)` to `receipt`, `document_analysis` and `document_draft`, backfills existing rows (`document_analysis` from `receipt.user_id` with fallback to thtran; `receipt` and `document_draft` to thtran), enforces `NOT NULL`, adds `ix_receipt_user_deleted (user_id, deleted)` and `ix_document_analysis_user_receipt (user_id, receipt_id)`, drops global `ux_document_draft_rent_scope` and `ux_document_draft_statement_scope` and creates `ux_document_draft_user_rent_scope ON document_draft (user_id, billing_month, landlord_id, COALESCE(tenant_id, 0), COALESCE(tenant_company_id, 0)) WHERE NOT deleted AND draft_type = 'RENT_RECEIPT'` and `ux_document_draft_user_statement_scope ON document_draft (user_id, billing_month, company_id, COALESCE(lease_id, 0)) WHERE NOT deleted AND draft_type = 'EXPENSE_STATEMENT'`; never edit V1–V24. `ReceiptService` stamps `userId` on `upload` and scopes `entity(id)` by `userId` (foreign id -> 404 `RECEIPT_NOT_FOUND` on get/file/delete, statement line calculation and analysis launch). `AnalysisJobService` stamps `userId` on `launch`, scopes `get(id)` and `cancel(id)` by `userId` (foreign id -> 404 `ANALYSIS_NOT_FOUND`), and uses `analysis.getUserId()` in async `execute`. `DocumentDraftService` stamps `userId` on save and scopes all active-draft lookups and `delete(id)` by `userId` (foreign id -> 404 `DRAFT_NOT_FOUND`); keep scope validation unchanged so synthetic ids in existing draft tests continue to work; `E2eResetService` clears `document_draft` as well. Production classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [x] Two accounts each upload, read, download, analyze and delete only their own receipts; a guessed foreign receipt id yields 404 `RECEIPT_NOT_FOUND` (including on `POST /api/receipts/{id}/analysis` and statement calculation/generation); a guessed foreign analysis id yields 404 `ANALYSIS_NOT_FOUND` on `GET`/`DELETE /api/analyses/{id}`.
- [x] Two accounts each save, reload and delete only their own rent-receipt and expense-statement drafts (even for identical scope keys); a guessed foreign draft id yields 404 `DRAFT_NOT_FOUND`; pre-V25 receipts, analyses and drafts are backfilled to thtran with `user_id NOT NULL` and per-user draft unique indexes; `app.security.enabled=false` keeps existing web tests green.
- [x] Backend gates pass (see Commands): `verify` green, changed-line coverage >= 80%, one full E2E run green; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 81637e3 backend` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance) · commit once with explicit paths; no push. Frontend and contract untouched: no Vitest/lint gate, no `gen:api`; record `frontend: unchanged` in evidence. Evidence must carry real counts, no retried-only greens.

## Evidence

Append one line per event; never rewrite a previous line.

- Files changed (19): `backend/src/main/resources/db/migration/V25__receipt_analysis_draft_ownership.sql`, `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/{Receipt,AnalysisDocument,DocumentDraft}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/repository/{Receipt,AnalysisDocument,DocumentDraft}Repository.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{ReceiptService,DocumentDraftService,E2eResetService}.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/llm/AnalysisJobService.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/{ReceiptServiceTest,DocumentDraftServiceTest,DocumentDraftMigrationPostgresTest,DocumentDraftPersistencePostgresTest,UserOwnershipMigrationPostgresTest}.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/llm/AnalysisJobServiceTest.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{UserDocumentIsolationIntegrationTest,E2eResetIntegrationTest}.java`.
- TDD `UserOwnershipMigrationPostgresTest#backfillsReceiptsAnalysesAndDrafts` + `DocumentDraftMigrationPostgresTest`: RED (missing `V25` / `user_id` NOT NULL) -> GREEN (6 tests passing across both Postgres migration suites).
- TDD `ReceiptServiceTest`: RED (5 compilation errors on `ReceiptService` owner constructor & `findByIdAndUserIdAndDeletedFalse`) -> GREEN (5 tests passing).
- TDD `AnalysisJobServiceTest`: RED (22 compilation errors on `AnalysisDocument.userId` & user-scoped repository queries) -> GREEN (22 tests passing).
- TDD `DocumentDraftServiceTest` + `DocumentDraftPersistencePostgresTest#allowsTwoAccountsSameScopeOnPostgres`: RED (16 compilation errors on `DocumentDraft.userId` & user-scoped repository queries) -> GREEN (16 unit + 4 Postgres persistence tests passing).
- TDD `E2eResetIntegrationTest#resetsData`: RED (expected 204 NO_CONTENT on `/api/drafts/rent-receipts` after reset, got 200 OK) -> GREEN (2 tests passing after clearing `document_draft` in `E2eResetService`).
- TDD `UserDocumentIsolationIntegrationTest#isolatesReceiptsAnalysesAndDrafts` + `DocumentDraftIntegrationTest`: GREEN (9 tests passing: 5 in `UserDocumentIsolationIntegrationTest`, 4 in `DocumentDraftIntegrationTest`).
- PASS `codegraph sync`: 18 changed files synced, 747 nodes.
- PASS `cd backend && ./mvnw -B verify`: 605 tests run, 0 failures, 0 errors, 1 skipped (exit 0). Max production class length among touched classes: `DocumentDraftService.java` (271 lines < 300).
- PASS `scripts/diff-coverage.sh 81637e3 backend`: 100% (40/40 changed lines covered, 0 missing).
- PASS E2E: `make e2e-up && make e2e` -> exit 0, 7/7 specs passed, 34/34 tests passing (0 failing, 0 retried); E2E stack left running.
- Frontend: unchanged; Contract: none; Deviations: none.
- Commit: 483477a 19 files +601/-122

- 2026-10-29 lead: VERDICT: PASS (reviewer, round 1) — V25 backfills receipt, document_analysis and document_draft to thtran/receipt owner, enforces NOT NULL, and replaces global draft scope unique indexes with per-user indexes (`ux_document_draft_user_rent_scope`, `ux_document_draft_user_statement_scope`); ReceiptService, AnalysisJobService, DocumentDraftService and E2eResetService are owner-scoped; red-to-green tests, verify 605/0/0/1, diff-coverage 100% (40/40), E2E 34/34 green. Status set to USER_REVIEW.
- 2026-10-29 lead: DONE — user accepted
