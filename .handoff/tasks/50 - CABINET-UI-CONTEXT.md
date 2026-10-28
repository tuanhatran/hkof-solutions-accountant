# 50

Status: DONE
Branch: feat/50-cabinet-ui-context
Base: 93e1677
Size: L
Round: 2/2

## Goal
Make the UI read as an accounting workbench, not an AI landing page: expose generation in the navigation, add a persistent company context bar wired to `useCompanyStore`, add History create actions, and replace the warm paper/forest/copper/serif tokens with the flat neutral "Cabinet" system (white surfaces, 1px borders, ≤8px radii, one green accent, mono tabular amounts). Out of scope: backend/contract/money/migration/LLM, global period state or moving the month input, generation-page copy ("Calcul backend", "Étape 1"), History company filter (already cross-company), bundled webfonts, new E2E specs.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` · `product_prompt.md` (navigation, ~line 202) · `frontend/src/router.tsx` · `frontend/src/state/company.ts` · `frontend/src/i18n/index.ts`
Writable: `frontend/src/index.css` · `frontend/src/components/layout/{AppShell,AppNav}.{tsx,css}` · `frontend/src/components/layout/PageHeader.css` · `frontend/src/components/layout/CompanySwitcher.{tsx,css}` (new) · `frontend/src/components/ui/AiBadge.tsx` · `frontend/src/pages/settings/CompanySection.{tsx,css}` · `frontend/src/pages/history/HistoryPage.{tsx,css}` · `frontend/src/i18n/resources/{fr,en}.ts` · tests `frontend/src/components/layout/{AppShell,AppNav,CompanySwitcher}.test.tsx`, `frontend/src/pages/history/HistoryPage.test.tsx`, `frontend/src/pages/settings/SettingsPage.test.tsx`
Affected tests (codegraph): the five above · `components/llm/LlmBadge.test.tsx` · `hooks/useDraftBlock.test.tsx` · `router.test.tsx` · `pages/admin-llm/AdminLlmPage.test.tsx` · `pages/expense-statement/GenerateExpenseStatementPage.test.tsx` · `pages/rent-receipt/GenerateRentReceiptPage.test.tsx` · `pages/settings/LmnpPage.test.tsx` · full frontend suite · full E2E
Symbols: `SECTIONS`/`SideNavigation`/`MobileNavigation` · `AppShell`/`Brand`/topbar · `CompanySwitcher` (new) · `CompanySection`/`selectedId`/`setActiveCompany` · `HistoryPage`/`PageHeader.actions` · tokens `--color-*`/`--font-*`/`--shadow-*` and `.card`/`.field`/`.btn`/`.badge`/`.eyebrow`/`.segmented`/`.expense-table`/`.glass-surface` · routes `/generer/quittance`, `/generer/note-frais`, `/historique`, `/configuration/entreprise`, `/configuration/lmnp`, `/admin`

## Constraints
Contract: none. No `any`, no client money, no backend edit; French UI, EN parity in the same change; tokens only in component CSS (no hex outside `index.css`); component CSS <300 lines; keep existing `data-cy` (`tab-historique`, `tab-configuration`, `tab-lmnp`, `tab-admin`, `select-societe`, `dialogue-*`), add `tab-quittance`, `tab-note-frais`, `select-societe-active`; the no-`/generer/` and no-selector assertions are deliberately updated, never deleted; do not commit the untracked `.qoder/skills/` or `.opencode/skills/`; builder commits once with explicit paths, nobody pushes.

## Acceptance
- [ ] Sidebar and mobile nav: Documents (Quittance → `/generer/quittance`, Note de frais → `/generer/note-frais`), Suivi (Historique), Réglages (Société, LMNP, Admin IA); active state and data-cy unique in both navigations; FR/EN.
- [ ] Topbar context bar shows a "Société active" selector (`select-societe-active`) when ≥1 company; switching calls `setActiveCompany`, persists, and changes company-scoped data; Settings select/create/delete stays in sync; nothing when the list is empty; mobile header is light.
- [ ] Populated History header offers the two generation actions and navigates; empty state unchanged.
- [ ] Visual: flat `#f6f7f5` canvas and white surfaces, 1px borders, radii ≤8px, one green accent; no radial gradients, glass blur, copper or serif in app chrome; `.badge` normal-case 11px, `.number` mono/tabular, H1 24px, body contrast ≥4.5:1, no horizontal overflow at 375px.
- [ ] New CompanySwitcher tests, History actions test, Settings active-company test; updated nav/topbar assertions; full suite, changed-line coverage ≥80%, full E2E green.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh 93e1677 frontend`
- full E2E once: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`; if Docker is unavailable set BLOCKED.

