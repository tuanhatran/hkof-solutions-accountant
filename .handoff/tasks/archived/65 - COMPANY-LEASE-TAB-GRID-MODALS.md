# 65 - COMPANY-LEASE-TAB-GRID-MODALS

Status: DONE
Branch: feat/65-company-lease-tab-grid-modals
Base: b4e3a1e
Size: L
Round: 0

## Goal

Redesign the "Baux & Frais" tab as a 5-column grid (Adresse, Bailleur, Loyer, Charges, Actions): "Modifier les frais" opens one expenses dialog (list ↔ item form inside that same dialog), "Modifier le bail" keeps the unchanged LeaseForm, and the accordion, "Générer la note de frais" and the per-lease statement history are removed. Out of scope: lease CRUD/LeaseForm, backend, contract, money, templates.
Follow-up (user, before acceptance): remove the "Frais généraux" header action (perceived as grouping every lease; existing `leaseId = null` items stay inherited and editable inside each lease dialog, but new company-level items can no longer be created), remove the list toolbar and sort from the column headers (Adresse, Bailleur, Loyer, Charges) with asc/desc, keep sorting reachable on mobile, polish the whole table, and label the row action "Ajouter des frais" when the lease has no visible expense item. No AG Grid. User decision 2026-10-29 (waives the round cap for one scoped pass): `<ul role="rowgroup">` (`CompanyLeaseTab.tsx:197`) violates `aria-allowed-role`; set `role="none"` on the `<ul>` so the `role="row"` items are owned directly by `role="table"`, keep `role="none"` on the `<li>` and the five `role="cell"`, drop the `rowgroup` assertion (`CompanyLeaseTab.test.tsx:170`) and assert instead that the data rows are direct children of the `table` with no intermediate `rowgroup`. No other code, CSS, i18n or DOM change; do not reopen anything the reviewer already passed.

## Files

