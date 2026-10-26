# COMPANY-LEASE-NOTE-FRAIS

Status: DONE
Branch: feat/35-company-lease-note-frais
Base: e479a8f
Size: L
Round: 0/2

## Goal

Each `company-lease-tab-list-item` (`/parametres/configuration/entreprise`, "Baux & Frais") gets a "Note de frais" button opening a modal with the full expense-statement editor scoped to that company+lease (latest rent receipt of the month, lines/receipts/AI, backend calculation/preview, generation, PDF/ZIP) plus a per-lease statement history grouped by month. Out of scope: backend, `openapi/openapi.yaml`, `CalculationService`, global `/generer/note-frais` behaviour, new Cypress spec, statements with `leaseId == null` in this per-lease history.

## Files

Context (read only): `frontend/src/pages/expense-statement/GenerateExpenseStatementPage.tsx`, `ExpenseInputPane.tsx`, `ExpensePreviewPane.tsx`, `ExpenseEntryCard.tsx`, `ExpenseLinesCard.tsx`, `ExpenseGenerationFooter.tsx`, `RentReceiptNotice.tsx`, `ExpenseResultCard.tsx`, `useExpenseStatementPage.ts`; `frontend/src/state/statementDraft.ts`; `frontend/src/components/settings/LeaseReceiptModal.tsx`, `useLeaseReceiptModal.ts`, `LeaseReceiptHistory.tsx`; `frontend/src/api/endpoints.ts` (`expenseStatements.*`, `rentReceipts.*`, `receipts.*`, `analyses.*`), `queries.ts` (`useStatements`, `useAllRentReceipts`, `useActiveStatement`, `useExpenseItems`, `useEmployees`, `useSignatures`, `useTemplates`), `types.ts`; `frontend/src/pages/history/HistoryActions.tsx`; `frontend/src/lib/lines.ts` (`buildRentLine`), `format.ts`, `dates.ts` (`currentMonth`).
Writable: `frontend/src/pages/expense-statement/useExpenseStatementPage.ts`, `frontend/src/state/statementDraft.ts` + `.test.ts`; new `frontend/src/lib/leaseReceipts.ts` + `.test.ts`; `frontend/src/components/settings/LeaseReceiptHistory.tsx`; new `frontend/src/components/settings/CompanyLeaseStatementHistory.tsx` + `.css` + `.test.tsx`; new `frontend/src/pages/settings/CompanyLeaseStatementModal.tsx` + `.css` + `.test.tsx`; new `frontend/src/pages/settings/useCompanyLeaseStatementModal.ts`; `frontend/src/pages/settings/CompanyLeaseTab.tsx` + `.css` + `.test.tsx`; `frontend/src/pages/expense-statement/useExpenseStatementPage.test.tsx`.
Affected tests (codegraph): `frontend/src/pages/expense-statement/useExpenseStatementPage.test.tsx`, `GenerateExpenseStatementPage.test.tsx`, `frontend/src/state/statementDraft.test.ts`, `frontend/src/pages/settings/CompanyLeaseTab.test.tsx`, `SettingsPage.test.tsx`, `LmnpPage.test.tsx`, `frontend/src/components/settings/LeaseReceiptHistory.test.tsx`, `LeaseSection.test.tsx`, `frontend/src/pages/history/HistoryPage.test.tsx`, `frontend/src/pages/rent-receipt/GenerateRentReceiptPage.test.tsx`, `useRentReceiptPage.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`, `frontend/src/components/llm/LlmBadge.test.tsx`, `frontend/src/hooks/useDraftBlock.test.tsx`.

## Constraints

Contract: none — reuse `POST /api/expense-statements`, `/preview`, `/calculation`, `GET /api/expense-statements`, `/{id}/pdf`, `/{id}/zip`; `leaseId` is accepted for any non-deleted lease of the company (`LeaseService.resolveExpenseLease`), so no backend/OpenAPI/`gen:api`.
Scope: make `useExpenseStatementPage(options)` accept `companyId`, `leaseId`, `draft`, `rentReceipt` (`{data, isPending}`), `onGoToRentReceipt`; page defaults stay identical (global sessionStorage draft, active company/lease, `useNavigate`) and every calculation/preview/create body carries the scoped `companyId` + `leaseId`. Modal draft: non-persisted `createStatementDraftStore(currentMonth())`; no global draft mutation.
Receipt: latest ACTIVE `RentReceiptDto` matching `landlordId` and `tenantCompanyId === lease.companyId` for the selected month, highest `version` then `id`; move `matchesLease`/new `latestReceiptForMonth` to `lib/leaseReceipts.ts`, reuse in `LeaseReceiptHistory`. Prime the rent line once per month/receipt with `buildRentLine(receipt.total, "100.00")` using `primedReceiptByMonth`; never another lease's or older receipt. No receipt → French notice, rent add disabled, "Générer la quittance" opens the existing `LeaseReceiptModal`; after generation the scoped receipt/amount updates.
UI: portal modal like `LeaseReceiptModal`, reusing `ExpenseInputPane`/`ExpensePreviewPane` + `ViewTabs` on mobile; result card PDF + complete ZIP; generation invalidates `queryKeys.statementsAll`. History: one `useStatements(company.id, undefined, null)` in `CompanyLeaseTab`, filter `statement.leaseId === lease.id` strictly, months descending then versions descending; French empty/loading/error. Data-cy: `btn-note-frais-bail-societe-${lease.id}`, `dialogue-note-frais-bail`, `notes-frais-bail-${lease.id}`, `notes-frais-bail-mois-${lease.id}-${month}`, `telecharger-note-frais-bail-${statement.id}`, `telecharger-note-frais-complete-bail-${statement.id}`.
Money/style: totals only from `calculation`/`StatementDto`/`RentReceiptDto`, never summed client-side; UI French; no `any`; CSS colocated `company-lease-statement-*` / `company-lease-statement-history-*` with `@reference`/`@layer components`, tokens only, <300 lines; update `CompanyLeaseTab.test.tsx` API mock (`expenseStatements`, `rentReceipts`, `templates`, `employees`, `signatures`, `receipts`, `analyses`) and wrap the modal test in `MemoryRouter` (`useExpenseStatementPage` calls `useNavigate`).
Commit once after green gates, explicit paths only; never commit `.handoff/`; never push.

