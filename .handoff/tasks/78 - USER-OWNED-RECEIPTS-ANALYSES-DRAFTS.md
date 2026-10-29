# 78 - USER-OWNED-RECEIPTS-ANALYSES-DRAFTS

Status: TODO · Branch: feat/78-user-owned-receipts-analyses-drafts · Base: 81637e3 · Size: L · Round: 0/2

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

- [ ] Two accounts each upload, read, download, analyze and delete only their own receipts; a guessed foreign receipt id yields 404 `RECEIPT_NOT_FOUND` (including on `POST /api/receipts/{id}/analysis` and statement calculation/generation); a guessed foreign analysis id yields 404 `ANALYSIS_NOT_FOUND` on `GET`/`DELETE /api/analyses/{id}`.
- [ ] Two accounts each save, reload and delete only their own rent-receipt and expense-statement drafts (even for identical scope keys); a guessed foreign draft id yields 404 `DRAFT_NOT_FOUND`; pre-V25 receipts, analyses and drafts are backfilled to thtran with `user_id NOT NULL` and per-user draft unique indexes; `app.security.enabled=false` keeps existing web tests green.
- [ ] Backend gates pass (see Commands): `verify` green, changed-line coverage >= 80%, one full E2E run green; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 81637e3 backend` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance) · commit once with explicit paths; no push. Frontend and contract untouched: no Vitest/lint gate, no `gen:api`; record `frontend: unchanged` in evidence. Evidence must carry real counts, no retried-only greens.

## Evidence

Append one line per event; never rewrite a previous line.
