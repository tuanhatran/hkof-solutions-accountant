# 29 - COMPANY-LEASE-EXPAND-EDIT

Status: DONE
Branch: COMPANY-LEASE-EXPAND-EDIT
Size: M
Round: 0/2

## Goal

In Entreprise > "Baux & Frais": remove the `select-bail-actif` dropdown; the lease list stays compact (`company-lease-tab-item`, selected `company-lease-tab-item-selected`); clicking an item selects it (persisted through the existing `PUT /api/companies` linkLease flow, backend pro-rata stays authoritative) and expands it inline with `company-lease-view-details` showing the lease details plus its expenses (`ExpenseItemsManager` keyed to that lease); each compact item gets a "Modifier" button opening the shared `LeaseForm` modal in edit mode (`item=lease`, FormModal already provides "Annuler"/"Valider"). USER_CHANGES_REQUESTED (2026-10-25, clarified — supersedes the earlier "Plus de détail" button request, which is dropped): arriving on the tab, all leases display collapsed, even when a bail actif is linked; the list is sorted with the active lease first, the others in existing order; clicking a compact row selects it as bail actif (persisted through the existing linkLease `PUT /api/companies`) and expands its `company-lease-view-details` + its expenses inline; clicking the expanded row collapses it (the lease stays active — no deselect); clicking another row moves selection + expansion to it (accordion, one expanded at a time); the per-row "Modifier" button is unchanged and affects neither selection nor expansion; the null-lease fallback (empty lease view + unassigned expenses) renders only when no lease is selected. Out of scope: backend, contract, LMNP/person leases, rent receipts, adding notes-de-frais UI where none exists.

## Files

Context (read only): `frontend/src/components/settings/LeaseForm.tsx`, `frontend/src/components/ui/FormModal.tsx`, `frontend/src/api/endpoints.ts` (`leases.update`, `companies.update`), `frontend/src/api/queries.ts`, `.opencode/instructions/30-frontend.md`
Writable: `frontend/src/pages/settings/CompanyLeaseTab.tsx` + `.css` + `.test.tsx`, `frontend/src/pages/settings/CompanyLeaseView.tsx` + `.css` + `.test.tsx` (fold into the expanded item or repurpose; re-cover any deleted test), `frontend/src/pages/settings/ExpenseItemsManager.tsx` (only if a prop change is unavoidable), `frontend/cypress/e2e/05-multi-company.cy.ts`
Affected tests: `CompanyLeaseTab.test.tsx`, `CompanyLeaseView.test.tsx`, `SettingsPage.test.tsx`, cypress `05-multi-company.cy.ts`

## Constraints

Contract: none. Money: no client-side authoritative amount — pro-rata and totals come from the backend response. UI French · no `any` · colocated prefixed CSS in `@layer components`, tokens only · keyboard-accessible expand/collapse (button semantics, not div onClick) · classes < 300 lines (split `CompanyLeaseTab` if folding details pushes it over) · no commit or push.

## Acceptance

- [ ] No dropdown remains; `select-bail-actif` gone from src and cypress
- [ ] Clicking a compact lease item selects it (persists via existing linkLease mutation), marks it `company-lease-tab-item-selected` and expands `company-lease-view-details` with lease details + that lease's expenses; other items stay compact
- [ ] "Modifier" on an item opens `LeaseForm` prefilled with that lease; "Annuler" closes without saving, "Valider" saves via `PUT /api/leases/{id}` and the list refreshes
- [ ] Loading/error/empty states kept; cypress `05-multi-company` rewritten for click-to-select and green
- [ ] coverage gates met: frontend `npm run test:coverage` >= 90% lines/statements/functions/branches, backend `./mvnw -B verify` >= 90% LINE/BRANCH (unchanged code, record real numbers); production classes < 300 lines
- [ ] One full Cypress suite run, every spec and test green on first pass, exact command + exit code in evidence
- [ ] (change request) On tab arrival every lease is collapsed, including when a bail actif is linked
- [ ] (change request) The active lease is listed first; the others keep their order
- [ ] (change request) Row click selects as bail actif (persists via existing linkLease mutation) and expands `company-lease-view-details` + that lease's expenses; clicking the expanded row collapses it and keeps it active; clicking another row moves selection + expansion (one expanded at a time)
- [ ] (change request) No "Plus de détail"/"Moins de détail" button anywhere; "Modifier" unchanged and does not toggle selection or expansion
- [ ] (change request) cypress `05-multi-company` updated for the accordion behavior and green

## Commands

- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run typecheck && npm run lint && npm run format:check && npm test && npm run test:coverage && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- 2026-10-25 builder: files changed (git diff main --stat): frontend/src/pages/settings/CompanyLeaseTab.tsx/.css/.test.tsx, CompanyLeaseView.tsx/.css/.test.tsx, SettingsPage.test.tsx, frontend/cypress/e2e/05-multi-company.cy.ts.
- 2026-10-25 builder: RED→GREEN — red: 12 failed / 21 passed across the 3 rewritten Vitest files (dropdown present, no toggle/Modifier buttons, card header rendered); green targeted: 33/33; full `npm test` PASS 54 files / 535 tests.
- 2026-10-25 builder: `npm run typecheck` PASS · `npm run lint` PASS · `npm run format:check` PASS · `npm run build` PASS.
- 2026-10-25 builder: `npm run test:coverage` PASS — 97.13% stmts / 90.36% branch / 94.81% funcs / 97.28% lines (gate >= 90%).
- 2026-10-25 builder: backend `./mvnw -B verify` PASS (code untouched) — 497 tests, 0 failures, JaCoCo LINE 97.34% / BRANCH 92.14% (gate >= 90%).
- 2026-10-25 builder: E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0 (E2E_EXIT=0, /tmp/e2e29.log) — "All specs passed!", 6 specs, 26 tests, 26 passing, 0 failing/pending/skipped, single run, no retries; teardown `down -v --remove-orphans` exit 0 (lead).
- 2026-10-25 builder: contract impact none; `codegraph sync` done; `select-bail-actif` absent from src and cypress (only absence assertions in tests). No deviations.
- `2026-10-25 reviewer: PASS (round 1) — diff-scoped review of 8 app files; no client-side authoritative amounts, linkLease optimistic/rollback verified, fallback branch exclusive (no duplicate expense views), data-cy consistent across src/vitest/cypress, no any, classes < 300 lines, contract untouched, red-then-green plausible (all new assertions target post-fix-only structure); targeted re-run CompanyLeaseTab+CompanyLeaseView 15/15 green; evidence numbers internally consistent.`
- `2026-10-25 lead: USER_CHANGES_REQUESTED — add "Plus de détail"/"Moins de détail" expand button per lease; keep bail-actif row-click behavior; all leases collapsed by default (Round reset to 0)`
- `2026-10-25 lead: USER_CHANGES_REQUESTED (clarified, supersedes the button request) — all leases collapsed on arrival; active lease sorted first; row click = select (persisted bail actif) + expand, second click collapses keeping it active, clicking another row moves selection+expansion; no Plus/Moins de détail button; Modifier unchanged. Routing to builder, Round 0/2.`
- 2026-10-25 builder (accordion delta, Round 0): files changed — frontend/src/pages/settings/CompanyLeaseTab.tsx, CompanyLeaseTab.test.tsx, SettingsPage.test.tsx, frontend/cypress/e2e/05-multi-company.cy.ts, frontend/cypress/e2e/00-settings.cy.ts (DEVIATION: 00-settings.cy.ts is outside the writable list — it asserted expanded-on-arrival details/postes and had to expand the active row first; no other spec affected). Fallback flash fix: null-lease fallback now also waits for the leases query (no transient `expenseItems.list(1,true,null)` while loading). Error rollback collapses all rows.
- 2026-10-25 builder: RED→GREEN — red: 11 failed / 23 passed (CompanyLeaseTab+SettingsPage: expanded-on-arrival, second-click deselect PUT, no active-first ordering, aria-expanded=selection); green targeted: settings directory 91/91 (10 files).
- 2026-10-25 builder: single chain exit 0 — `npm run typecheck` PASS · `npm run lint` PASS · `npm run format:check` PASS · `npm test` PASS 54 files / 539 tests · `npm run test:coverage` PASS 97.15% stmts / 90.29% branch / 94.83% funcs / 97.29% lines (gate >= 90%) · `npm run build` PASS.
- 2026-10-25 builder: backend `./mvnw -B verify` PASS (code untouched) — 497 tests, 0 failures, 1 skipped, JaCoCo LINE 97.34% / BRANCH 92.14% (gate >= 90%).
- 2026-10-25 builder: E2E attempt 1 exit 2 — 00-settings 2 failing (stale expanded-on-arrival assumptions, /tmp/e2e29b.log); root-caused and fixed the spec (attempt 1 of 2). Attempt 2: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0 (E2E_EXIT=0, /tmp/e2e29b-r2.log) — "All specs passed!", 6 specs, 26 tests, 26 passing, 0 failing/pending/skipped, single run, no retries; teardown `down -v --remove-orphans` exit 0. Backend access log confirms exactly 2 `PUT /api/companies` per annexe company in spec 05 (collapse/re-expand of the active lease fired none).
- 2026-10-25 builder: contract impact none (openapi/openapi.yaml and schema.ts untouched); no client-side authoritative amount; no Plus/Moins de détail button; `codegraph sync` done. Status → REVIEW.
- 2026-10-25 reviewer: PASS (round 2, accordion delta) — diff-scoped review of 9 app files; toggleLease persists via linkLease PUT only on active-lease change (expand/collapse of the active row fires none), onError rollback resets selection and collapses all rows, active-first ordering via two stable filters, expansion decoupled from selection (arrival collapsed with company.leaseId set), fallback exclusive (selectedLease===null, guarded by \!leases.isPending, no duplicate ExpenseItemsManager), aria-expanded=expansion / badge=selection, Modifier neutral, no any, no client-side amount, contract+schema+backend untouched (git status), CompanyLeaseTab.tsx 246 lines < 300; both flagged deviations accepted (00-settings.cy.ts edit minimal and required by collapsed-on-arrival; isPending guard prevents transient unassigned-expenses flash); red-then-green credible (new assertions target post-delta-only structure: aria-expanded, .company-lease-tab-item-toggle order, btn-modifier-bail-societe-N, no-PUT-on-second-click); targeted re-run CompanyLeaseTab+SettingsPage 34/34 green; evidence numbers internally consistent, single authoritative E2E run exit 0, 6 specs 26/26 no retries.