Context (read only): `frontend/src/components/settings/LeaseForm.tsx`, `frontend/src/components/settings/ListToolbar.tsx` (`ListSearch` only; `ListToolbar` stays for other lists), `frontend/src/hooks/useListQuery.ts` (`sort`/`direction`/`toggleDirection`), `frontend/src/components/ui/{FormModal,ConfirmDialog}.tsx`, `frontend/src/index.css` (`.expense-table` visual base), `frontend/src/i18n/resources/fr.ts` (`settings.company.leaseTab`).
Writable: `frontend/src/pages/settings/{CompanyLeaseTab.tsx,CompanyLeaseTab.css,CompanyLeaseRow.tsx,CompanyLeaseRow.css,ExpenseItemsManager.tsx,ExpenseItemsManager.css,ExpenseItemForm.tsx,ExpenseItemForm.css,CompanyLeaseExpensesModal.tsx,CompanyLeaseExpensesModal.css}`, `frontend/src/components/ui/{Dialog.tsx,Dialog.css}`, `frontend/src/api/queries.ts` (multi-lease expense-items helper), `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Delete (now dead): `frontend/src/pages/settings/{CompanyLeaseView.tsx,CompanyLeaseView.css,CompanyLeaseView.test.tsx,CompanyLeaseStatementModal.tsx,CompanyLeaseStatementModal.css,CompanyLeaseStatementModal.test.tsx,useCompanyLeaseStatementModal.ts}`, `frontend/src/components/settings/{CompanyLeaseStatementHistory.tsx,CompanyLeaseStatementHistory.css,CompanyLeaseStatementHistory.test.tsx}`.
Affected tests: `frontend/src/pages/settings/{CompanyLeaseTab.test.tsx,ExpenseItemsManager.test.tsx,ExpenseItemForm.test.tsx,CompanyLeaseExpensesModal.test.tsx,SettingsPage.test.tsx}`, `frontend/src/components/ui/Dialog.test.tsx`, `frontend/src/i18n/i18n.test.ts`, `frontend/cypress/e2e/{00-settings.cy.ts,05-multi-company.cy.ts}`.

## Constraints

Contract: none. Money untouched.
One dialog only: new `Dialog` owns overlay/Escape/focus trap/restore; `ExpenseItemForm` gains `embedded` and must not render `FormModal` in that mode; `ExpenseItemsManager` gains `embedded`, owns the list↔form swap and the `leaseId` scope (`null` = company-level).
Grid `md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6.5rem_6.5rem_auto]`, stacked card on mobile; row stays inert (no click, no `company.leaseId` write); headers Adresse/Bailleur/Loyer/Charges/Actions (EN Address/Landlord/Rent/Charges/Actions), "—" for missing landlord.
Keep selectors: `bail-societe-<id>`, `loyer-bail-societe-<id>`, `charges-bail-societe-<id>`, `actions-bail-societe-<id>`, `btn-modifier-bail-societe-<id>`, `btn-ajouter-bail-societe`, `filtre-baux-societe`, `filtre-effacer-baux-societe`, `filtre-compteur-baux-societe`, `btn-modifier-frais-bail-societe-<id>` (label "Modifier les frais" / "Ajouter des frais"), `dialogue-frais-bail-societe`. New mobile sort: `tri-compact-baux-societe`, `tri-compact-direction-baux-societe`. Keep `btn-ajouter-poste`, `formulaire-poste`, `btn-enregistrer-poste`, `btn-modifier-poste-<code>`, `btn-supprimer-poste-<code>` usable inside the dialog.
`defaultProRata`: lease `proRataBase ?? company.proRataBase ?? "100.00"`. UI French, no `any`, tokens only, CSS/components < 300 lines. No dead imports or files.
Follow-up design: no AG Grid (1-5 rows, client-side sort already in `useListQuery`; a dependency would bypass the token-based design system).
Toolbar: remove `ListToolbar` from this tab only; keep `ListSearch` + its clear button in the section header and move the `visible sur total` count there (`filtre-compteur-baux-societe`, `aria-live="polite"`); no `tri-baux-societe` / `tri-direction-baux-societe`.
Sort headers: Adresse, Bailleur, Loyer, Charges sortable; full-cell `<button>` per column header, `aria-sort`, Lucide ArrowUp/ArrowDown/ArrowUpDown, visible focus ring; inactive click starts ascending, active click toggles; Actions not sortable; add a `landlord` compare (`landlordName`, fr, `sensitivity: "base"`). Mobile: the header row stays `hidden md:grid`; a compact `md:hidden` sort control in the section header keeps sorting reachable.
Styling: follow `.expense-table` (11px uppercase header band, one rounded `border-line` container, row dividers, 44px rows, hover `bg-paper/40`, focus-within); numeric columns `number` right-aligned; address semibold/truncate with `title`; mobile card with labeled Loyer/Charges and a top border before actions; tokens only, no hex, <300 lines.
Per-lease label: a `useQueries` helper in `api/queries.ts` reusing `queryKeys.expenseItems(companyId, true, leaseId)` (same cache as the dialog; no hook loop). Success + 0 items → « Ajouter des frais » / "Add expenses"; otherwise/pending/error → « Modifier les frais » / "Edit expenses".
Remove `btn-frais-generaux-societe`, `dialogue-frais-generaux-societe`, the null-lease branch/title of `CompanyLeaseExpensesModal` (`lease` becomes required), i18n `generalExpenses`/`generalExpensesTitle`, and the matching Cypress block. Existing null-scope items still show in every lease dialog (inheritance) and stay editable/deletable; only their creation disappears.
ARIA (reviewer blocker, round 1): `role="columnheader"`/`aria-sort` need a real table context — `role="table"` on `.company-lease-tab-table`, `role="row"` on the `CompanyLeaseSortHeader` root and on each `div.company-lease-tab-item`, `role="none"` on the `<li>`, `role="none"` on the `<ul>` (user decision 2026-10-29: `ul` cannot be `rowgroup`), `role="cell"` on the five row children; keep `role="columnheader"` + `aria-sort` on the four sortable headers, the Actions header stays a plain header cell.

## Acceptance

- [ ] Header + each row = 5 columns; only the company's leases, filter and count behaviour preserved.
- [ ] "Modifier les frais" opens `dialogue-frais-bail-societe` scoped to the lease; "Ajouter un poste"/"Modifier" swap to the embedded form in the same dialog; Valider returns to the list; Annuler returns to the list; Escape/overlay close the dialog once and restore focus.
- [ ] "Frais généraux" is gone (button, dialog variant, i18n, Cypress, null-lease branch); null-scope items remain visible/editable inside lease dialogs.
- [ ] "Modifier le bail" still opens the unchanged prefilled LeaseForm.
- [ ] No "Afficher les frais", "Générer la note de frais", statement history or company-level fallback remain; no leftover imports/files.
- [ ] No list toolbar on the tab; filter, clear and live count stay in the section header; sorting lives in the column headers (asc/desc, `aria-sort`, keyboard, visible focus) with a mobile control.
- [ ] The grid exposes valid ARIA table semantics (`table`/`row`/`cell`/`columnheader`, no `rowgroup` on the `ul`) and the tests assert the roles and the direct table→row ownership, not only the `aria-sort` attribute.
- [ ] Row action reads "Ajouter des frais" for a lease with no visible expense item and "Modifier les frais" otherwise, same `data-cy`, sharing the dialog cache.
- [ ] Table styling uses the `.expense-table` language (header band, dividers, hover/focus, 44px rows, right-aligned numbers, mobile cards), tokens only; no AG Grid dependency.
- [ ] fr/en updated, no hardcoded UI text; failing test first; gates pass with real counts; changed-line coverage >= 80%; full E2E green.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh b4e3a1e frontend` · `make e2e` (e2e stack already up from the previous run; it rebuilds changed services; full suite, no pass only on retry; keep the stack up; `make e2e-down` only after acceptance).

