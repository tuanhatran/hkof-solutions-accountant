# 75 - USER-OWNED-GENERATED-DOCUMENTS

Status: DONE · Branch: feat/75-user-owned-generated-documents · Base: 9cfdaea · Size: L · Round: 2/2

## Goal

Every generated rent receipt (with additional charges) and expense statement (with lines) belongs to the authenticated account: stamped on generation, backfilled to thtran, and every list/get/pdf/zip/active/generate path is owner-scoped; foreign ids are 404. Out of scope: uploaded receipts, analyses, drafts (next task), person/signature scoping, templates/LLM config, DTO/route/OpenAPI changes, calculation logic.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/{OwnershipContext,CompanyService,LeaseService,StorageService,E2eResetService}.java,config/DataInitializer.java}`, `backend/src/main/resources/db/migration/V20__user_ownership.sql` (pattern), `backend/src/test/resources/application-test.yml`.
Routes (shapes unchanged, data scoped): `/api/rent-receipts` (`/active`, `/{id}`, `/{id}/pdf`, `/preview`, POST generate), `/api/expense-statements` (`/draft`, `/calculation`, `/preview`, `/active`, `/{id}`, `/{id}/pdf`, `/{id}/zip`, POST generate).
Writable backend: `backend/src/main/resources/db/migration/V21__document_ownership.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{domain/{RentReceipt,RentReceiptAdditionalCharge,ExpenseStatement,ExpenseLine}.java,repository/{RentReceipt,RentReceiptAdditionalCharge,ExpenseStatement,ExpenseLine}Repository.java,service/{RentReceiptService,RentReceiptAssembler,ExpenseStatementService,ExpenseStatementDocumentService,E2eResetService}.java}`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{service/{RentReceiptServiceTest,ExpenseStatementServiceTest,ExpenseStatementDocumentServiceTest,ExpenseStatementLineCalculatorTest,UserDocumentOwnershipMigrationPostgresTest}.java,web/{UserDocumentIsolationIntegrationTest,ApiIntegrationTest,ExpenseStatementActiveIntegrationTest,MultiLeaseExpensesIntegrationTest,E2eResetIntegrationTest,DocumentDraftIntegrationTest,ApiErrorContractIntegrationTest,SignatureControllerIntegrationTest}.java}`.
Affected tests (run all; edit only if they break): `codegraph affected` on RentReceiptService, ExpenseStatementService, ReceiptService, DocumentDraftService, AnalysisJobService — adds `service/{DocumentDraftServiceTest,DocumentDraftPersistencePostgresTest,ReceiptServiceTest,llm/AnalysisJobServiceTest}.java` (run only, not writable). Max 40 files; stop and report if exceeded.

## Constraints

Contract: none (ownership server-side; no OpenAPI/DTO/route change, no frontend change, no `gen:api`). Money: `CalculationService` and the statement line calculator are untouched — this task only adds ownership plumbing. Owner comes from `service/OwnershipContext` (authenticated principal; deterministic thtran fallback when `app.security.enabled=false`); stamp it on every created row: rent receipt, additional charges, expense statement and its lines. V21 backfills `rent_receipt`, `rent_receipt_additional_charge`, `expense_statement`, `expense_line` to thtran (the account already exists from V20 — do not re-insert it), then enforces NOT NULL and owner indexes; never edit V1–V20. Keep the existing unique indexes unchanged (statement company/lease/version, rent-receipt person-pair/version): report, do not silently alter, any cross-account collision you meet. PDF/zip downloads resolve the row owner first and return 404 (`RENT_RECEIPT_NOT_FOUND` / `EXPENSE_STATEMENT_NOT_FOUND`) for a foreign id; keep storage file names unless a real collision is proven. E2e reset deletes all documents and never deletes users; documents generated after reset belong to the e2e account. No document content or account id in logs or DTOs; French messages; classes < 300 lines; builder commits once with explicit paths; nobody pushes.

## Acceptance

