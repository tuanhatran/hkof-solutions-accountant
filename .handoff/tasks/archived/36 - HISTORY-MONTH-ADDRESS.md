# 36 - HISTORY-MONTH-ADDRESS
Status: DONE
Branch: feat/36-history-month-address
Base: 95e6663
Size: M
Round: 1/2
## Goal
On `/historique`, keep one 2-column card per month (newest first) and render inside it one Quittance | Note de frais row per lease address, addresses A→Z (unknown last), never mixing addresses. Out of scope: generator/draft pre-selection, contract, other pages.

Follow-up (user, 2026-10-26): invert the hierarchy — month → « Quittance de loyer » column → addresses → generated receipt, and month → « Note de frais d'occupation » column → addresses → generated note. Each column lists only addresses that have that generated document; the address label is always visible; per-column generate shortcuts for missing documents are removed (global empty-state shortcuts stay).
## Files
Context (read only): `frontend/src/api/queries.ts` (`useLeases`, `useRentReceipts`, `useStatements`), `frontend/src/lib/leaseReceipts.ts` (`matchesLease`), `frontend/src/api/types.ts` (`LeaseDto.propertyAddress`, `StatementDto.leaseId`), `frontend/src/lib/format.ts` (`formatMonth`), `frontend/src/components/settings/LeaseReceiptHistory.tsx`, `frontend/src/components/settings/CompanyLeaseStatementHistory.tsx`
Writable: `frontend/src/pages/history/HistoryPage.tsx`, `historyHelpers.ts`, `HistoryMonthSection.tsx`, `HistoryMonthSection.css`, `RentReceiptMonthPanel.tsx`, `StatementMonthPanel.tsx`, `HistoryPage.test.tsx`, `historyHelpers.test.ts`, new `HistoryAddressRow.tsx` + `.css`; E2E only if a selector must change: `frontend/cypress/e2e/01-rent-receipt.cy.ts`, `03-statement-finalization.cy.ts`, `05-multi-company.cy.ts`
Symbols: `HistoryPage` (`/historique`), `groupHistoryByMonthAndAddress`, `resolveLeaseForDocument`, `HistoryMonthSection`, `matchesLease`; groups are `MonthGroup { month, addresses }` / `AddressGroup { addressKey, addressLabel, rentReceipts, statements }`.
Affected tests (`codegraph affected`): `HistoryPage.test.tsx`, `historyHelpers.test.ts`, `LeaseReceiptHistory.test.tsx`, `router.test.tsx`; full suite through `test:coverage`.
## Constraints
Contract: none. Money untouched. Statement lease = `statement.leaseId`; receipt lease = lowest-id `matchesLease` match (a company lease also requires `companyId === activeCompanyId`); unmatched documents stay visible in a French "Adresse inconnue" entry, last, and the address label is always rendered. Preserve PDF links, version lists, reload actions, French texts and `data-cy` (`historique-mois-<month>`, `quittance-active-<month>`, `btn-telecharger-*`, `btn-rouvrir-note-*`) for single-address months; suffix duplicates with the address key when a month has several. Remove only the per-column missing-document « Générer » buttons; keep the global HistoryEmptyState shortcuts. UI French, code English, no `any`, builder commits once.
## Acceptance
- [ ] Months newest first; each month card shows two document-type columns: « Quittance de loyer » listing only addresses with a receipt and « Note de frais d'occupation » listing only addresses with a note; entries A→Z (`localeCompare("fr", { sensitivity: "base" })`), unknown last, address label always visible, no cross-address mixing.
- [ ] A month with two leases renders the right entries under each column; a column with no generated document shows a French empty state; per-column « Générer » shortcuts are gone; global HistoryEmptyState, PDF links, version lists and reload actions stay.
- [ ] Documents without a lease remain visible under « Adresse inconnue » last; single-address `data-cy` and E2E stay green; tests updated for the inverted hierarchy and absence of in-history generate buttons.
- [ ] Gates pass (Commands); changed-line coverage >= 80% via `scripts/diff-coverage.sh 95e6663 frontend`; component CSS < 300 lines.
## Commands
Run once at end: `codegraph sync`; `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`; `scripts/diff-coverage.sh 95e6663 frontend`; full E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then the same with `down -v --remove-orphans`. Evidence: real counts, coverage %, E2E exit code/specs/tests, `Commit:`.
## Evidence (Round 0, builder)

