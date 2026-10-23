# 19 - FRONTEND-REFACTOR

Status: DONE · Branch: refactor/frontend-structure-coverage · Size: L · Round: 2/2

## Goal

Frontend-only, behavior-preserving refactor: feature subdirectories, colocated tests, page/component files ≤300 lines, 90% global Vitest coverage enforced. Out of scope: backend, contract, generated `api/schema.ts`, French copy.

## Files

Context: `frontend/src/router.tsx`, `frontend/package.json`, `frontend/vitest.config.ts`, `.github/workflows/ci.yml`, `frontend/src/pages/invalidationKeys.test.ts`
Writable: `frontend/src/{components,pages,hooks,lib,state,api}/**`, `frontend/package{,-lock}.json`, `frontend/vitest.config.ts`, `.github/workflows/ci.yml`
Affected tests: `frontend/src/pages/{GenerateExpenseStatementPage,GenerateRentReceiptPage,SettingsPage}.test.tsx`, `frontend/src/components/{RentReceiptSettings,SignaturesManager}.test.tsx`

## Plan

1. Move components to `components/{ui,layout,forms,pdf,llm,settings,signatures}/`; pages to `pages/{expense-statement,rent-receipt,settings,templates,history,admin-llm}/`; update imports and router.
2. Split >300-line files (expense 1848, admin 1096, templates 1018, quittance 1006, settings form 912, settings page 895, history 550, signatures 450) into focused reusable components.
3. Colocate every test with its target; add tests for untested modules; keep `invalidationKeys.test.ts` scanning the file that invalidates `statementsAll`/`rentReceiptsAll`.
4. Add `@vitest/coverage-v8`, `test:coverage`, 90% thresholds (lines/statements/functions/branches; exclude `api/schema.ts`, `test/setup.ts`, `main.tsx`); CI runs coverage.

## Constraints

Contract: none · Money display only, no client calculation · UI French · no `any` · no commit/push

## Acceptance

- [ ] No component directly under `components/`; every test colocated; no page/component `.tsx` >300 lines
- [ ] `npm run test:coverage` exits 0, all four metrics ≥90%
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass; full Cypress E2E green

## Commands