- [ ] Two accounts each generate, list, read and download only their own rent receipts and expense statements; a guessed foreign id yields 404 for get/pdf/zip and generation cannot attach to a foreign company/lease; lists and counts exclude foreign rows.
- [ ] Pre-V21 documents are owned by thtran after upgrade; fresh schema works; e2e-generated documents stay owned by the e2e account; `app.security.enabled=false` keeps the existing web tests green.
- [ ] Backend gates pass (see Commands): `verify` green, changed-line coverage >= 80%, one full E2E run green; production classes < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 9cfdaea backend` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance) · commit once with explicit paths; no push. Frontend and contract untouched: no Vitest/lint gate, no `gen:api`; record `frontend: unchanged` in evidence. Evidence must carry real counts, no retried-only greens.

## Evidence

Append one line per event; never rewrite a previous line.
2026-10-01 RED UserDocumentOwnershipMigrationPostgresTest: "column user_id does not exist" after migrate to 20 + inserts (2 tests red as expected).
2026-10-01 RED UserDocumentIsolationIntegrationTest: rent receipt POST 500 INTERNAL_ERROR because rent_receipt.user_id NOT NULL had no default (1 test red as expected).
2026-10-01 GREEN UserDocumentOwnershipMigrationPostgresTest: 2 tests, 0 failures (backfill thtran, 4x is_nullable=NO, 4 owner indexes, fresh migrate).
2026-10-01 GREEN UserDocumentIsolationIntegrationTest: 1 test, 0 failures (own list/get/pdf/zip 200; foreign root/charge/statement/line rows none; foreign get/pdf/zip 404 RENT_RECEIPT_NOT_FOUND/STATEMENT_NOT_FOUND; foreign company/lease 404/400 COMPANY_NOT_FOUND/LEASE_ACTIVE_NOT_FOUND).
2026-10-01 GREEN RentReceiptServiceTest 0 failures; ExpenseStatementServiceTest 0 failures (owner stamped on receipt, all charges, statement, all lines).
2026-10-01 PASS PersonMigrationPostgresTest 4 tests, 0 failures (after adding user_id to the two post-V21 rent_receipt inserts).
2026-10-01 PASS `cd backend && ./mvnw -B verify` -> BUILD SUCCESS, Tests run: 592, Failures: 0, Errors: 0, Skipped: 1.
2026-10-01 PASS `scripts/diff-coverage.sh 9cfdaea backend` -> changed lines 63, covered 62, missing 1 (ExpenseLine#getUserId), 98% (>= 80%).
2026-10-01 PASS `make e2e-up` (exit 0) then `make e2e` (exit 0): 7 specs, 34 tests, 34 passing, 0 failing; stack left up.
2026-10-01 PASS `git diff --check` clean. frontend: unchanged (no frontend/contract/generated API changes, no gen:api, no Vitest/lint).
2026-10-01 DEVIATION `service/PersonMigrationPostgresTest.java` edited although outside the writable list: its post-V21 inserts needed user_id; minimal change, 4 tests green.
2026-10-01 RISK `uq_rent_receipt_month_tenant_version` left unchanged as instructed; persons are not account-scoped yet, so two accounts sharing the same person pair + month can collide on version. Statement unique indexes are company-scoped (company is owner-scoped), so no cross-account collision there. Storage names embed person/company/lease ids, so no cross-account overwrite proven.
2026-10-01 Files changed: V21 migration; domain RentReceipt, RentReceiptAdditionalCharge, ExpenseStatement, ExpenseLine; repositories RentReceipt, ExpenseStatement; services RentReceiptService, RentReceiptAssembler, ExpenseStatementService; tests RentReceiptServiceTest, ExpenseStatementServiceTest, PersonMigrationPostgresTest, UserDocumentOwnershipMigrationPostgresTest, UserDocumentIsolationIntegrationTest.
Commit: e9fe61a 15 files +719/-126
- 2026-10-29 lead: VERDICT: BLOCKERS (1) (reviewer, round 1) — `RentReceiptAssembler.fileName` is owner-agnostic while version numbering became per-owner and `uq_rent_receipt_month_tenant_version` stays global: A generates month M then deletes its lease (no receipt guard), B reuses the shared person pair and generates M → same `sorties/quittance_<month>_l<..>_t<..>_v1.pdf` (A's PDF overwritten) and then a 500 on the global index, so A downloads B's receipt. Fix AUTHORIZED: add `V22__rent_receipt_user_uniqueness.sql` (do NOT edit applied V21) dropping/recreating the unique index with `user_id` first; make new receipt storage names owner-specific (existing stored paths untouched); isolation test for delete→reuse→same-month asserting B gets 201, distinct paths, A's PDF bytes unchanged. Round 2: fix commit only.
2026-10-29 RED UserDocumentIsolationIntegrationTest#keepsSharedPersonReceiptsOfTwoAccountsApart: A generates 2026-05, deletes lease, B reuses A's persons and generates 2026-05 -> B gets 201 but both rows store the identical `.../sorties/quittance_2026-05_l3_t4_v1.pdf` (A's PDF overwritten); "not equal" assertion failed (1 test, 1 failure).
2026-10-29 RED UserDocumentOwnershipMigrationPostgresTest#scopesReceiptUniquenessPerOwner with V22 temporarily removed: old index count expected 0 but was 1 (1 test, 1 failure).
2026-10-29 GREEN UserDocumentIsolationIntegrationTest: 2 tests, 0 failures (B 201, distinct stored paths, A PDF bytes unchanged after B generation).
2026-10-29 GREEN UserDocumentOwnershipMigrationPostgresTest: 3 tests, 0 failures (old index gone, `uq_rent_receipt_user_month_tenant_version` present, same-owner duplicate rejected, same key across two owners accepted).
2026-10-29 GREEN affected regression 97 tests, 0 failures: ExpenseStatementDocumentServiceTest 13, ExpenseStatementServiceTest 18, RentReceiptServiceTest 22, UserDocumentOwnershipMigrationPostgresTest 3, ApiErrorContractIntegrationTest 12, ApiIntegrationTest 11, E2eResetIntegrationTest 2, ExpenseStatementActiveIntegrationTest 1, MultiLeaseExpensesIntegrationTest 8, SignatureControllerIntegrationTest 5, UserDocumentIsolationIntegrationTest 2.
2026-10-29 PASS `cd backend && ./mvnw -B verify` -> BUILD SUCCESS, Tests run: 594, Failures: 0, Errors: 0, Skipped: 1.
2026-10-29 PASS `scripts/diff-coverage.sh 9cfdaea backend` -> changed lines 65, covered 64, missing 1 (ExpenseLine#getUserId), 98% (>= 80%).
2026-10-29 PASS `make e2e-up` (exit 0, backend recreated) then `make e2e` (exit 0): 7 specs, 34 tests, 34 passing, 0 failing; stack left up. E2E profile has `spring.flyway.enabled=false`, so V22 is validated by the PostgreSQL migration test.
2026-10-29 PASS `git diff --check` clean. frontend: unchanged (no contract/API/frontend change, no gen:api).
2026-10-29 Files changed (fix commit): V22 migration; service/RentReceiptAssembler; tests RentReceiptServiceTest, UserDocumentOwnershipMigrationPostgresTest, UserDocumentIsolationIntegrationTest.
2026-10-29 RISK A collision that happened before V22 cannot be undone (A's stored PDF already overwritten); existing `pdf_path` values keep being served and no file is renamed or moved.
Commit: 68cc055 5 files +134/-3
2026-10-29 lead: VERDICT: PASS (reviewer, round 2) — round 1 blocker closed: fileName owner-stamped via the same OwnershipContext call as row stamping, single caller, old pdf_path served unchanged; V22 drops/recreates the V10 index with user_id first on fresh+upgraded DB, V21 untouched, no old-index reference left; both new tests red-capable (H2 API distinct paths/A bytes; PostgreSQL old-index-gone, same-owner duplicate rejected, cross-owner accepted). verify 594/0/0/1, coverage 98%, E2E 34/34, stack left up. Status USER_REVIEW; awaiting user acceptance.
2026-10-29 lead: DONE — user accepted
