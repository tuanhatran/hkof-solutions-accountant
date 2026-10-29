# 51 — A11Y-RESPONSIVE

Status: DONE
Branch: feat/51-a11y-responsive
Base: 8cbbd10
Size: M
Round: 2/2

## Goal
Close the Cabinet accessibility gaps: `FieldGroup` describes its control, `ViewTabs` follows the ARIA tabs pattern (roving focus, arrows, `aria-controls`), `ConfirmDialog` traps and restores focus, and tap targets reach 44px. Out of scope: visual redesign, breakpoints and the JS `mobile` flag (`useMediaQuery("(max-width: 1023px)")`), date/month native display (OS locale), backend/contract/money/migration/LLM, new E2E specs.

## Files
Context (read only): `.handoff/plans/50 - CABINET-UI-REVIEW.md` (increment C) · `frontend/src/pages/{rent-receipt/useRentReceiptPage,expense-statement/useExpenseStatementPage}.ts` · `frontend/src/pages/{rent-receipt/GenerateRentReceiptPage,expense-statement/GenerateExpenseStatementPage,settings/CompanySection,settings/CompanyLeaseStatementModal}.css`
Writable: `frontend/src/components/ui/{FieldGroup,ViewTabs,ConfirmDialog}.tsx` · `frontend/src/components/ui/AmountConfirmButton.css` · `frontend/src/components/layout/AppNav.css` · `frontend/src/pages/expense-statement/ExpenseLinesTable.css` · `frontend/src/pages/{rent-receipt/GenerateRentReceiptPage,rent-receipt/RentReceiptPreviewPane,expense-statement/GenerateExpenseStatementPage,expense-statement/ExpenseInputPane,expense-statement/ExpensePreviewPane,settings/CompanySection,settings/CompanyLeaseStatementModal}.tsx`
Writable tests: `frontend/src/components/ui/FieldGroup.test.tsx` (new) · `frontend/src/components/ui/{ViewTabs,ConfirmDialog,AmountConfirmButton}.test.tsx` · `frontend/src/pages/{rent-receipt/GenerateRentReceiptPage,expense-statement/GenerateExpenseStatementPage,settings/SettingsPage,settings/CompanyLeaseStatementModal}.test.tsx`
Affected tests (codegraph, 25): `components/ui/{AmountConfirmButton,ConfirmDialog,ViewTabs}.test.tsx` · `pages/settings/{CompanyIdentityModal,CompanyLeaseStatementModal,CompanyLeaseTab,EmployeeSection,ExpenseItemForm,ExpenseItemsManager,LmnpPage,SettingsPage}.test.tsx` · `pages/{rent-receipt/GenerateRentReceiptPage,expense-statement/GenerateExpenseStatementPage,history/HistoryPage,admin-llm/AdminLlmPage,templates/TemplatesTab}.test.tsx` · `components/{layout/AppShell,llm/LlmBadge,settings/*}` · `hooks/useDraftBlock.test.tsx` · `router.test.tsx`

## Constraints
Contract: none. No `any`, no client money, no backend edit; French UI; component CSS uses tokens/`@apply` and stays <300 lines; keep every `data-cy` and existing copy; `ViewTabs` has 4 call sites — update all; no breakpoint or `useMediaQuery` change; builder commits once with explicit paths, nobody pushes; never commit `.qoder/skills/` or `.opencode/skills/`.

## Acceptance
- [ ] `FieldGroup` merges `${id}-error` (else `${id}-hint`) into `aria-describedby` of the native `input`/`select`/`textarea` inside its children (recursive clone, existing value appended); ids unchanged; no call site touched.
- [ ] `ViewTabs` requires `idPrefix`, gives each tab `id="${idPrefix}-tab-${value}"`, roving `tabIndex` (active 0, others −1) and ArrowLeft/Right/Home/End move both focus and selection; a tab with `panelId` gets `aria-controls`.
- [ ] All 4 call sites pass `idPrefix`/`panelId`; panels carry the matching `id`; generation and modal pane components accept one optional `panel` prop (`{ id, labelledBy }`) applied as `id` + `role="tabpanel"` + `aria-labelledby` when `c.mobile`; the `CompanySection` shared panel gets `id` + `aria-labelledby` on the active tab.
- [ ] `ConfirmDialog` traps Tab/Shift+Tab inside the panel and restores focus to the opener on close; Escape/backdrop/close button unchanged.
- [ ] `AmountConfirmButton` and `.app-nav-link` / `.app-nav-mobile-link` measure ≥44px; `.amount-confirm-button-text` 12px; `ExpenseLinesTable` `min-w-[760px]` → `min-w-[680px]` with the scroll wrapper kept; breakpoints unchanged.
- [ ] gates pass; frontend changed-line coverage ≥80%.

