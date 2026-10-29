# 45
Status: DONE
Branch: feat/45-history-ui-i18n
Base: 1a3c0b6
Size: M
Round: 1/2
## Goal
Make the history UI fully bilingual FR/EN with react-i18next: history page header/empty/loading states, month cards, document badges, address/pair labels, reload dialog and toast, month panels, and the two settings history sections (per-lease rent receipts and expense statements), while French remains byte-identical. Out of scope: settings/LMNP pages other than the two history sections, templates, Admin IA, PDFs/templates, backend, contract, `formatDateTime`/`formatEUR`/`formatMonth`/`formatPeriod`.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,44 - EXPENSE-STATEMENTS-UI-I18N}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts
Write: frontend/src/pages/history/{HistoryPage,HistoryMonthSection,HistoryReloadDialog,HistoryEmptyState,HistoryActions,RentReceiptMonthPanel,StatementMonthPanel}.tsx · frontend/src/pages/history/historyHelpers.ts · frontend/src/components/settings/{CompanyLeaseStatementHistory,LeaseReceiptHistory}.tsx · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/history/{HistoryPage,historyHelpers}.test.ts(x) · frontend/src/components/settings/{CompanyLeaseStatementHistory,LeaseReceiptHistory}.test.tsx
Affected tests: the 4 test files above · frontend/src/components/layout/AppShell.test.tsx · frontend/src/router.test.tsx · full frontend suite · full E2E
Symbols: HistoryPage · groupHistoryByMonthAndAddress/pairLabel · HistoryMonthSection · CompanyLeaseStatementHistory/LeaseReceiptHistory · i18n resources
## Constraints
FR byte-identical (exact wording, typographic apostrophes, guillemets, ellipses) · EN translates document names naturally ("Rent receipt", "Expense statement") per the accepted Task 43/44 precedent; FR keeps "Quittance", "Note de frais"; data keys, routes and `data-cy` stay unchanged · plural badges use i18next `count` (FR must keep "0 mois suivi", "1 mois suivi", "3 mois suivis", "1 note"/"2 notes", "1 quittance"/"2 quittances") · language switch relabels without reload (`HistoryPage` grouping memo must depend on `i18n.resolvedLanguage`; `pairLabel` and unknown-address labels resolve at call time, never at module load) · `formatMonth` stays language-aware; `formatDateTime`/`formatEUR` untouched · no `any` · no backend/API/contract change · no money logic · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 10 writable production files except dynamic data and the FR translation bundle; every label, badge, empty state, aria text, toast and dialog string uses `t()`.
- In EN the history page, month cards, panels, dialog, toast and both settings history sections read English; switching FR↔EN updates month card labels and counts without a reload.
- FR output is byte-identical to base for every changed string, including plural forms and `data-cy` selectors.
- `historyHelpers` labels (`pairLabel`, unknown address/bailleur/locataire) follow the current language; FR test assertions stay green and EN assertions cover them.
- Existing FR tests stay green; new EN tests cover page header/empty state, month badges/plurals, reload dialog/toast, and the two settings history sections.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 1a3c0b6 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
- Files: 12 production (7 history components + historyHelpers + 2 settings sections + fr/en resources), 4 tests.
- Red: 4 targeted files FAIL — `Test Files 4 failed (4)`, `Tests 10 failed | 49 passed (59)`.
- Green targeted: 4 files PASS — `Test Files 4 passed (4)`, `Tests 59 passed (59)`.
- `codegraph affected` — 56 files listed; ran 55 test files PASS, `Tests 667 passed (667)`.
- PASS `npm run test:coverage` — 63 files, 704 tests, statements 96.96%, branches 90.04%, functions 94.78%, lines 97.07%.
- PASS `npm run lint` — exit 0, 0 errors 0 warnings. PASS `npm run format:check` — exit 0 after `prettier --write` on historyHelpers.ts/HistoryPage items. PASS `npm run build` — exit 0.
- PASS `scripts/diff-coverage.sh 1a3c0b6 frontend` — 93% (16 changed lines, 1 missing, min 80%).
- PASS E2E once: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, `All specs passed!`, 6 specs / 26 tests, 0 failures, 0 retries; `down -v --remove-orphans` exit 0.
- FR byte-identical: every existing FR assertion and E2E spec passes unmodified; plural badges via i18next `count` (0 mois suivi / 1 mois suivi / 3 mois suivis; 1 note / 2 notes; 1 quittance / 2 quittances).
- Language switch: `pairLabel`/unknown labels resolved at call time; `HistoryPage` memo keyed on `i18n.resolvedLanguage` (passed to `groupHistoryByMonthAndAddress`); EN switch test proves relabel without reload.
- Changed test scaffolding only: `historyHelpers.test.ts` groups inside `beforeEach` (label now language-sensitive); assertions untouched.
- Deviation: `OpenPdfLink` is unused and untested, its translated line is the single uncovered changed line.
- Commit: 312e575 16 files +527/-76. Contract impact: none (no openapi/backend/generated schema/format/money change).
- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — 1a3c0b6..312e575, FR byte-identical incl. plurals and data-cy, 534/534 FR/EN key parity, reload-free language switch, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
