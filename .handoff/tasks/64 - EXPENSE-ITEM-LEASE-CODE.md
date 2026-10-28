# 64 - EXPENSE-ITEM-LEASE-CODE

Status: DONE
Branch: fix/64-expense-item-lease-code
Base: 0fd5e7b
Size: L
Round: 1/2

## Goal

Expense-item codes are unique per company+lease (null lease = its own inherited scope), so « loyer » can be created for lease 4 while lease 1 already owns it, and statement calculation resolves the item of the selected lease. Out of scope: statement/draft lease scoping (63), rent-receipt generation, money rules, UI redesign.
Follow-up (user): `POST /api/expense-statements/draft` without `leaseId` must keep working when « loyer » is lease-scoped: resolve the effective lease for the item lookup and missing-items list, while the rent-receipt lookup keeps its legacy null scope.

## Files

Context (read only): `backend/.../domain/{ExpenseItem,Lease}.java`, `.../service/{LeaseService,RentReceiptService}.java` (`resolveExpenseLease`, `activeForLease`), `.../web/dto/ExpenseItemDtos.java`, `.../migration/{V7__multi_company.sql,V11__multi_lease_expenses.sql,V17__statement_lease_scope.sql}`, `frontend/src/pages/settings/{ExpenseItemsManager,ExpenseItemForm}.tsx`, `product_prompt.md` §poste.
Writable: `openapi/openapi.yaml` (`ExpenseItemRequest.code` description only); new `backend/src/main/resources/db/migration/V18__expense_item_lease_code.sql`; `backend/.../repository/ExpenseItemRepository.java`; `backend/.../service/{ExpenseItemService,ExpenseStatementLineCalculator,ExpenseStatementService}.java`; `frontend/src/api/schema.ts` (regenerated only).
Affected tests: `backend/src/test/java/.../service/{ExpenseItemServiceTest,ExpenseStatementLineCalculatorTest,ExpenseStatementServiceTest,MultiLeaseExpenseMigrationPostgresTest}.java`; `.../web/MultiLeaseExpensesIntegrationTest.java`.

## Constraints

Contract: `openapi/openapi.yaml#/components/schemas/ExpenseItemRequest/properties/code`; regenerate with `npm run gen:api`, never hand-edit `schema.ts`.
Duplicate rule: reject a code already present in the effective visibility (company-global `lease_id IS NULL` + target lease); allow it on two different leases; null is its own scope; deleted rows still reserve a code. `entity(companyId, leaseId, code)` prefers the exact-lease item, falls back to the global one, never the old company-wide lookup (it would throw on duplicates). Updating to a lease whose code is taken returns 400 `EXPENSE_ITEM_CODE_DUPLICATE`, not a DB 500.
Migration V18: drop `uq_expense_item_company_code`; add unique `(company_id, COALESCE(lease_id,0), code)`; applies on a fresh and a V17 DB.
Money untouched (`CalculationService`); UI French; no `any`; classes/CSS < 300; builder commits once (explicit paths), nobody pushes.

## Acceptance

- [ ] POST `{companyId:1,leaseId:4,code:"Loyer",...}` succeeds when « loyer » exists on another lease; GET per lease returns each row only for its lease.
- [ ] Same code twice on lease 4, or lease 4 vs inherited `leaseId:null`, returns 400 `EXPENSE_ITEM_CODE_DUPLICATE` in French.
- [ ] Calculation/preview/generation for lease 4 uses lease 4's same-code item (label/supplier/id), never lease 1's and no `NonUniqueResultException`.
- [ ] V18 migration test: cross-lease duplicate allowed; same `(company, lease|null, code)` rejected; legacy null scope kept.
- [ ] Contract description updated, `schema.ts` regenerated only.
- [ ] Legacy `POST /api/expense-statements/draft?companyId=...&month=...` without `leaseId` returns the rent line with the effective lease's « loyer » item (no `EXPENSE_ITEM_UNKNOWN_CODE`) and keeps the legacy receipt scope.
- [ ] Gates pass with real counts; changed-line coverage >= 80% both sides; full E2E green.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 0fd5e7b backend` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 0fd5e7b frontend` · `make e2e-up` once then `make e2e` (full suite, no pass only on retry; keep the stack up).