## Commands
- `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- `scripts/diff-coverage.sh 8cbbd10 frontend`
- full E2E once: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`; if Docker is unavailable set BLOCKED.

## Evidence (builder)
Commit: 47a8f7f 20 files +582/-25
Scope verified: 19 modified frontend files + new `frontend/src/components/ui/FieldGroup.test.tsx`; all 4 `ViewTabs` call sites pass `idPrefix`/`panelId`; breakpoints and `useMediaQuery` untouched; contract unchanged.
PASS `cd frontend && npm run test:coverage` — 65 test files, 784 tests, 0 failed; `coverage/clover.xml` written.
PASS `cd frontend && npm run lint` — exit 0, no findings.
PASS `cd frontend && npm run format:check` — exit 0, "All matched files use Prettier code style!".
PASS `cd frontend && npm run build` — exit 0, 2419 modules transformed, built in 1.21s.
PASS `scripts/diff-coverage.sh 8cbbd10 frontend` — 95% changed-line coverage, 63 changed lines, 3 missing (`ConfirmDialog.tsx:89`, `FieldGroup.tsx:50`, `ViewTabs.tsx:55`).
E2E PASS (previous turn, this worktree): `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs, 26 tests, 0 failing, "All specs passed!"; `... down -v --remove-orphans` — exit 0. Not rerun: no source or test change after that run.
Contract impact: none.
Deviation: red-then-green output for the new tests was produced in the previous turn and is not available here; this turn revalidated green only. Acceptance criteria confirmed by reading the committed diff.
- 2026-10-28 lead: VERDICT: BLOCKERS (1) (reviewer, round 1/2) — `ConfirmDialog` binds the Tab trap only to the panel `onKeyDown`; after clicking a non-focusable area focus falls to `body`, the next Tab never reaches the panel and escapes to background controls. Move the trap to the existing document-level keydown effect so it applies from any focused node; add a red test starting outside the panel.
- 2026-10-28 builder (round 2): fixed round-1 blocker — Tab trap now runs in the document keydown effect, so it fires from any focused node; panel `onKeyDown` removed; Escape, initial Cancel focus, backdrop/close, opener capture and restore unchanged.
Files changed: `frontend/src/components/ui/ConfirmDialog.tsx` · `frontend/src/components/ui/ConfirmDialog.test.tsx`.
RED `npx vitest run src/components/ui/ConfirmDialog.test.tsx` — 1 failed | 7 passed; `AssertionError: expected false to be true` at test line 148 (`dialog.contains(document.activeElement)` after Tab with focus on `body`; focus had escaped to the outside button).
GREEN same command — 8 passed (8), exit 0.
PASS affected `npx vitest run <18 codegraph affected files>` — 18 files, 248 tests, 0 failed.
PASS `cd frontend && npm run test:coverage` — 65 files, 785 tests, 0 failed, exit 0; `coverage/clover.xml` written.
PASS `cd frontend && npm run lint` — exit 0, no findings.
PASS `cd frontend && npm run format:check` — exit 0, "All matched files use Prettier code style!".
PASS `cd frontend && npm run build` — exit 0, built in 1.67s.
PASS `scripts/diff-coverage.sh 8cbbd10 frontend` — 95% changed-line coverage, 65 changed lines, 3 missing (`ConfirmDialog.tsx:79`, `FieldGroup.tsx:50`, `ViewTabs.tsx:55`).
PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6 specs, 26 tests, 26 passing, 0 failing, "All specs passed!", exit code 0 from cypress; `... down -v --remove-orphans` — exit 0.
Contract impact: none. Commit: 6ba0a57 2 files +69/-31.
- 2026-10-28 lead: VERDICT: PASS (reviewer, round 2/2) — document-level Tab/Shift+Tab trap verified from inside and outside the panel, no double handling or listener leak, Escape/initial focus/opener restore unchanged; fix test 8/8. Status USER_REVIEW.
- 2026-10-28 lead: DONE — user accepted.
