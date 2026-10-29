# 49 - DATA-CY-EN-SHARED

Status: DONE
Branch: feat/49-data-cy-en-shared
Base: cec060d
Size: M
Round: 1/2

## Goal

Task 1/5 of the FR→EN `data-cy` migration: rename the 10 shared-component hooks to English and update the 5 `product_prompt.md` entries that list them. Out of scope: prefixes (`dialogue-`, `groupe-`, `onglet-`, `toast-`), page-level hooks, tasks 50-53.

## Files

Context (read only): `.handoff/data-cy-mapping.md` (shared dictionary), `frontend/src/pages/**`
Writable: `frontend/src/components/ui/{AiBadge,AmountConfirmButton}.tsx`, `frontend/src/components/llm/AnalysisPanel.tsx`, `frontend/src/components/pdf/{PdfViewer,PdfViewer.test}.tsx`, `frontend/src/components/forms/FileDropzone.tsx`, `frontend/src/components/layout/{LanguageSelector,AppShell.test}.tsx`, `frontend/cypress/e2e/{02-expense-statement,04-admin-templates,05-multi-company}.cy.ts`, `frontend/cypress/support/{e2e,helpers}.ts`, `product_prompt.md` (§ CROSS-CUTTING FRONTEND REQUIREMENTS, `data-cy` bullet only)
Symbols: `AiBadge`, `AmountConfirmButton`, `AnalysisPanel` (polling status), `PdfViewer` (preview state), `FileDropzone`, `LanguageSelector`
Renames: `analyse-statut`→`analysis-status` · `apercu-maj`→`preview-updated` · `apercu-personnalise`→`preview-custom` · `badge-ia-detecte`→`badge-ai-detected` · `btn-annuler-analyse`→`btn-cancel-analysis` · `btn-confirmer-montant`→`btn-confirm-amount` · `btn-retirer-fichier`→`btn-remove-file` · `btn-telecharger-apercu`→`btn-download-preview` · `select-langue`→`select-language` · `select-societe-active`→`select-active-company`
Affected tests: `PdfViewer.test.tsx`, `AppShell.test.tsx`; Cypress specs 02, 04, 05 (selectors only)

## Constraints

Contract: none · Money: none · UI text stays French, hooks English · no `any` · no behaviour change · `select-societe-active` and `apercu-personnalise` are test-only values: rename them, never delete the assertions · `dialogue-`, `groupe-`, `onglet-`, `toast-` prefixes and every page-level hook stay untouched (tasks 50-53) · builder commits once (explicit paths), nobody pushes

## Acceptance

- [ ] `grep -rn 'analyse-statut\|apercu-maj\|apercu-personnalise\|badge-ia-detecte\|btn-annuler-analyse\|btn-confirmer-montant\|btn-retirer-fichier\|btn-telecharger-apercu\|select-langue\|select-societe-active' frontend/src frontend/cypress --include='*.ts' --include='*.tsx'` returns nothing
- [ ] `product_prompt.md` lists `analysis-status`, `preview-updated`, `badge-ai-detected`, `btn-cancel-analysis`, `btn-confirm-amount`
- [ ] gates pass (Commands); changed-line coverage >= 80 %

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh cec060d frontend` · e2e: `make e2e-up` once, then `make e2e`

## Evidence

- 2026-10-29 builder · files: ui/{AiBadge,AmountConfirmButton}.tsx(+`.test.tsx`), llm/AnalysisPanel.tsx, pdf/{PdfViewer,PdfViewer.test}.tsx, forms/FileDropzone.tsx, layout/{LanguageSelector,LanguageSelector.test,AppShell.test}.tsx, cypress/e2e/{02,04,05}, cypress/support/{e2e,helpers}.ts, product_prompt.md; 10 renames, prefixes unchanged.
- RED → GREEN: 5 component tests asserted the new hooks first — `npx vitest run` (AiBadge, AmountConfirmButton, LanguageSelector, AppShell, PdfViewer): 4 failed / 25 passed → after rename 5 files / 29 tests passed.
- `codegraph affected <6 components>` → 20 test files; `npx vitest run` on them: 20 files / 277 tests passed, exit 0.
- PASS `cd frontend && npm run test:coverage` — 67 files / 922 tests, exit 0 (lines 96.83 %, 3117/3219).
- PASS `npm run lint` exit 0; PASS `npm run format:check` exit 0; PASS `npm run build` exit 0 (`✓ built in 1.31s`, chunk-size warning only).
- PASS `scripts/diff-coverage.sh cec060d frontend` exit 0 — no executable changed lines (attribute-only JSX edits absent from Clover `line` nodes); measured 0 diff lines with coverage info, 0 missing (same case as task 64).
- PASS `make e2e` exit 0 — 6 specs / 29 tests, all passing, 0 failing, no retry; stack `homeofficeexpenses-e2e-*` left up, no `e2e-up`/`e2e-down`.
- Acceptance: grep of the 10 old literals over `frontend/src frontend/cypress` → no match (exit 1); `product_prompt.md` lists the 5 new entries.
- Deviation (user-approved): `frontend/src/pages/settings/{CompanyIdentityView.test,SettingsPage.test}.tsx` were already unformatted at base `cec060d`; prettier-only re-wrap of 4 hunks so `format:check` can pass. No hook, behaviour or test assertion changed there.
- Out of scope, left untouched: `product_prompt.md:354` still mentions `btn-confirmer-montant` in prose (outside the `data-cy` bullet).
- Commit: 249df29 19 files +54/-40. Contract: none.
- 2026-10-29 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1) — `product_prompt.md:354` still documents `btn-confirmer-montant` while the hook is now `btn-confirm-amount` (spec names a selector that no longer exists; the old-literal grep was scoped to `frontend/src frontend/cypress`, so it missed this). Fix already exists as an uncommitted working-tree edit to that line: builder commits it (explicit path only).
- 2026-10-29 builder: round-2 docs fix — verified `git diff HEAD -- product_prompt.md` was exactly 1 hunk (line 354 `btn-confirmer-montant` → `btn-confirm-amount`); `git diff --check` exit 0; `grep btn-confirmer-montant product_prompt.md` → no match (exit 1); `grep btn-confirm-amount product_prompt.md` → lines 354, 425.
- 2026-10-29 builder: DEVIATION, no builder commit — while this round ran, a concurrent commit `85dfa4c "Change model for Qoder"` (8 files, +109/-8) captured the same one-line hunk plus the previously dirty/staged `.handoff/*`, `.qoder/agents/*.md`, `.opencode/README.md`, and was pushed to origin (HEAD == origin). The working tree is clean, so a 1-file +1/-1 commit is impossible without history rewrite (forbidden). Docs gate `git diff --check HEAD` exit 0. Contract: none.
- 2026-10-29 lead: `VERDICT: PASS` (reviewer, round 2) — round-1 blocker resolved: `product_prompt.md:354` now `btn-confirm-amount`, old literal gone, 5 entries intact; no other FR literal reintroduced. Fix shipped inside the concurrent pushed commit `85dfa4c` rather than a builder-made 1-file commit (recorded above); task-49 app code unchanged since `249df29`.
- 2026-10-29 lead: `DONE — user accepted`
