# 56 — LIST-SORT-FILTER

Status: DONE
Branch: feat/56-list-sort-filter
Base: b57196c
Size: L
Round: 1/2

## Goal
Add a text filter, a sort field and an asc/desc toggle to the five settings management lists (employees, persons, LMNP leases, company leases, expense items), client-side and accent-insensitive, with a no-match state and a visible count; list contents/order and all existing actions otherwise unchanged. Out of scope: History/Templates lists, template compare (57), backend filters or pagination, contract/money/migration/LLM.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` · `frontend/src/index.css` (`.field`, `.card`, `.badge`, `.number`) · `frontend/src/components/settings/SettingsSection.tsx` · `frontend/src/components/ui/{Button,FieldGroup}.tsx`
Writable: `frontend/src/hooks/useListQuery.ts` (new) · `frontend/src/components/settings/ListToolbar.tsx` + `.css` (new) · `frontend/src/pages/settings/{EmployeeSection.tsx,CompanyLeaseTab.tsx,ExpenseItemsManager.tsx}` · `frontend/src/components/settings/{PersonnesSection.tsx,LeaseSection.tsx}` · `frontend/src/i18n/resources/{fr,en}.ts`
Writable tests: `frontend/src/hooks/useListQuery.test.ts` + `frontend/src/components/settings/ListToolbar.test.tsx` (new) · `frontend/src/pages/settings/{EmployeeSection,CompanyLeaseTab,ExpenseItemsManager}.test.tsx` · `frontend/src/components/settings/{PersonnesSection,LeaseSection}.test.tsx` · `frontend/src/i18n/i18n.test.ts`
Affected tests: the eleven files from `codegraph affected` (`AppShell`, `LlmBadge`, `useDraftBlock`, `LmnpPage`, `SettingsPage`, `router` + the five settings tests); full suite is the gate.

## Constraints
Contract: none. Client-side display only: no new monetary value, never sum rent+charges, `Number()` only inside comparators; keep every existing `data-cy`, CRUD/dialog/selection/expansion/receipt behavior.
Hook `useListQuery<T>({ items, searchText, sorts: {value, compare}[], defaultSort, pinFirst? })` → `{ query, setQuery, sort, setSort, direction, toggleDirection, visible, total, isFiltered }`; filter trims, strips diacritics (`normalize("NFD").replace(/\p{Diacritic}/gu,"")`), lowercases `fr`, substring match; never mutates `items`; `[...filtered].sort()`, inverted on `desc`; `pinFirst` items stay first in both directions.
`ListToolbar` (settings-scoped): search input (`field`), sort `<select>` (`field`), direction `Button` ghost small (`ArrowUp`/`ArrowDown`, `aria-label`), clear `X` when query non-empty, count in `aria-live="polite"`; `flex-col sm:flex-row`, no overflow at 375px. `data-cy`: `filtre-<list>`, `tri-<list>`, `tri-direction-<list>`, `filtre-effacer-<list>`, `filtre-compteur-<list>`.
Wiring — employees (`salaries`: name default, title, signatures; search name/email/address/title) · persons (`personnes`: name default, signatures; name/address) · LMNP leases (`baux`: lease default, company, rent; landlord/tenant/address/company) · company leases (`baux-societe`: lease default, rent, charges; pin active via `pinFirst`; address/landlord) · expense items (`postes`: order default, label, proRata, periodicity; label/code/supplier; add `data-cy={`poste-${code}`}` on rows).
Toolbar rendered only when `total > 0`; no-match message `data-cy="aucun-resultat-<list>"` replaces headers/rows; sort labels reuse existing `columns.*`/`table.*` keys.
i18n (FR values, EN mirrored): `settings.list.{filterLabel,sortLabel,ascending,descending,clear,noMatch,count}` ("Filtrer la liste", "Trier par", "Tri croissant", "Tri décroissant", "Effacer le filtre", "Aucun résultat pour « {{query}} ».", "{{visible}} sur {{total}}") + per-list filter placeholders ("Filtrer les salariés…", "Filtrer les personnes…", "Filtrer les baux…", "Filtrer les postes…"). No existing key changes.

## Acceptance
- [ ] All five lists filter accent/case-insensitively and sort with a working direction toggle; active company lease stays first; CRUD, dialogs, selection and expansion unchanged.
- [ ] Toolbar hidden on empty lists; no-match message and count correct; no overflow at 375px.
- [ ] New tests written first (watched red) cover hook, toolbar and each list; i18n parity green; full suite, coverage ≥80%, one full E2E run green.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh b57196c frontend`
- `make e2e-up` once, then `make e2e` (keep the stack up; `make e2e-down` only after acceptance)

## Evidence

Files: new `useListQuery.ts`(+test), `ListToolbar.tsx/.css`(+test); wired EmployeeSection, PersonnesSection, LeaseSection, CompanyLeaseTab, ExpenseItemsManager (+tests); fr/en i18n + i18n.test. `index.css`, backend, `openapi/openapi.yaml` untouched.
TDD red: 8 test files failed, 16 tests failed / 88 passed — missing `useListQuery`/`ListToolbar`, absent toolbar controls and `settings.list.*` keys.
TDD green: hook 9/9, toolbar 4/4, employees 17/17, persons 14/14, LMNP leases 14/14, company leases 26/26, expense items 17/17, i18n 20/20.
PASS `cd frontend && npm run test:coverage` — 68 files, 845 tests passed, 0 failed.
PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (tsc -b + vite).
PASS `scripts/diff-coverage.sh b57196c frontend` — 90% changed-line coverage (76 lines, 7 missing).
PASS affected regression: AppShell 12, LlmBadge 11, useDraftBlock 5, LmnpPage 16, SettingsPage 26, router 3 (73/73).
PASS `make e2e-up` then `make e2e` exit 0 — 6 specs, 26 tests, 0 failing (00-settings 5, 01 1, 02 12, 03 1, 04 5, 05 2); stack left up.
Deviations: none. Contract: none.
Commit: b848fc7 18 files +1764/-442
lead: VERDICT: PASS (reviewer, round 1) — filter/sort/pinning correct, no mutation, `data-cy` retained, FR/EN mirrored, Writable list respected.
lead: DONE — user accepted