## Evidence

Append one line per event; never rewrite a previous line.

- `YYYY-MM-DD builder:` red → `<key assertion message>`
- `YYYY-MM-DD builder:` `<command>` `<real counts>` PASS|FAIL
- `YYYY-MM-DD builder:` changed-line coverage frontend `<x>%` (`<n>` lines) vs `b4e3a1e`
- `YYYY-MM-DD builder:` E2E `<exit code>` `<specs>` specs `<tests>` tests PASS
- `YYYY-MM-DD builder:` `Commit: <short-sha> <n> files +<a>/-<d>`

- 2026-10-28 builder: red → `Failed to resolve import "./Dialog" from Dialog.test.tsx` → green 7/7
- 2026-10-28 builder: red → embedded mode ignored, 5 tests failed (FormModal still rendered) → green ExpenseItemForm 15/15, ExpenseItemsManager 21/21
- 2026-10-28 builder: red → `Unable to find text: Gaz` in CompanyLeaseExpensesModal.test → green 8/8, i18n 17/17
- 2026-10-28 builder: red → new grid/dialog tab tests failed before the row/tab rewrite → green CompanyLeaseTab 23/23, SettingsPage 26/26
- 2026-10-28 builder: `cd frontend && npm run test:coverage` exit 0, 67 files / 916 tests PASS
- 2026-10-28 builder: `cd frontend && npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0, 2428 modules PASS
- 2026-10-28 builder: changed-line coverage frontend `98%` (79 lines, 1 missing: Dialog.tsx:84) vs `b4e3a1e` PASS
- 2026-10-28 builder: `make e2e-up` exit 0; `make e2e` exit 0, 6 specs 27 tests, 0 fail, 0 retry PASS (stack left up)
- 2026-10-28 builder: line counts max 271 (ExpenseItemsManager.tsx); all components/CSS < 300
- 2026-10-28 builder: deviations: added `ExpenseItemsTable.tsx/.css` + `ExpenseItemFormFrame.tsx/.css` (not in Writable list, extracted to keep <300 lines); removed unused i18n `settings.history.statements`; touched only Affected tests + Cypress specs. Contract: none.
- 2026-10-28 builder: `Commit: 4504c7a 36 files +1554/-2633`
- 2026-10-28 lead: `VERDICT: PASS` (reviewer, round 1) — grid, single-dialog swap, lease/company scoping, inert rows, dead-file removal and the 98% changed-line + 27-test E2E evidence are coherent; no contract, money or 300-line breach.
- 2026-10-28 lead: `USER_CHANGES_REQUESTED — remove Frais généraux, move sorting into the headers (no toolbar, no AG Grid), polish the table, label the action "Ajouter des frais" when the lease has no expense` (Round reset to 0)
- 2026-10-29 builder: red → `useLeaseExpenseItemPresence is not a function` and 12 failing tests (header sort/aria-sort, mobile sort, action labels, Frais généraux removal) → green CompanyLeaseTab 28/28, CompanyLeaseExpensesModal 7/7, SettingsPage 26/26, queries 23/23
- 2026-10-29 builder: `cd frontend && npm run test:coverage` exit 0, 67 files / 921 tests PASS
- 2026-10-29 builder: `cd frontend && npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0 PASS
- 2026-10-29 builder: changed-line coverage frontend `99%` (104 lines, 1 missing: Dialog.tsx:84) vs `b4e3a1e` PASS
- 2026-10-29 builder: `make e2e` exit 0, 6 specs 29 tests, 0 fail, 0 retry PASS (stack left up)
- 2026-10-29 builder: line counts max 271 (ExpenseItemsManager.tsx, unchanged); CompanyLeaseTab.tsx 245, new CompanyLeaseSortHeader.tsx 140; all components/CSS < 300. Deviation: added `CompanyLeaseSortHeader.tsx` (not in Writable list) to keep the tab under 300; no AG Grid (follow-up design). Contract: none.
- 2026-10-29 builder: `Commit: 6e37ed2 15 files +712/-221`
- 2026-10-29 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1) — `aria-required-parent`: `role="columnheader"`/`aria-sort` sit outside any `table`/`row` context (`CompanyLeaseSortHeader.tsx:57,88`, `CompanyLeaseTab.tsx:191`, `CompanyLeaseRow.tsx:30`); sort state is not reliably exposed to assistive tech and the tests only read the attribute. All other checks passed. Round 1/2, back to builder.