- `cd frontend && npm install && npm run test:coverage && npm test && npm run typecheck && npm run build`
- `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

- `2026-10-24 lead:` sized L; branch `refactor/frontend-structure-coverage`; user chose global 90% enforced.
- `2026-10-24 builder:` STALLED at 150-turn limit; status unchanged (TODO). Partial refactor left in worktree: 24 tracked files changed, 54 new files, no commit.
- `2026-10-24 lead:` `cd frontend && npm run typecheck` PASS (exit 0).
- `2026-10-24 lead:` `cd frontend && npm test` PASS (14 files, 93 tests, exit 0).
- `2026-10-24 lead:` `cd frontend && npm run build` PASS (exit 0).
- `2026-10-24 lead:` `cd frontend && npm run test:coverage` FAIL (exit 1): lines 40.27%, statements 39.77%, functions 35.01%, branches 36.38% vs 90%.
- `2026-10-24 lead:` E2E not run; files still >300 lines: `SettingsPage.tsx` 895, `HistoryPage.tsx` 550, `SignaturesManager.tsx` 450.
- `2026-10-24 builder:` run A structure complete — SettingsPage 895→177 (`SettingsCompanySection`, `SettingsHomeSection`, `SettingsCardSection`, `SettingsSaveBar`, `ExpenseItemForm`, `ExpenseItemsManager`, `settingsValues`); HistoryPage 550→142 (`HistoryMonthSection`, `RentReceiptMonthPanel`, `StatementMonthPanel`, `HistoryActions`, `HistoryEmptyState`, `HistoryReloadDialog`, `historyHelpers`); SignaturesManager 450→118 (`SignatureForm`, `SignatureCard`, `signatureConstants`); no non-test `.tsx` >300 (max 282), no `.tsx` under `components/` root.
- `2026-10-24 builder:` npm run typecheck PASS; npm test PASS (14 files, 93 tests); npm run build PASS. codegraph sync done; affected tests (4 files, 26 tests) PASS. Coverage and E2E not run in run A.
- `2026-10-24 builder:` run B STALLED at 150-turn limit after adding tests for api, hooks, state, ui/llm/pdf/layout, admin-llm, templates, history, expense/rent hooks; status unchanged (BLOCKED). No run B evidence written.
- `2026-10-24 lead:` `cd frontend && npm test` FAIL (exit 1): 1 failed | 338 passed, 40 files. `ExpenseItemForm.test.tsx:202` expected "12,5", received "12,50".
- `2026-10-24 lead:` `cd frontend && npm run typecheck` FAIL (exit 2, 6 errors): `AdminLlmPage.test.tsx:137`; `useExpenseStatementPage.test.tsx:940`; `historyHelpers.test.ts:43,44,56` (x2).
- `2026-10-24 lead:` `cd frontend && npm run build` FAIL (exit 2, same TS errors). Coverage report not produced (suite not green); E2E not run.
- `2026-10-24 builder:` run C STALLED at 150-turn limit; status unchanged (BLOCKED), no run C evidence written. Added coverage tests for `format`, `lines`, `FileDropzone`, `ExpenseItemsManager`.
- `2026-10-24 lead:` `cd frontend && npm run typecheck` PASS (exit 0; the 6 run-B test typing errors are fixed).
- `2026-10-24 lead:` `cd frontend && npm test` FAIL (exit 1): 1 failed | 409 passed, 42 files. New assertion `GenerateRentReceiptPage.test.tsx:656` expects display value "Sélectionnez un bailleur", received empty array; the `<option value="">` is present in `RentReceiptPartyFields.tsx:78` (test-only assertion issue, not yet fixed).
- `2026-10-24 lead:` coverage and E2E not run after run C; status remains BLOCKED.
- `2026-10-24 builder:` run D fixed the rent-receipt select assertion in `GenerateRentReceiptPage.test.tsx` (empty-directory selects: `selectedOptions` empty + placeholder option, typed `HTMLSelectElement`; no production change).
- `2026-10-24 builder:` new tests: `components/signatures/signatureConstants.test.ts`, `components/signatures/SignatureCard.test.tsx`; extended `lib/format.test.ts`, `pages/admin-llm/AdminLlmPage.test.tsx` (advanced-settings validation errors). All colocated.
- `2026-10-24 builder:` `cd frontend && npm run test:coverage` PASS (exit 0; 44 files, 417 tests; lines 96.67%, statements 96.50%, functions 95.02%, branches 90.14%).
- `2026-10-24 builder:` `cd frontend && npm test` PASS (exit 0; 44 files, 417 tests); `npm run typecheck` PASS (exit 0); `npm run build` PASS (exit 0).
- `2026-10-24 builder:` E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` PASS (exit 0; 5 specs, 24 tests); `down -v --remove-orphans` exit 0. `codegraph sync` exit 0.
- `2026-10-24 builder:` Contract: none; no money/calculation, French copy, routes or `data-cy` change. Residual risk: global branches margin 90.14% (thin) and frontend-only test additions; Docker images rebuilt during E2E.
- `2026-10-24 reviewer:` CHANGES_REQUESTED (round 1) — `.github/workflows/ci.yml:35` runs `npm test`, not `npm run test:coverage`; the 90% thresholds are therefore not enforced in CI. Minimal fix: run `npm run test:coverage` in the frontend job (thresholds unchanged).
- `2026-10-24 builder:` run E fixed CI enforcement — .github/workflows/ci.yml frontend job now runs npm run test:coverage; local coverage PASS (44 files, 417 tests; L/S/F/B ≥90%, thresholds unchanged).
- `2026-10-24 reviewer:` PASS (round 2) — CI blocker resolved; thresholds/exclusions intact; no runtime change.
- `2026-10-24 lead:` DONE — user accepted.