## Evidence

- Files: `ExpenseItemRepository` (per-scope lookups), `ExpenseItemService` (scope-aware duplicate on create/update, lease-aware `entity`), `ExpenseStatementLineCalculator` (`leaseId` arg), `ExpenseStatementService` (calculate/draft/preview/generate thread the lease), `V18__expense_item_lease_code.sql`, 5 test files, `openapi/openapi.yaml` description, regenerated `schema.ts`.
- Red: targeted run before implementation — 52 tests, 44 errors (missing 3-arg `entity`/`calculateLines`). Green after: ExpenseItemServiceTest 24, ExpenseStatementLineCalculatorTest 11, ExpenseStatementServiceTest 17, 0 failures.
- Green: MultiLeaseExpensesIntegrationTest 7 (reported payload 201, per-lease GET, same-lease/inherited/global collisions 400 French, update collision 400, lease-B calculation label `Quittance de loyer`), MultiLeaseExpenseMigrationPostgresTest 7 (V18 fresh + V17 upgrade: cross-lease allowed, same `(company, lease|null, code)` rejected, legacy null kept).
- PASS `cd backend && ./mvnw -B verify` — 575 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS.
- PASS `scripts/diff-coverage.sh 0fd5e7b backend` — 100%, 24 changed lines, 0 missing.
- PASS `cd frontend && npm run gen:api` — only the `ExpenseItemRequest.code` comment changed in `schema.ts`.
- PASS `npm run test:coverage` — 68 files, 924 tests; `lint`, `format:check`, `build` exit 0.
- PASS `scripts/diff-coverage.sh 0fd5e7b frontend` — no executable changed lines (generated type comment only).
- PASS `make e2e-up` exit 0, then `make e2e` exit 0 — 6 specs, 27 tests, 27 passing, 0 failing, no retry; stack left up.
- Contract: `ExpenseItemRequest.code` description only, no shape change.
- Deviations: none. Draft resolves the requested lease for the rent line; calculate/preview/generate use the resolved effective lease.
Commit: c1fb030 12 files +469/-64
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — scope-aware duplicate rule, V18 migration, lease-aware resolution and red-then-green tests match the handoff; no executable `schema.ts` edit, gates coherent.
- 2026-10-28 lead: `USER_CHANGES_REQUESTED — fix the legacy draft API call` (Round reset to 0)
- Follow-up files: `ExpenseStatementService.draft` (effective lease for `entity`/`list`, raw `leaseId` for the receipt and pro-rata), `ExpenseStatementServiceTest`, `MultiLeaseExpensesIntegrationTest` (HTTP draft test + signature/receipt cleanup helper returns id).
- Red: `ExpenseStatementServiceTest#draftWithoutLeaseUsesEffectiveLeaseItem` — 1 test, 1 error `Type de frais inconnu : loyer` at `draft:90`. Red: `MultiLeaseExpensesIntegrationTest#legacyDraftWithoutLeaseUsesEffectiveLeaseItem` — `Status expected:<200> but was:<400>` on `/draft` without `leaseId`.
- Green: targeted `ExpenseStatementServiceTest` 18, `MultiLeaseExpensesIntegrationTest` 8, 0 failures; codegraph-affected run 43 tests, 0 failures (`ApiIntegrationTest`, `ExpenseStatementActiveIntegrationTest`, `SignatureControllerIntegrationTest` included).
- PASS `git diff --check` — exit 0.
- PASS `cd backend && ./mvnw -B verify` — 577 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS.
- PASS `scripts/diff-coverage.sh 0fd5e7b backend` — 100%, 26 changed lines, 0 missing.
- PASS `make e2e` (stack already up) exit 0 — 6 specs, 27 tests, 27 passing, 0 failing, no retry; second confirmation run exit 0 same counts; stack left up.
- Frontend gates skipped per table row (backend production code only; frontend unchanged since c1fb030). Contract: none. Deviations: none.
Commit: a110d8f 3 files +81/-5
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — legacy draft resolves the effective lease for the item/list while keeping the null receipt scope; per-lease path unchanged; both regression tests red-then-green; gates coherent.
- 2026-10-28 lead: `DONE — user accepted`