## Acceptance

- [ ] Button opens the scoped full editor; calculation/preview/create bodies carry `companyId` + `leaseId`; the global `/generer/note-frais` draft is untouched and its tests stay green.
- [ ] The rent line is primed from the latest ACTIVE receipt version of that lease and month; older/other-lease receipts are ignored; no receipt → French notice, rent blocked, receipt modal opens, and the line/amount updates after receipt generation.
- [ ] Generate keeps the modal open with backend version/total, PDF + complete ZIP downloads, and refreshes the history through `statementsAll`; missing CEO signature blocks generation with a French hint.
- [ ] History on every row: months newest first, expandable versions with date, backend total, PDF and ZIP; French empty/loading/error; strict lease filtering.
- [ ] New tests RED then GREEN; affected tests green; Vitest >= 90% lines/statements/functions/branches; lint, format:check, build; one full E2E run green.

## Commands

- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then the same command with `down -v --remove-orphans`.

## Evidence

Append one line per event; never rewrite a previous line.

## Evidence (Round 0, builder)

- Files (16): new `lib/leaseReceipts.ts`+test, `components/settings/CompanyLeaseStatementHistory.tsx`+`.css`+test, `pages/settings/CompanyLeaseStatementModal.tsx`+`.css`+test, `pages/settings/useCompanyLeaseStatementModal.ts`; modified `state/statementDraft.ts`+test, `pages/expense-statement/useExpenseStatementPage.ts`+test, `pages/settings/CompanyLeaseTab.tsx`+test, `components/settings/LeaseReceiptHistory.tsx` (import `matchesLease` from lib)
- B1 RED: leaseReceipts.test.ts module-not-found → GREEN 9; LeaseSection regression 6 PASS
- B2 RED: `createStatementDraftStore` not exported → GREEN statementDraft.test.ts 15; regression 82 PASS (HistoryPage, GenerateExpenseStatementPage, useExpenseStatementPage)
- B3 RED: 7 scoped-option tests failed → GREEN useExpenseStatementPage.test.tsx 62; regression 27 PASS; typecheck clean
- B4 RED: CompanyLeaseStatementHistory.test.tsx module-not-found → GREEN 8
- B5 RED: CompanyLeaseStatementModal.test.tsx module-not-found → GREEN 13 (6 core + 7 branch tests added at gate stage: error states, Escape/overlay close, tabs, in-place rent update, regeneration dialog, nested receipt modal close)
- B6 RED: 3 new CompanyLeaseTab tests failed (no button/history/dialog) → GREEN 19; codegraph-affected regression 37 PASS (SettingsPage 19, router 3, LlmBadge 10, useDraftBlock 5)
- PASS `codegraph sync` (17 files: 7 added, 10 modified)
- PASS `cd frontend && npm run test:coverage` — 632 tests / 62 files, 0 failed; stmts 97.09%, branch 90.09%, funcs 94.68%, lines 97.21% (thresholds 90)
- PASS `npm run lint` (0 problems); PASS `npm run format:check`; PASS `npm run build` (tsc -b + vite, 2379 modules)
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0; 6 specs, 26 tests, 26 passing, 0 failing, 0 retries; teardown `down -v --remove-orphans` exit 0
- Contract impact: none (existing endpoints reused; `leaseId` already accepted by backend)
- Deviations: none (CompanyLeaseTab.css unchanged — existing flex layout already fits the new button/history)
- Commit: c77cc62 16 files +2194/-143

## Evidence (Round 1, reviewer)

- VERDICT: PASS (range e479a8f..c77cc62) — scoped editor reuses the full controller, global draft/company store untouched, every calculation/preview/create body carries `companyId` + `leaseId`, receipt matching/priming and strict `leaseId` history filtering meet acceptance, gate evidence complete and consistent.
- Non-blocking: pre-existing 988-line `frontend/src/pages/expense-statement/useExpenseStatementPage.ts` (942 at Base) inherited debt, not crossed by this change; candidate for a future split task.
- 2026-10-26 lead: VERDICT PASS recorded, Status USER_REVIEW
- 2026-10-26 lead: DONE — user accepted
