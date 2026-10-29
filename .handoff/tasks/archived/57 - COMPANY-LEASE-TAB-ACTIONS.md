# 57 - COMPANY-LEASE-TAB-ACTIONS

Status: DONE
Branch: feat/57-company-lease-tab-actions
Base: b4906e8
Size: M
Round: 1/2
## Goal
Entreprise > "Baux & Frais" (`CompanyLeaseTab`): remove the active-lease notion — no "Bail actif"/"Active lease" badge, no active-first pinning or selected highlight, row click no longer issues `PUT /api/companies` and `company.leaseId` is not read/written — so the list follows the chosen sort; add a per-row "Afficher les frais"/"Show expenses" button before the statement button that expands that lease's details and expenses; move the "Filtrer les baux…"/"Filter leases…" field up next to "Ajouter un bail"/"Add a lease"; relabel statement "Note de frais"/"Expense statement" → "Générer la note de frais"/"Generate expense statement" and edit "Modifier"/"Edit" → "Modifier le bail"/"Edit lease" (fr + en). Out of scope: backend, contract (`CompanyDto.leaseId` field stays), LMNP/person leases, `CompanyLeaseStatementModal`, expense-statement page, PDF. User change (pre-acceptance): remove the row-click expansion — clicking the lease row must no longer expand the details/expenses; only the "Afficher les frais" button does.
## Files
Context (read only): `frontend/src/hooks/useListQuery.ts` (`pinFirst`), `frontend/src/components/settings/SettingsSection.tsx` (`SectionHeader`), `frontend/src/components/settings/CompanyLeaseStatementHistory.tsx`, `frontend/src/pages/settings/CompanyLeaseView.tsx`
Writable: `frontend/src/pages/settings/CompanyLeaseTab.tsx` (+ `.css`, `.test.tsx`), `frontend/src/components/settings/ListToolbar.tsx` (+ `.css`, `.test.tsx`), `frontend/src/pages/settings/SettingsPage.test.tsx`, `frontend/src/i18n/resources/fr.ts`, `frontend/src/i18n/resources/en.ts`, `frontend/cypress/e2e/00-settings.cy.ts`, `frontend/cypress/e2e/05-multi-company.cy.ts`; plus a colocated `CompanyLeaseRow.tsx`/`.css` if the row must be extracted to keep `CompanyLeaseTab.tsx` < 300 lines
Affected tests: `CompanyLeaseTab.test.tsx`, `SettingsPage.test.tsx`, `ListToolbar.test.tsx` (see `codegraph affected`), `i18n.test.ts`, cypress `00-settings.cy.ts`, `05-multi-company.cy.ts`
## Constraints
Contract: none · Money: none · UI French, fr/en key parity · no `any` · no client-side authoritative amount · colocated CSS in `@layer components`, tokens or `@apply` only · `CompanyLeaseTab.tsx` < 300 lines after the change (split the row out, do not delete comments) · builder commits once, nobody pushes.
## Acceptance
- [ ] "Bail actif" badge, active-first ordering (`pinFirst`), selected styling and the `linkLease` PUT are gone; no `PUT /api/companies` from this tab; list order is only the `useListQuery` sort/filter
- [ ] Each row has `btn-afficher-frais-bail-societe-<id>` before `btn-note-frais-bail-societe-<id>`; it expands that lease (`aria-expanded=true`, `CompanyLeaseView` + `ExpenseItemsManager`), switches expansion from another row, toggles closed; row click no longer expands anything (no click handler, no cursor-pointer/keyboard activation on the row; unit + Cypress tests assert the row click leaves the expansion unchanged); the company-level fallback (`company-lease-tab-none`) shows only while no lease is expanded
- [ ] Search field `filtre-baux-societe` (+ clear button, `settings.list.filterLabel` aria-label) sits in the `SectionHeader` action next to `btn-ajouter-bail-societe`; sort/direction/count stay in `ListToolbar`; the other five `ListToolbar` lists unchanged (opt-out prop, default behaviour kept)
- [ ] fr/en: statement "Générer la note de frais"/"Generate expense statement", edit "Modifier le bail"/"Edit lease", new "Afficher les frais"/"Show expenses"; `leaseTab.description` and `leaseView.empty` no longer describe activation/selection; `activeBadge` removed from both resources; i18n parity green
- [ ] Cypress `05-multi-company` and `00-settings` no longer locate a row by "Bail actif"; spec 05 drops the PUT/active-first assertions and uses the new button; gates below pass with real counts
## Commands
frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`, then `scripts/diff-coverage.sh b4906e8 frontend` (>= 80% changed lines); e2e: `make e2e-up` once, then `make e2e` (full suite, one stack, keep it up).
## Evidence
Commit: 9ef4e25 13 files +497/-446
Files: CompanyLeaseTab.tsx/.css/.test.tsx, CompanyLeaseRow.tsx/.css (new), ListToolbar.tsx/.test.tsx, SettingsPage.test.tsx, i18n fr/en, cypress 00-settings/05-multi-company.
Red: vitest targeted (CompanyLeaseTab+SettingsPage+ListToolbar) 15 failed | 41 passed (56).
Green: vitest targeted (+i18n) 73 passed (73).
Red-then-green (new/updated): ListToolbar "hides the search field on request"; CompanyLeaseTab "arrives ... fallback", "does not read ... company.leaseId", "expands a compact lease ...", "expands, switches then collapses ... Afficher les frais", "lists only ... without active badge", "orders ... chosen sort only", "places the lease filter in the section header", "toggles the lease expansion from the row click", "shows an Afficher les frais button before ...", "creates a new poste for the expanded lease", "opens the edit modal ...", "renders ... in English"; SettingsPage "lists ... show-expenses ...", "shows the no-lease sentence"; CompanyLeaseView 2 copy assertions (green: 54 affected files, 799 tests).
PASS cd frontend && npm run test:coverage -- 68 files, 925 tests, 0 failed (rerun after prettier: same counts).
PASS cd frontend && npm run lint -- 0 errors.
PASS cd frontend && npm run format:check -- 3 files rewritten by prettier, recheck clean.
PASS cd frontend && npm run build -- 2427 modules, built in 1.24s.
PASS scripts/diff-coverage.sh b4906e8 frontend -- 92% changed lines (13 lines, 1 missing; CompanyLeaseRow 100%, ListToolbar 100%, CompanyLeaseTab 85.7%).
PASS make e2e-up -- stack built, all services healthy; stack left running.
PASS make e2e -- 6 specs, 27 tests, 27 passing, 0 failing, 0 retried; exit 0 ("All specs passed!").
Contract: none. Money: none.
Deviation: CompanyLeaseView.test.tsx (not in Files) updated for the new `leaseView.empty` copy. New production files: CompanyLeaseRow.tsx 145 lines, CompanyLeaseTab.tsx 263 lines (<300).
reviewer: PASS round 1 — no blocker. Active-lease badge/pinFirst/selected style/linkLease PUT gone, "Afficher les frais" toggle before statement, search moved to section header with other ListToolbar callers on default, fr/en parity, no `any`, no contract/backend change.
Commit: bff83ca 6 files +111/-97 (user change: row click no longer expands)
Files: CompanyLeaseRow.tsx/.css (row is a plain div, no handler/aria-expanded/role/tabIndex; class renamed item-summary), CompanyLeaseTab.tsx comment, CompanyLeaseTab.test.tsx, SettingsPage.test.tsx, cypress 05-multi-company.
Red: vitest CompanyLeaseTab+SettingsPage 5 failed | 46 passed (51) (row click expanded, row aria-expanded row lookups, old row selector).
Green: same 2 files 51 passed (51); affected 6 files 106 passed (106) (LlmBadge, useDraftBlock, GenerateExpenseStatementPage, CompanyLeaseTab, SettingsPage, router).
Red-then-green: CompanyLeaseTab "ignores a click on the lease row without persisting" (row not BUTTON, no aria-expanded/role/tabindex/cursor-pointer, no details, no lease expense fetch); SettingsPage "shows the lease view ..." (row click leaves fallback, button expands); SettingsPage 4 expansion flows now use btn-afficher-frais-bail-societe-5.
PASS cd frontend && npm run test:coverage -- 68 files, 925 tests, 0 failed.
PASS cd frontend && npm run lint -- 0 errors.
PASS cd frontend && npm run format:check -- 2 files rewritten by prettier, recheck clean.
PASS cd frontend && npm run build -- built in 1.25s (2427 modules).
PASS scripts/diff-coverage.sh b4906e8 frontend -- 92% changed lines (13 lines, 1 missing; CompanyLeaseRow 100%, CompanyLeaseTab 85.7%).
PASS make e2e -- 6 specs, 27 tests, 27 passing, 0 failing, 0 retried; exit 0 ("All specs passed!"); stack left running.
Deviation: first make e2e run was red in spec 05 on the ordering selector (`.company-lease-tab-list-item > [data-cy^=bail-societe-]` no longer a direct child); fixed to `.company-lease-tab-item-summary`, spec re-ran 2/2 then full suite green. No `.handoff`, backend, contract or `.codegraph` change.
Contract: none. Money: none.
reviewer: PASS round 1 (post user change bff83ca) — row summary is a plain div, no handler/role/tabIndex/aria-expanded/cursor, only btn-afficher-frais-bail-societe-<id> toggles; new assertions would fail on the pre-fix code; no backend/contract/i18n change.
lead: DONE — user accepted