- 2026-10-29 builder: red → `Unable to find role "table"` + `expect(element).toHaveAttribute("role", "row")` (3 failing) → green CompanyLeaseTab 29/29
- 2026-10-29 builder: `cd frontend && npm run test:coverage` exit 0, 67 files / 922 tests PASS
- 2026-10-29 builder: `cd frontend && npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0 PASS
- 2026-10-29 builder: changed-line coverage frontend `99%` (104 lines, 1 missing: Dialog.tsx:84) vs `b4e3a1e` PASS
- 2026-10-29 builder: `make e2e` exit 0, 6 specs 29 tests, 0 fail, 0 retry PASS (stack left up)
- 2026-10-29 builder: roles only — `table`/`rowgroup`/`row`/`cell`/`columnheader`; no CSS, DOM, i18n change; CompanyLeaseTab 245, SortHeader 141, Row 98 lines. Contract: none.
- 2026-10-29 builder: `Commit: b4f2b99 5 files +57/-8`
- 2026-10-29 lead: `VERDICT: BLOCKED` (reviewer, round 2/2) — remaining blocker: `<ul role="rowgroup">` (`CompanyLeaseTab.tsx:197`, assertion `CompanyLeaseTab.test.tsx:170`) violates `aria-allowed-role`; `ul` allows `none`/`presentation`, not `rowgroup`. The round-1 defect is fixed (grid now exposes `table`/`row`/`cell`/`columnheader`, `aria-sort` valid). Known minimal fix: `role="none"` on the `<ul>` (rows then owned directly by the table) and drop the rowgroup assertion. Round cap reached — one user decision needed.
- 2026-10-29 lead: `USER_CHANGES_REQUESTED` — user authorised the minimal ARIA fix (`role="none"` on the `<ul>`, drop the rowgroup assertion), explicitly waiving the round cap for one scoped builder pass; Round reset to 0, no second reviewer round. Route to `builder`.
- 2026-10-29 builder: red → `expect(table.querySelector('[role="rowgroup"]')).toBeNull()` failed (`<ul role="rowgroup">` still present), 1 failed | 28 passed → green CompanyLeaseTab 29/29
- 2026-10-29 builder: `cd frontend && npm run test:coverage` exit 0, 67 files / 922 tests PASS; `npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0 PASS
- 2026-10-29 builder: changed-line coverage frontend `99%` (104 lines, 1 missing: Dialog.tsx:84) vs `b4e3a1e` PASS
- 2026-10-29 builder: `make e2e` exit 0, 6 specs 29 tests, 0 fail, 0 retry PASS (stack left up)
- 2026-10-29 builder: deviation — rows stay DOM grandchildren of the table (`ul`/`li` kept, both `role="none"`); "direct child" is asserted as accessibility ownership (nearest non-presentational ancestor role === `table`), which is how browsers flatten `role="none"` wrappers. Roles only; CompanyLeaseTab 245, SortHeader 141, Row 98 lines. Contract: none.
- 2026-10-29 builder: `Commit: 75abb36 2 files +24/-2`
- 2026-10-29 lead: verified `75abb36` — diff is exactly `role="none"` on the `<ul>` + the rowgroup assertion (no CSS/i18n/other file); re-ran `cd frontend && npx vitest run src/pages/settings/CompanyLeaseTab.test.tsx` 29/29 PASS; handoff gates carry test:coverage 67 files/922, lint/format/build exit 0, changed-line 99% (104 lines), `make e2e` 29 tests. `aria-allowed-role` blocker resolved; no third review round (user-authorised exception). Status USER_REVIEW, awaiting acceptance.
- 2026-10-29 lead: DONE — user accepted
- 2026-10-29 lead: `make e2e-down` exit 0 — e2e containers and volumes removed (no `homeofficeexpenses-e2e-*` container left). Task closed.
