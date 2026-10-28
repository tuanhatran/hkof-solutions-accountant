# 55 — HISTORY-TEMPLATES-DENSITY

Status: DONE
Branch: feat/55-history-templates-density
Base: f67e645
Size: L
Round: 1/2

## Goal
Densify the History version lists and the Templates version list: 36px rows on one CSS grid shared by header and row, visible column labels at `xl`, `.number` dates/amounts, fixed actions track; behavior and `data-cy` unchanged. Out of scope: sort/filter (56), template compare (57), `.expense-table` restyle, generation pages, backend/contract/money/migration/LLM.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` (Cabinet design contract, lines 85-105) · `frontend/src/index.css` (`.expense-table` 200-214, `.number` 222-226)
Writable: `frontend/src/pages/history/{HistoryMonthSection.tsx,HistoryMonthSection.css,HistoryAddressRow.css,RentReceiptMonthPanel.tsx,RentReceiptMonthPanel.css,StatementMonthPanel.tsx,StatementMonthPanel.css,HistoryActions.tsx,HistoryActions.css}` · `frontend/src/pages/templates/{TemplateVersionsList.tsx,TemplateVersionsList.css}` · `frontend/src/i18n/resources/{fr,en}.ts`
Affected tests: `frontend/src/pages/history/HistoryPage.test.tsx` · `frontend/src/pages/templates/TemplatesTab.test.tsx` (write-first) · `frontend/src/i18n/i18n.test.ts` · `frontend/src/components/layout/{AppShell,AppNav}.test.tsx` · `frontend/src/components/settings/{CompanyLeaseStatementHistory,LeaseReceiptHistory,LeaseSection}.test.tsx` · `frontend/src/pages/settings/{CompanyLeaseTab,LmnpPage,SettingsPage}.test.tsx` · `frontend/src/hooks/useDraftBlock.test.tsx` · `frontend/src/components/llm/LlmBadge.test.tsx` · `frontend/src/router.test.tsx` (codegraph affected; full suite is the gate)

## Constraints
Contract: none. Display only: keep server totals, every `data-cy`, the `<li>` rows (`cy.contains("li","Quittance E2E")`) and `btn-activer-template`; no `any`; FR UI + EN parity; component CSS <300 lines; builder commits once (explicit paths), nobody pushes.
Design: flat `rounded-lg` surfaces, 1px separators, rows `min-h-9 px-3 py-1.5`, headers 11px normal case `text-ink-soft`; header and row use the **identical** grid template with a fixed (never `auto`) actions track — task 53 round-1 blocker. `.number` right-aligned on dates and amounts.
- History version rows: quittance grid `2.5rem minmax(0,1fr) 6.5rem 5rem 3rem` (Version · Parties · Date · Montant · PDF), note grid `2.5rem 6.5rem 5rem 11rem` (Version · Date · Montant · Actions: PDF, Complet, Charger); `hidden xl:grid` header + `xl:grid` row, stacked/header hidden below `xl`; address label 11px normal case (drop uppercase).
- Templates versions: grid `minmax(0,1fr) 4.5rem 8rem 21rem` (Modèle+badges · Version · Importé le · Actions, buttons wrap inside the fixed track), header `xl` only, format stays under the name.
- `data-cy` on headers: `entetes-versions-quittance`, `entetes-versions-note`, `entetes-versions-modele`. No horizontal overflow at 375px.
i18n: add `history.versions.{version,parties,date,amount,actions}` and `templates.versions.{name,versionColumn,importedAt,actions}` in FR and EN.

## Acceptance
- [ ] Both lists dense with headers aligned to their values; same fixed action track in header and row; 375px stacked without overflow; preview/download/activate/delete/load-PDF behavior unchanged.
- [ ] New tests written first (watched red) assert the header rows, shared row grid class and labels; i18n parity green.
- [ ] Full suite, build, changed-line coverage ≥80%, one full E2E run green.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh f67e645 frontend`
- `make e2e-up` once, then `make e2e` (keep the stack up; `make e2e-down` only after acceptance)

## Evidence
Files: `frontend/src/pages/history/{HistoryMonthSection.tsx,HistoryMonthSection.css,HistoryAddressRow.css,RentReceiptMonthPanel.tsx,RentReceiptMonthPanel.css,StatementMonthPanel.tsx,StatementMonthPanel.css}` · `frontend/src/pages/templates/{TemplateVersionsList.tsx,TemplateVersionsList.css}` · `frontend/src/i18n/resources/{fr,en}.ts` · tests `HistoryPage.test.tsx`, `TemplatesTab.test.tsx`.
RED `npx vitest run HistoryPage.test.tsx TemplatesTab.test.tsx`: 4 failed / 51 passed. New tests red→green: History "aligns the version headers and rows on one shared grid", Templates "aligns the version header and rows on one shared grid", plus EN header labels in 2 existing tests.
PASS `npx vitest run HistoryPage|TemplatesTab|i18n`: 3 files / 70 tests.
PASS handoff-listed affected regressions (11 files): 136 tests.
PASS `npm run test:coverage`: 66 files / 812 tests, lines 97.11%.
PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (exit 0).
PASS `scripts/diff-coverage.sh f67e645 frontend`: 5 changed lines, 100%, 0 missing.
PASS `make e2e-up` exit 0; `make e2e` exit 0: 6 specs / 26 tests / 26 passing / 0 failing, no retries; stack kept up.
Deviations: rows show `formatDate` (DD/MM/YYYY) instead of date+time to fit the fixed 6.5rem/8rem date tracks; one header per History column above the address panels (rows, `<li>` and `<details>` untouched). 375px non-overflow is structural (base flex-col, no min-width, headers hidden); no viewport E2E spec exists.
Contract: none.
Commit: b57196c 13 files +329/-67
lead: VERDICT: PASS (reviewer, round 1) — header/row fixed tracks identical, `data-cy`/`<li>`/handlers preserved, FR/EN paired, no structural overflow.
lead: DONE — user accepted
