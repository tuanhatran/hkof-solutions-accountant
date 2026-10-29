# 72 - LMNP-LISTS-COMPANY-DESIGN
Status: USER_REVIEW
Branch: feat/72-lmnp-lists-company-design
Base: ab1e21b
Size: M
Round: 1/2
## Goal
Match the LMNP `Baux`/`Personnes` lists to the Company settings design: search, live count and compact sort move into the card header after the Add button, and both lists become bordered tables with asc/desc sortable headers. Out of scope: backend, contract, Company/Employee refactor, modals. Follow-up (user): move `select-rent-receipts-address` into the card header between the Add button and the search box, keeping only the select itself (no FieldGroup label/help block).
## Files
Context (read only): `frontend/src/pages/settings/{CompanyLeaseTab.tsx,CompanyLeaseSortHeader.tsx,CompanyLeaseTab.css,EmployeeSection.tsx,EmployeeSortHeader.tsx,EmployeeSection.css}`, `frontend/src/components/settings/{ListToolbar.tsx,SettingsSection.tsx}`, `frontend/src/hooks/useListQuery.ts`
Writable: `frontend/src/components/settings/{LeaseSection.tsx,LeaseSection.css,LeaseSection.test.tsx,PersonnesSection.tsx,PersonnesSection.css,PersonnesSection.test.tsx}`, new `frontend/src/components/settings/{SettingsListSortHeader.tsx,SettingsListSortHeader.css}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`
Affected tests: `LeaseSection` (3/14 already red on main: filter/sort tests lag the removed toolbar — converge them on the new header), `PersonnesSection`, `LmnpPage`, `SettingsPage`, `router`.
## Constraints
Contract: none · no money · UI French · no `any` · builder commits once (explicit paths), nobody pushes. Mirror `CompanyLeaseTab`: `SectionHeader` action = Add + `ListSearch` + `filter-count-leases|persons` + `SettingsListMobileSort`, rendered only when the list is non-empty. New `SettingsListSortHeader` (columns param) = `hidden md:grid` row, `role="columnheader"`, `aria-sort`, arrows, `Actions`; lists in a `role="table"` bordered container. Lease columns `lease, company, rent, charges, total` (add charges/total comparators); person columns `person, address, signatures`; default asc, inactive column starts asc. Selectors: `sort-leases-<col>`, `sort-persons-<col>`, `sort-leases-compact[-direction]`, `sort-persons-compact[-direction]`, `filter-leases`, `filter-clear-leases`, `filter-persons`, `filter-clear-persons`; keep `leases-headers`, `persons-headers`, `lease-${id}`, `person-${id}`, `company-lease-${id}`, `lease-total-${id}`, `person-signatures-${id}`, all `btn-*`; add `columns.actions` fr/en; tokens only, CSS < 300 lines.
## Acceptance
- [ ] Both card headers show Add + search + live count + mobile sort as Company; no `ListToolbar` in either LMNP section; filters, no-match, empty/loading/error states unchanged.
- [ ] Both lists are bordered tables like `company-lease-tab-table`; clicking a header sorts, active column toggles asc/desc with correct `aria-sort`; compact mobile sort works; i18n fr/en aligned; unit tests green.
- [ ] Address select sits in the Baux card header, in order Add → address select → search/count/compact sort, with no visible label or help text and an accessible `aria-label`; `select-rent-receipts-address` and its behaviour are unchanged.
- [ ] `test:coverage`, lint, format:check, build pass; changed-line coverage >= 80%; full E2E green.
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh ab1e21b frontend` (>= 80%) · `make e2e-up` once then `make e2e` (frontend production code; keep stack up).
## Evidence
- Files: `frontend/src/components/settings/{SettingsListSortHeader.tsx,SettingsListSortHeader.css,LeaseSection.tsx,LeaseSection.css,LeaseSection.test.tsx,PersonnesSection.tsx,PersonnesSection.css,PersonnesSection.test.tsx}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`, `frontend/src/pages/settings/CompanyLeaseTab.test.tsx` (deviation).
- RED `npx vitest run LeaseSection.test.tsx PersonnesSection.test.tsx`: 9 failed | 22 passed (31) before implementation.
- GREEN same command: 2 files, 31 passed (31).
- RED→GREEN: header sort + aria-sort and charges/total comparators (leases); header sort, address comparator and aria-sort (persons); card-header search + live count + compact sort (both sections).
- PASS `npx vitest run LmnpPage SettingsPage router ListToolbar`: 6 files, 78 passed.
- PASS `cd frontend && npx vitest run --coverage`: 68 files, 928 passed (928).
- PASS `npm run lint`: 0 errors.
- PASS `npm run format:check`: all files match Prettier.
- PASS `npm run build`: tsc -b + vite build, built in 1.43s (chunk-size warning only).
- PASS `scripts/diff-coverage.sh ab1e21b frontend`: 100% (34 changed lines, 0 missing) on the 3 production files.
- E2E PASS `make e2e-up` (stack left up) then `make e2e`: exit 0, 6/6 specs, 29/29 tests, none on retry.
- Deviation: base ab1e21b shortened `settings.company.leaseTab.description` without updating `CompanyLeaseTab.test.tsx` (red on main); aligned that one English assertion, no Company/Employee production change.
- Deviation: Prettier re-wrapped two base `description` lines in fr/en (format:check was red at base).
- Note: lease/person `<ul>` keep list/listitem roles (LmnpPage asserts them); `role="table"` container plus `role="row"/columnheader` headers carry the table semantics.
- Contract: none.
- Commit: a4a84d5 11 files +630/-183.
- 2026-10-29 lead: `VERDICT: PASS` (reviewer, round 1)
- 2026-10-29 lead: `USER_CHANGES_REQUESTED — move select-rent-receipts-address into the card header between Add a lease and the filter box; keep only the select box` (Round reset to 0)
- Round 1 files: `frontend/src/components/settings/{LeaseSection.tsx,LeaseSection.css,LeaseSection.test.tsx}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
- RED `npx vitest run LeaseSection.test.tsx -t "keeps only the address select"`: 1 failed | 16 skipped (17) — select absent from `.card-header`.
- GREEN `npx vitest run LeaseSection.test.tsx`: 1 file, 17 passed (17).
- PASS affected `npx vitest run PersonnesSection LmnpPage SettingsPage router i18n CompanyLeaseTab`: 6 files, 103 passed.
- PASS `npm run test:coverage`: 68 files, 929 passed (929).
- PASS `npm run lint`: 0 errors. PASS `npm run format:check`: all files match Prettier. PASS `npm run build`: tsc -b + vite build, built in 1.10s (chunk-size warning only).
- PASS `scripts/diff-coverage.sh ab1e21b frontend`: 100% (37 changed lines, 0 missing).
- E2E PASS `make e2e` (stack already up): exit 0, 6/6 specs, 29/29 tests, none on retry.
- Deviation: Prettier re-wrapped the provided red test's querySelector lines (format gate); assertions unchanged.
- Implementation: select moved to header action Add → select → search/count/compact sort, `aria-label` = `settings.lease.section.addressLabel`, class `lease-section-address-select`, `FieldGroup` import and `.lease-section-address` CSS removed, `addressHelp` dropped from fr/en (no other reference).
- Contract: none.
- Commit: 3822e2d 5 files +73/-39.
- 2026-10-29 lead: `VERDICT: PASS` (reviewer, round 1, follow-up commit 3822e2d)
