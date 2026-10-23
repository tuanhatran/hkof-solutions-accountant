# NOTE-FRAIS-NO-PERIODE
Status: DONE
Branch: task/note-frais-sans-periode
Size: M
Round: 1/2
## Goal
(1) Remove the "Période" column from the bundled Note de frais template, widths rebalanced (done: see Evidence). (2) Expense lines follow the configured `ExpenseItem.sortOrder` everywhere — calculation response, on-screen list and preview/PDF — never the order they were added. Out of scope: `lignes.periode` in catalog/data, `HomeOfficeExpense.html/.md`, rent receipt, contract change, re-ordering already stored statements.
## Files
Context (read only): `backend/.../service/template/{TemplateCatalog,TemplateDataService}.java`, `backend/.../domain/ExpenseItem.java`
Writable: `backend/src/main/java/fr/hkof/homeofficeexpenses/service/ExpenseStatementService.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/ApiIntegrationTest.java`, `frontend/src/lib/lines.ts`, `frontend/src/lib/lines.test.ts`, `frontend/src/pages/GenerateExpenseStatementPage.tsx`
Affected tests: `ApiIntegrationTest`, `lines.test.ts`, `TemplateServiceValidationTest`
## Constraints
- One order rule, backend-authoritative: `calculateLines` returns lines sorted by `expenseItem.sortOrder`, stable for ties and for a repeated item; the frontend must submit and render the same order so `calculation.lines[index]` still matches its row (no amount may shift between rows).
- No `@OrderBy`, migration, YAML, DTO or catalog change; template work already delivered stays as is; French labels; no `any`.
- Preserve the dirty worktree inherited from `task/pdftotext-layout-ocr`; no commit, push, reset, clean or stash.
## Acceptance
- [x] Bundled `note-frais.html` has no "Période", no `{{periode}}`, 5 columns, widths 100 %, still validates.
- [ ] Red first: a request listing `gaz` before `loyer` (sortOrder 20 / 10) returns `lines[0].itemCode == "loyer"` in `/calculation` and in the generated `StatementDto`; amounts stay attached to their own line.
- [ ] Frontend: the list, the submitted requests and the preview share the configured order; a repeated-item (`multipleLinesAllowed`) keeps its add order within the same `sortOrder`.
## Commands
- backend: `cd backend && ./mvnw -B test`
- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
## Evidence
- 2026-10-23 lead: branch `task/note-frais-sans-periode` created from `main` (HEAD c28788c); uncommitted work from `task/pdftotext-layout-ocr` carried over untouched.
- 2026-10-23 builder: red first — `TemplateServiceValidationTest.bundledExpenseStatementHasNoPeriodColumn` failed on the bundled `templates/defaut/note-frais.html` with `not to contain: "Période"` (targeted run: Tests run 5, Failures 1).
- 2026-10-23 builder: removed the `<th>Période</th>` header and the `<td>{{periode}}</td>` cell; five remaining widths 27 + 21 + 18 + 12 + 22 = 100 %; `{{mois_libelle}}`, `{{#lignes}}` loop, French labels and all other variables unchanged.
- 2026-10-23 builder: `cd backend && ./mvnw -B test` → Tests run: 105, Failures: 0, Errors: 0, Skipped: 2, BUILD SUCCESS. The 2 skips are pre-existing/unrelated: `TemplateActivationPostgresTest` (Docker unavailable) and `DocumentTextExtractorTest.realPdftextKeepsColumns` (assumption, untracked extraction work).
- 2026-10-23 builder: targeted `./mvnw -B test -Dtest=TemplateServiceValidationTest` → Tests run: 5, Failures: 0; bundled expense template still reports structure valid with no unknown or missing variable (`lignes.periode` stays an allowed, now unused, catalog variable).
- 2026-10-23 builder: not verified — visual PDF/preview rendering of the Note de frais (no UI run in this session); the five-column header is asserted statically only.
- 2026-10-23 builder: unrelated dirty-worktree changes (README, Dockerfile, CalculationService, extraction/LLM files and their tests) were left untouched.
- 2026-10-23 reviewer: VERDICT PASS (round 1) — scoped diff verified: Période header and {{periode}} cell removed, 5 th/td cells correspond (Poste/Fournisseur/Montant TTC/Prorata/Montant retenu), widths 27+21+18+12+22=100, droite kept, loop/mois_libelle/labels untouched, new test fails on pre-fix template, no other change staged or weakened.
- 2026-10-23 lead: USER_CHANGES_REQUESTED — lines must follow the configured sortOrder, not the add order (Round reset to 0).
- 2026-10-23 builder (round 2): red first backend — new `ApiIntegrationTest.expenseLinesFollowConfiguredOrder` posts `gaz` then `loyer`; targeted run failed with `JSON path "$.lines[0].itemCode" expected:<loyer> but was:<gaz>` (Tests run 1, Failures 1).
- 2026-10-23 builder: fixed `calculateLines` by sorting the calculated list on `ExpenseItem.sortOrder` after the unchanged validation loop (stable `List.sort`, amounts stay on their own line); no `@OrderBy`, migration, DTO or YAML change.
- 2026-10-23 builder: red first frontend — `orderLinesByExpenseItem` unit test run failed with `TypeError: orderLinesByExpenseItem is not a function` (5 failed, 8 passed).
- 2026-10-23 builder: added a pure stable `orderLinesByExpenseItem(lines, expenseItems)` in `frontend/src/lib/lines.ts` (unknown item code sorts last, documented); `GenerateExpenseStatementPage` memoizes the ordered list for the table, the line count/gating, `linesToRequests` and preview/generation requests, so `calculation.lines[index]` matches its row; `editLine`/`removeLine`/draft lookups still use the draft.
- 2026-10-23 builder: `cd backend && ./mvnw -B test` → Tests run: 106, Failures: 0, Errors: 0, Skipped: 2, BUILD SUCCESS (same pre-existing skips: Docker-unavailable `TemplateActivationPostgresTest`, `DocumentTextExtractorTest` assumption).
- 2026-10-23 builder: `cd frontend && npm run typecheck && npm test && npm run build` → typecheck OK, Test Files 10 passed, Tests 58 passed, vite build OK (chunk-size warning only).
- 2026-10-23 builder: not verified — no browser/E2E walkthrough of the on-screen order or the generated PDF; ordering is covered by the backend integration test and the helper unit tests.
- 2026-10-23 builder: unrelated dirty-worktree files (README, Dockerfile, CalculationService, extraction/LLM files and their tests) left untouched; template change from round 1 unchanged.
- 2026-10-23 reviewer: VERDICT PASS (round 1) — scoped diff verified: template untouched since round 1; calculateLines sorts after validation by sortOrder (stable, int, amounts untouched) and all paths (calculate/preview/generate/persist/PDF) share it; new ApiIntegrationTest asserts loyer-first (950.00/28.57, total 978.57) in both /calculation and created DTO, red-first evidenced, seeded sortOrder loyer=10 gaz=20 real (DataInitializer test profile); pure non-mutating orderLinesByExpenseItem stable for ties/repeats drives table, requests, preview and gating while edit/remove/duplicate checks still use the draft by key; memos deps sound, signature change on sortOrder change correctly triggers one recalculation, no loop; scope clean, no test weakened.
- 2026-10-23 lead: independent re-run — backend `./mvnw -B test` → Tests run 106, Failures 0, Errors 0, Skipped 2, BUILD SUCCESS; frontend `npm test` → 10 files / 58 tests PASS; `npm run typecheck` + `npm run build` PASS (chunk-size warning only). Open: on-screen/browser walkthrough and visual PDF not run.
- 2026-10-23 lead: DONE — user accepted
