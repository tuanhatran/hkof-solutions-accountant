# 62 - GENERATION-UI-IMPROVEMENTS
Status: DONE
Branch: feat/62-generation-ui-improvements
Base: 64154e9
Size: M
Round: 1/2
## Goal
Expense page fix only: the rent receipt picker lists only receipts of the lease the page uses (today `CompanyDto.leaseId`, or `options.leaseId` in scoped editors), never another lease of the company; 1 receipt => automatic, 2+ => newest by version/id with « Modifier ». The four initial improvements (FR/EN toggle, Save Draft next to Generate, month-derived period, receipt picker) are delivered in acb4ee4 and stay unchanged. Out of scope: lease selector next to the company and per-lease statement versioning (task 63), backend/contract, Save Draft (verified after rebuild).
## Files
Context (read only): `frontend/src/api/queries.ts` (`useLeases`, `useRentReceipts`), `frontend/src/api/types.ts` (`LeaseDto`, `RentReceiptDto`), `frontend/src/pages/expense-statement/{RentReceiptNotice.tsx,useExpenseStatementPage.ts}`, backend `RentReceiptService.fill`/`nextVersion` (company lease => `tenantId` null, `tenantCompanyId` = `lease.companyId`).
Writable: `frontend/src/pages/expense-statement/useExpenseStatementContext.ts`, `frontend/src/pages/expense-statement/{GenerateExpenseStatementPage,useExpenseStatementPage}.test.tsx`.
Affected tests: same two test files. Symbols: `useExpenseStatementContext`, `rentReceiptCandidates`, `selectedRentReceiptId`, `selectRentReceipt`, `useLeases`.
## Constraints
Contract: none — backend, `openapi/openapi.yaml` and `schema.ts` untouched; money `CalculationService` only; UI French + EN i18n, no `any`; builder commits once (explicit paths), nobody pushes.
Filter: resolve `useLeases().data.find(id === selectedLeaseId)`; keep receipts with `landlordId === lease.landlordId` and, for a company lease (`lease.companyId != null`), `tenantCompanyId === lease.companyId`, else `tenantId === lease.tenantId`. Keep the server order (newest first), the `options.rentReceipt` precedence, and the reset on company/month; reset also when the resolved lease changes. Lease list pending or `selectedLeaseId` null: keep the current company+month list (no blanket filter).
## Acceptance
- [ ] Only the receipts of the lease used by the page are offered (company lease: landlord + tenant company; person lease: landlord + tenant); receipts of the company's other leases never appear; 1 => automatic and no « Modifier »; 2+ => newest selected with « Modifier »; choosing another updates the rent line amount.
- [ ] No lease resolved (list pending/missing) keeps the previous behaviour; scoped `options.rentReceipt` still wins; the other behaviours delivered in acb4ee4 are unchanged.
- [ ] Gates pass with real counts: frontend coverage/lint/format/build, changed-line coverage >= 80%, full E2E green; no contract/backend change; classes and component CSS < 300 lines.
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 64154e9 frontend` (>= 80% changed lines) · `make e2e` (stack already up from round 1; `make e2e-up` only if it is down; full suite, no pass only on retry; keep it up, `make e2e-down` only after acceptance).
## Evidence
Files: LanguageSelector.tsx/.css + AppShell.test; RentReceiptForm/AmountFields/useRentReceiptPage + preview; ExpenseGenerationFooter/PreviewPane/useExpenseStatementContext/Page/RentReceiptNotice/.css; fr/en i18n; related tests + 01-rent-receipt spec.
PASS npm run test:coverage — 68 files, 917 tests, all files 96.5% stmts / 96.57% lines, exit 0.
PASS npm run lint — exit 0.
PASS npm run format:check — all files formatted, exit 0.
PASS npm run build — tsc -b + vite build, exit 0.
PASS scripts/diff-coverage.sh 64154e9 frontend — 32 changed lines, 0 missing, 100%, exit 0.
PASS make e2e-up — stack built and healthy, exit 0.
PASS make e2e — 6/6 specs, 27/27 tests, 0 failures/retries, exit 0; stack left up.
Red→green LanguageSelector toggle: 3 failed -> 3 passed.
Red→green draft button placement (rent + expense): 2 failed -> 67 passed (38 + 29).
Red→green rent period derivation (init/hydration/preview/generation/save): 5 failed -> 74 passed (36 + 38).
Red→green expense rent receipt picker/defaults/reset: 12 failed -> 104 passed (74 + 30).
Deviations: none; no contract, backend, schema.ts or money-rule change (period fields still sent, now derived).
Pre-existing stderr: duplicate-key warnings in ExpenseTypeAndProRata/RentReceiptAmountFields tests, untouched.
Commit: acb4ee4 22 files +537/-234
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — period derivation on every path, picker default/reset/scoped precedence, single footer save button, accessible FR/EN toggle; diff verified frontend-only. Risk: choosing a non-latest receipt changes the rent line amount, but the statement annex/DTO still resolves the latest receipt server-side (backend untouched).
- 2026-10-28 lead: `USER_CHANGES_REQUESTED — multi-lease selector next to the company + remove active lease in Company settings; picker restricted to the selected lease; Save Draft reported missing from expense-generation-footer-actions` (Round reset to 0).
- 2026-10-28 lead: scope after user split — 62 keeps the picker/lease filter only; multi-lease selector + per-lease statement versions moved to task 63; Save Draft report withdrawn (stale build). Round 0.
Files: useExpenseStatementContext.ts (lease resolve, candidate filter, lease-aware reset), useExpenseStatementPage.test (useLeases mock + lease fixtures + 4 tests), GenerateExpenseStatementPage.test (useLeases mock + lease fixtures + picker test), cypress/support/helpers.ts (E2E seed on the page lease).
Red→green lease filter (company lease / person lease / resolved-lease reset): 4 failed (109 run) -> 109 passed (2 files); pending-lease guard green pre-fix.
PASS npx vitest run affected (LlmBadge, useDraftBlock, CompanyLeaseStatementModal, CompanyLeaseTab, router) — 5 files, 64 tests, exit 0.
PASS npm run test:coverage — 68 files, 921 tests, all files 96.51% stmts / 96.58% lines, exit 0.
PASS npm run lint — exit 0.
PASS npm run format:check — all files formatted, exit 0.
PASS npm run build — tsc -b + vite build, exit 0.
PASS scripts/diff-coverage.sh 64154e9 frontend — 39 changed lines, 0 missing, 100%, exit 0.
PASS make e2e — 6/6 specs, 27/27 tests, 0 failures/retries, exit 0; stack left up.
FAIL make e2e first run — 3/6 specs, 17/27, 10 failures all `addRent` 950.00: fixture seeded the receipt on the person lease while the page uses the company lease.
Deviation: one extra test-support file (cypress/support/helpers.ts) committed outside the 3-file writable list to seed the receipt on the page lease; no production/backend/contract change.
Contract: none — backend, openapi/openapi.yaml and schema.ts untouched; money rule untouched.
Commit: d07fdc0 4 files +345/-24
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — filter mirrors backend identity (landlord + tenant company / tenant person), server order and scoped precedence kept, reset only on a real company/month/lease change, pending-lease fallback explicitly allowed, E2E seed fix justified; no backend/contract/money change.
- 2026-10-28 lead: `DONE — user accepted`
