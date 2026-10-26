# 37 - HISTORY-ALL-COMPANIES
Status: DONE
Branch: feat/37-history-all-companies
Base: cf57731
Size: M
Round: 2/2
## Goal
History lists every company's rent receipts and notes de frais; the "Société active" selector leaves the sidebar and mobile header and no UI switches the active company (internal store keeps the stored/first company). Out of scope: backend/`openapi/openapi.yaml`, money, Settings company-configuration selector, deleting the company store.
## Files
Context: `frontend/src/state/company.ts` (`useCompanyStore`, `resolveActiveCompanyId`).
Writable: `frontend/src/components/layout/{AppShell.tsx,AppShell.css,AppShell.test.tsx}`, delete `AppCompanySelect.tsx/.css/.test.tsx`; `frontend/src/pages/history/{HistoryPage.tsx,HistoryPage.test.tsx,historyHelpers.ts,historyHelpers.test.ts}`; `frontend/src/api/{queries.ts,queries.test.ts}`; `frontend/src/pages/settings/{CompanySection.tsx,SettingsPage.test.tsx}`; `frontend/cypress/e2e/05-multi-company.cy.ts`.
Affected tests: the two history files, `AppShell.test.tsx`, `queries.test.ts`, `SettingsPage.test.tsx`, E2E 05. Symbols/routes: `AppShell`, `AppCompanySelect`, `HistoryPage`, `groupHistoryByMonthAndAddress`, `resolveLeaseForDocument`, `useAllStatements`, `CompanySection`, `GET /api/expense-statements`.
## Constraints
Contract: none — per-company `useQueries` fan-out; `GET /api/expense-statements` keeps `companyId` required; never touch backend or `openapi/openapi.yaml`. Money: none. UI French · no `any` · move the `resolveActiveCompanyId` effect from `AppCompanySelect` to `AppShell` · remove "Rendre active"/`setActiveCompany` from `CompanySection` · History: `useAllRentReceipts()` + new `useAllStatements(companyIds)`; `historyHelpers` drops `activeCompanyId` · E2E 05: no shell switch, generate for the default company, create the annexe statement via API, assert History shows both · builder commits once, nobody pushes.
## Acceptance
- [ ] History shows two companies' documents with no active-company filter; company leases match whatever their `companyId`.
- [ ] No "Société active"/`select-societe-active` in production; no shell selector; no "Rendre active".
- [ ] Store still resolves (stored id if valid, else first) via `AppShell`; other tests stay green.
- [ ] Obsolete `AppCompanySelect` tests deleted; no other test weakened or skipped.
- [ ] E2E 05 proves History lists both companies without a shell switch; gates + changed-line coverage >= 80% pass.
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`; `scripts/diff-coverage.sh cf57731 frontend`; full E2E via docker compose (`up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`).
## Evidence
Files: AppShell(.tsx/.css/.test), AppCompanySelect.* deleted; HistoryPage(.tsx/.test), historyHelpers(.ts/.test), api/queries(.ts/.test), settings/CompanySection + SettingsPage.test, cypress/e2e/05; deviation: CompanyLeaseStatementHistory.test.
- PASS `npx vitest run <5 targeted files>`: 5 files, 74 tests.
- PASS `npx vitest run <28 affected files>`: 28 files, 395 tests.
- PASS `npm run test:coverage`: 61 files, 642 tests; statements 96.62%.
- PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (2384 modules).
- PASS `scripts/diff-coverage.sh cf57731 frontend`: 96% (26 lines, 1 missing).
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, 6/6 specs, 26/26 tests, 0 retries; teardown `down -v --remove-orphans` exit 0.
- Red→green historyHelpers: company lease resolves whatever its companyId (1 red → 11 green).
- Red→green useAllStatements: merge, error/refetch, empty fan-out (3 red → 20 green queries.test).
- Red→green HistoryPage: two companies rendered + companyIds [1,2] (1 red → 14 green).
- Red→green AppShell: no selector, stored/first/null resolution (2 red → 10 green).
- Red→green Settings: no "Rendre active", create does not activate (2 red → 19 green).
- Deviation: `CompanyLeaseStatementHistory.test.tsx` (not in writable list) still expected the "v2 · active" suffix removed on base cf57731; fixed stale expectations only, no production change.
- Contract: none; `openapi/openapi.yaml` and backend untouched.
Commit: f6b57e5 16 files +309/-374
2026-10-26 lead: VERDICT: BLOCKERS (1) — `HistoryPage.confirmReload` loads a non-first company's statement into the global draft while `/generer/note-frais` resolves the stored/first company; pin the active company to `statement.companyId` (fallback: its lease's `companyId`) before `loadFromStatement`/navigation, with a red→green test.
2026-10-26 builder round 2:
- Files: `frontend/src/pages/history/HistoryPage.tsx`, `HistoryPage.test.tsx`.
- Red→green HistoryPage: statement `companyId: 2` pinned in `useCompanyStore` + lease-company fallback + no-company guard (2 red → 17 green `HistoryPage.test.tsx`; existing reload test still green).
- PASS `npx vitest run <6 affected files>`: 6 files, 68 tests.
- PASS `npm run format:check`; PASS `npm run lint`; PASS `npm run test:coverage`: 61 files, 645 tests.
- PASS `npm run build`: built in 1.17s.
- PASS `scripts/diff-coverage.sh cf57731 frontend`: 96% (31 lines, 1 missing: AppShell.tsx:59 from f6b57e5).
- PASS E2E `docker compose ... up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, 6/6 specs, 26/26 tests, 0 retries; teardown `down -v --remove-orphans` exit 0.
- Deviation: none (only `HistoryPage.tsx/.test.tsx` touched); Contract: none; backend and `openapi/openapi.yaml` untouched.
Commit: 137a0f4 2 files +114/-1
2026-10-26 lead: VERDICT: PASS (reviewer, round 2) — blocker fixed and verified; no remaining blocker.
2026-10-26 lead: DONE — user accepted