- Files (11): new `pages/history/HistoryAddressRow.tsx`+`.css`; modified `HistoryPage.tsx`+test, `historyHelpers.ts`+test, `HistoryMonthSection.tsx`+`.css`, `RentReceiptMonthPanel.tsx`, `StatementMonthPanel.tsx`, `settings/CompanyLeaseTab.tsx` (format-only)
- B1 RED: `TypeError: groupHistoryByMonthAndAddress is not a function` → GREEN `historyHelpers.test.ts` 11/11
- B2 RED: address rows `[]` vs 3 expected `historique-adresse-2026-01-*` → GREEN `HistoryPage.test.tsx` 11/11
- PASS `codegraph affected` regression: 8 files / 83 tests (LeaseReceiptHistory, LeaseSection, AppShell, LlmBadge, useDraftBlock, GenerateRentReceiptPage, LmnpPage, router)
- PASS `codegraph sync` (10 files: 1 added, 9 modified)
- PASS `cd frontend && npm run test:coverage` — 640 tests / 62 files, 0 failed
- PASS `npm run lint` (0 problems); PASS `npm run format:check`; PASS `npm run build` (tsc -b + vite, exit 0)
- PASS `scripts/diff-coverage.sh 95e6663 frontend` — 100% (65 changed lines, 0 missing, 6 files)
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0; 6 specs, 26 tests, 26 passing, 0 failing, 0 retries; `down -v --remove-orphans` exit 0
- Contract impact: none (frontend only, `openapi/openapi.yaml` untouched, no `gen:api`)
- Deviations: `settings/CompanyLeaseTab.tsx` — removed one trailing-whitespace line committed in base `95e6663` that kept `format:check` red; formatting-only, outside the writable list, included in the commit and reported here
- Commit: db9aeb5 11 files +591/-91
- 2026-10-26 lead: `VERDICT: PASS (reviewer, round 1)` — grouping/ordering/selectors verified against `db9aeb5`; evidence complete. Status USER_REVIEW.
- 2026-10-26 lead: `USER_CHANGES_REQUESTED` — invert « Quittance de loyer » / addresses hierarchy; each column lists only generated addresses; always show the address label; remove in-history generate shortcuts (Round reset to 0).

## Evidence (Round 0, builder, follow-up)
- Files (10): `HistoryPage.tsx`+test, `HistoryMonthSection.tsx`+`.css`, `HistoryAddressRow.tsx`+`.css`, `RentReceiptMonthPanel.tsx`+`.css`, `StatementMonthPanel.tsx`+`.css`; `historyHelpers.ts` unchanged
- RED `npx vitest run src/pages/history/HistoryPage.test.tsx` — 4 failed / 8 passed (missing columns, generate buttons still rendered) → GREEN 12/12
- New/updated tests: column order + headings + always-visible label, empty column French text + no generate buttons, two-lease/unknown A→Z per column, single-address label + unsuffixed `data-cy`
- PASS `codegraph affected` regressions — 6 files / 62 tests (AppShell, LlmBadge, useDraftBlock, HistoryPage, GenerateRentReceiptPage, router)
- PASS `codegraph sync` (16 pending references resolved)
- PASS `cd frontend && npm run test:coverage` — 641 tests / 62 files, 0 failed
- PASS `npm run lint` (0 problems); PASS `npm run format:check` (all matched); PASS `npm run build` (exit 0)
- PASS `scripts/diff-coverage.sh 95e6663 frontend` — 97% (70 changed lines, 2 missing: unreachable panel guards, 6 files)
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0; 6 specs, 26 tests, 26 passing, 0 failing, 0 retries; `down -v --remove-orphans` exit 0
- Contract impact: none (frontend only, no backend, `openapi/openapi.yaml` untouched)
- Deviations: none; generate-button tests replaced by empty-column/no-shortcut assertions, per-column `data-cy` `historique-colonne-{quittance|note}-<month>` added
- Commit: 582afb4 10 files +287/-221
- 2026-10-26 lead: `VERDICT: PASS (reviewer, round 1, follow-up 582afb4)` — inverted Quittance/Note columns, only generated addresses, always-visible labels, in-history generate shortcuts removed; evidence complete. Status USER_REVIEW.
- 2026-10-26 lead: `DONE — user accepted`
