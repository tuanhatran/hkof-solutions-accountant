# EMPLOYEES-SECTION-TABLE-SORT

Status: DONE
Branch: feat/70-employees-section-table-sort
Base: fb3cc19
Size: S
Round: 0/2

## Goal

Merge the employee header row (`employees-headers`) and the employee list into one bordered table designed like `company-lease-tab-table`, with sortable headers for all four columns; out of scope: backend, contract, other settings lists, Cypress specs.

## Files

Context (read only): `frontend/src/pages/settings/CompanyLeaseTab.tsx` (`sortBy`, header actions) · `frontend/src/pages/settings/CompanyLeaseSortHeader.tsx` (`SORT_COLUMNS`, `aria-sort`, compact sort) · `frontend/src/pages/settings/CompanyLeaseTab.css` (`.company-lease-tab-table`, headers, sort) · `frontend/src/components/settings/ListToolbar.tsx` (`ListSearch`) · `frontend/src/hooks/useListQuery.ts`
Writable: `frontend/src/pages/settings/EmployeeSection.tsx` · `frontend/src/pages/settings/EmployeeSection.css` · new `frontend/src/pages/settings/EmployeeSortHeader.tsx` · `frontend/src/pages/settings/EmployeeSection.test.tsx` · `frontend/src/i18n/resources/fr.ts` · `frontend/src/i18n/resources/en.ts`
Affected tests: `frontend/src/pages/settings/EmployeeSection.test.tsx` (primary), `frontend/src/pages/settings/SettingsPage.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/i18n/i18n.test.ts`

## Constraints

Contract: none · no money · UI French · no `any` · builder commits once (explicit paths), nobody pushes. Mirror CompanyLeaseTab: remove the employees `ListToolbar`; put `ListSearch` (`filter-employees`), live count (`filter-count-employees`) and compact mobile sort in the SectionHeader action area (only when the company is selected and the list is non-empty); keep the add button. Container `data-cy="employee-section-list"` with `role="table"` holds the header row `data-cy="employees-headers"` (`role="row"`, 5 `role="columnheader"` incl. Actions) and the `ul` rows (`role="none"`/`row`/`cell`). Sort buttons `sort-employees-name|title|signatures|contact` with `aria-sort` and arrows; compact `sort-employees-compact` + `sort-employees-compact-direction` below `md`; contact comparator = email then address, `fr`, `sensitivity: "base"`. Keep `employee-${id}`, `employee-signatures-${id}`, `btn-*` selectors and `.employee-section` on the section; no-match/loading/error/empty states unchanged and no-match hides the table. Reuse `settings.list.*` and existing `settings.employees.columns.*`; add `columns.actions` ("Actions") in both locales. Extract `EmployeeSortHeader`+`EmployeeMobileSort` (EmployeeSection.tsx is at 278 lines); new classes stay in `EmployeeSection.css` with `@reference`/`@layer components`, tokens only, under 300 lines.

## Acceptance

- [ ] Desktop: one bordered table (same visual pattern as `company-lease-tab-table`) with clickable Salarié/Intitulé/Signatures/Coordonnées headers, default name ascending, active column toggles, `aria-sort` correct; mobile: compact select + direction control.
- [ ] Header area: search filters, live count updates, no `sort-employees`/`sort-direction-employees` toolbar selectors; rows and action buttons keep their data-cy; no-match shows only the empty state.
- [ ] French/English keys aligned; tests updated for the new classes/selectors; component CSS < 300 lines; changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh fb3cc19 frontend` (>= 80%) · `make e2e-up` once then `make e2e` (production code; keep the stack up).

## Evidence

- Files: EmployeeSection.tsx (283 lines), new EmployeeSortHeader.tsx (182), EmployeeSection.css (103), EmployeeSection.test.tsx, fr.ts, en.ts.
- RED: `npx vitest run src/pages/settings/EmployeeSection.test.tsx` -> 7 failed | 14 passed (21).
- GREEN: same command -> 21 passed (1 file).
- Regression: SettingsPage + router + i18n -> 46 passed (3 files).
- PASS `npm run test:coverage` -> 67 files, 926 tests passed; EmployeeSortHeader 100% lines.
- PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (2430 modules, exit 0).
- PASS `scripts/diff-coverage.sh fb3cc19 frontend` -> 100% (27 changed lines, 0 missing).
- PASS E2E: `make e2e-up` then `make e2e` -> exit 0, 6 specs, 29 tests passed, 0 failed/pending/skipped; stack left up.
- Column display order kept as name, title, contact, signatures (existing layout); SORT_COLUMNS follows it.
- Deviation: none. Contract impact: none.
- Commit: a723f71 6 files +540/-162
- 2026-10-29 lead: S commit skim — PASS (selectors `employee-section-list`/`employees-headers`/`sort-employees-*`, roles, CSS 103 lines, EmployeeSection 283 lines verified).
- 2026-10-29 lead: DONE — user accepted; `make e2e-down` removed the e2e stack and network.