## Evidence
Append one line per event; never rewrite a previous line.
- Files: AppNav.{tsx,css,test}, AppShell.{tsx,css,test}, CompanySwitcher.{tsx,css,test}(new), PageHeader.css, AiBadge.tsx, CompanySection.tsx, HistoryPage.{tsx,test}, fr.ts, en.ts, index.css, SettingsPage.test, cypress/e2e/05-multi-company.cy.ts.
- RED AppNav.test: 6/6 failed (missing Documents/Quittance/Note de frais keys and links).
- GREEN AppNav.test: 6/6 passed; CompanySwitcher.test+AppShell.test 12/12 passed (red: 7 failures before the component and shell wiring).
- RED SettingsPage.test: 4/26 failed (create/select/sync/delete active company); GREEN: 26/26 passed.
- RED HistoryPage.test: 1/23 failed (no populated-header actions); GREEN: 23/23 passed.
- PASS affected batch `npx vitest run <layout,llm,ui,hooks,router,admin-llm,expense-statement,rent-receipt,lmnp,settings,history>`: 14 files, 184 tests.
- PASS `npm run test:coverage`: 64 files, 776 tests.
- PASS `scripts/diff-coverage.sh 93e1677 frontend`: 27 changed lines, 0 missing, 100%.
- PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (tsc + vite, 2419 modules).
- PASS E2E exit 0: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`; 6 specs, 26 tests, "All specs passed!", no retries; teardown `down -v --remove-orphans` exit 0.
- Deviations: updated existing `cypress/e2e/05-multi-company.cy.ts` only (old "no selector" assertion and HKOF generation now selects HKOF in the new context bar; no new spec). No other file outside handoff scope.
- Contract impact: none (`openapi/` and `api/schema.ts` untouched).
- Commit: 8425278 19 files +504/-164.
- 2026-10-28 lead: VERDICT: BLOCKERS (2) (reviewer, round 1/2) — (1) `.number` is emitted before amount component `font-display` at equal specificity, so `RentReceiptAmountFields`/`ExpenseAmountFields` totals compute sans, not mono (also `ExpenseGenerationFooter`); move `.number` to `@layer utilities` or drop `font-display` from amount rules. (2) `AppShell.css` `.app-shell-footer` 10px `text-ink-soft/80` on white is 3.75:1; use full-opacity `text-ink-soft`. E2E deviation accepted as necessary and minimal.
- Round 1 fixes, files: `frontend/src/index.css` (`.number` moved unchanged from `@layer components` to `@layer utilities`), `frontend/src/components/layout/AppShell.css` (`.app-shell-footer` `text-ink-soft/80` → `text-ink-soft`). No new test needed (declarative CSS cascade fix, no behavior/JS change).
- Cascade verified in built `dist/assets/index-CSwv165j.css` (node layer-block parser over byte offsets): layer block order `properties -> theme -> base -> components -> utilities`; `.number` at offset 211293 in `utilities`, `.rent-receipt-amount-fields-total-value` (191026), `.expense-amount-fields-estimate-value` (155794), `.expense-generation-footer-total` (164333) all in `components` → utilities declared last wins at equal specificity; emitted rule `.number{font-family:var(--font-mono);font-variant-numeric:tabular-nums}`, no `!important`.
- Footer verified in built CSS: `.app-shell-footer{...;color:var(--color-ink-soft,#5b6670);font-size:10px}`, full opacity.
- PASS `cd frontend && npm run test:coverage`: 64 files, 776 tests; then `npm run lint` (clean), `npm run format:check` ("All matched files use Prettier code style!"), `npm run build` (tsc + vite, 2419 modules, exit 0).
- PASS `scripts/diff-coverage.sh 93e1677 frontend`: 27 changed lines, 0 missing, 100%.
- E2E: skipped, CSS-only fix after green full run on 8425278.
- Deviations: none; only the two blocker files touched. Contract impact: none (`openapi/` and `api/schema.ts` untouched).
- Commit: 8cbbd10 2 files +7/-5.
- 2026-10-28 lead: VERDICT: PASS (reviewer, round 2/2) — both blockers resolved; `.number` in `@layer utilities` wins over amount component classes (built-CSS byte offsets verified), footer full-opacity `text-ink-soft` 5.87:1/5.34:1; no collateral, no `!important`; CSS-only E2E skip consistent with the gate table. Status USER_REVIEW.
- 2026-10-28 lead: DONE — user accepted.
