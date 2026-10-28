# 60 - DRAFT-PERSISTENCE
Status: DONE
Branch: feat/60-draft-persistence
Base: 6e01d92
Size: L
Round: 2/2
## Goal
Kill the false « Brouillon non généré » warning and persist editable drafts server-side for `/generer/quittance` and `/generer/note-frais`: explicit « Enregistrer le brouillon », draft status in both preview panes, reload when the same scope is selected, « Enregistrer et quitter ». Out of scope: generation, calculation, PDF, history versions, signatures.
## Files
Context (read only): `frontend/src/pages/expense-statement/useExpenseStatementPage.ts`, `frontend/src/pages/expense-statement/useExpenseStatementContext.ts`, `frontend/src/pages/rent-receipt/useRentReceiptPage.ts`, `frontend/src/state/statementDraft.ts`, `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/hooks/useDraftBlock.ts`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/ExpenseStatementController.java`, `backend/src/main/java/fr/hkof/homeofficeexpenses/web/RentReceiptController.java`, `openapi/openapi.yaml#/paths/~1api~1expense-statements~1draft` (compute-only, do not reuse the name).
Writable backend: `openapi/openapi.yaml`; `backend/src/main/resources/db/migration/V14__document_draft.sql`; `backend/src/main/java/fr/hkof/homeofficeexpenses/domain/DocumentDraft.java`, `repository/DocumentDraftRepository.java`, `service/DocumentDraftService.java`, `web/DocumentDraftController.java`, `web/dto/DocumentDraftDtos.java`; tests `backend/src/test/java/fr/hkof/homeofficeexpenses/service/DocumentDraftServiceTest.java`, `web/DocumentDraftIntegrationTest.java`.
Writable frontend: `frontend/src/api/endpoints.ts`, `frontend/src/api/queries.ts`, `frontend/src/api/schema.ts` (generated), `frontend/src/state/rentReceiptDraft.ts`, `frontend/src/state/statementDraft.ts`, `frontend/src/state/draftSaver.ts` (active-page save registry for the exit dialog), `frontend/src/hooks/useDraftBlock.ts`, `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/ui/ConfirmDialog.tsx`, `frontend/src/pages/rent-receipt/useRentReceiptPage.ts`, `frontend/src/pages/rent-receipt/RentReceiptPreviewPane.tsx`, `frontend/src/pages/expense-statement/useExpenseStatementPage.ts`, `frontend/src/pages/expense-statement/useExpenseStatementContext.ts`, `frontend/src/pages/expense-statement/ExpensePreviewPane.tsx`, `frontend/src/i18n/resources/fr.ts`, `frontend/src/i18n/resources/en.ts`.
Affected tests: `frontend/src/state/rentReceiptDraft.test.ts`, `statementDraft.test.ts`, `frontend/src/hooks/useDraftBlock.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`, `frontend/src/components/ui/ConfirmDialog.test.tsx`, `frontend/src/pages/rent-receipt/useRentReceiptPage.test.tsx`, `GenerateRentReceiptPage.test.tsx`, `frontend/src/pages/expense-statement/useExpenseStatementPage.test.tsx`, `GenerateExpenseStatementPage.test.tsx`, `frontend/src/api/endpoints.test.ts`, `queries.test.ts`; add `frontend/src/state/draftSaver.test.ts`.
## Constraints
Contract: `openapi/openapi.yaml` adds `GET`/`PUT /api/drafts/rent-receipts` (scope month + landlordId + tenantId|tenantCompanyId), `GET`/`PUT /api/drafts/expense-statements` (scope companyId + month), `DELETE /api/drafts/{id}`; schemas `RentReceiptDraftRequest/Dto`, `StatementDraftRequest/Dto`; `schema.ts` only via `cd frontend && npm run gen:api`.
Draft = editable form state, never a document. One active draft per scope: each save inserts a new row and logically deletes the previous active row (`deleted`), never overwrites; a successful generation leaves no active draft for the scope; server validates month, amounts, dates and lines.
Dirty: quittance stops persisting `dirty` and derives it from a baseline captured at init/select/load/save, so auto-prefill, lone company/lease auto-selection and the default template never warn; statement dirty only from explicit line edits and is cleared by save/generation. Money: no new calculation. UI French, no `any`; builder commits once, nobody pushes.
## Acceptance
- [ ] Leaving `/generer` after only auto-prefill, auto-selection, default template or a stale persisted flag shows no dialog; with real unsaved edits it offers Rester / Quitter sans enregistrer / Enregistrer et quitter, and a failed save keeps the page.
- [ ] Each preview pane shows `Aucun brouillon enregistré` or `Brouillon enregistré le DD/MM/YYYY HH:mm` plus `Enregistrer le brouillon`; re-selecting the same scope reloads the form/lines; generating clears the draft.
- [ ] Contract + V14 + backend endpoints with validation + frontend wiring + tests; gates pass with real counts and changed-line coverage >= 80%.
## Commands
`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build`
`scripts/diff-coverage.sh 6e01d92 all` (JaCoCo backend + Vitest Clover frontend, >= 80% each)
`make e2e-up` once, then `make e2e`: full suite, all specs/tests green, none only on a retry; keep the stack up, `make e2e-down` only after acceptance.
## Evidence
- Commit: 744bab7 35 files +3147/-85
- Files: V14 + DocumentDraft entity/repo/service/controller/dtos + 2 backend tests; openapi + regenerated schema.ts; endpoints/queries + tests; draft stores + draftSaver; AppShell/ConfirmDialog; both page hooks/panes + tests; i18n.
- PASS backend `./mvnw -B verify`: 528 tests, 0 failures, 1 skipped.
- PASS frontend `npm run gen:api` (schema regenerated) + `npm run test:coverage`: 68 files, 888 tests.
- PASS `npm run lint`; FAIL `npm run format:check` 6 files -> `npx prettier --write` -> PASS; PASS `npm run build` (tsc -b + vite).
- PASS `scripts/diff-coverage.sh 6e01d92 all`: backend 91% (198 changed, 16 missing), frontend 94% (174 changed, 9 missing).
- PASS targeted: rent store 14, statement store 20, draftSaver 5, ConfirmDialog 9, AppShell 10, useDraftBlock 5.
- Red->green: useRentReceiptPage draft tests 6 (1 red: refusal test auto-selected the single lease; fixed setup `initialized: true`), 32 green.
- Red->green: useExpenseStatementPage draft tests 5 (1 red: stale draftId 90 from a previous test; fixed reset of draftIdByMonth), 70 green.
- Green first run: GenerateRentReceiptPage 3 new (30 total), GenerateExpenseStatementPage 3 new (27 total), endpoints/queries 4 new (43 total).
- PASS CodeGraph affected 35 files -> 628 tests.
- PASS E2E `make e2e-up` then `make e2e`: exit 0, 6 specs / 26 tests passing, no retries; stack left up.
- Deviations: lease auto-init now skips when a saved draft exists so the reload is not overwritten; no other scope change.
- Contract impact: openapi adds GET/PUT `/api/drafts/rent-receipts`, GET/PUT `/api/drafts/expense-statements`, DELETE `/api/drafts/{id}`; schemas RentReceiptDraftRequest/Dto, StatementDraftRequest/Dto.
- 2026-10-28 lead: `VERDICT: BLOCKERS (4)` (reviewer, round 1) — V14 scope indexes non-unique + save button not disabled in flight; draft delete fire-and-forget races the refetch; blocker/save uses both pages' dirty flags; rehydration keyed on the saved row id overwrites edits after save.
- Round 1 fix — Commit: 9e802eb 20 files +463/-30.
- Files: V15 + DocumentDraftMigrationPostgresTest; DocumentDraftService/RentReceiptService/ExpenseStatementService + 3 service tests; useDraftBlock, both page hooks/panes/context, 5 frontend tests + draftSaver test.
- Blocker 1: V15 drops V14 indexes, adds partial UNIQUE `(billing_month, company_id)` and `(billing_month, landlord_id, COALESCE(tenant_id,0), COALESCE(tenant_company_id,0))`; both `Enregistrer le brouillon` buttons disabled on `draftSaving`.
- Blocker 2: `generate` clears the scope draft via `DocumentDraftService` inside the generation transaction; client DELETE removed, `queryKeys.drafts` still invalidated.
- Blocker 3: blocker uses the current page's flag (`/generer/quittance` rent, `/generer/note-frais` statement); beforeunload keeps either flag; saver registry run by the mounted page.
- Blocker 4: hydration skipped when `saved.id` equals `draftId` (receipt) / `draftIdByMonth[scope]` (statement).
- PASS backend `./mvnw -B verify`: 533 tests, 0 failures, 1 skipped.
- PASS frontend `npm run test:coverage` 68 files / 898 tests; `npm run lint`; `npm run format:check`; `npm run build`.
- PASS `scripts/diff-coverage.sh 6e01d92 all`: backend 91% (199 changed, 16 missing), frontend 94% (182 changed, 10 missing).
- Red->green: duplicate active insert rejected (red: insert accepted); disabled save buttons (red: enabled); page-scoped blocker (red: wrong page blocked); post-save hydration (red: 11 failed -> 179 targeted green).
- PASS `make e2e`: exit 0, 6 specs / 26 tests passing, no retries; rebuilt backend + frontend images; stack left up.
- Deviations: old tests asserting a client-side DELETE now assert no DELETE and keep the local draft cleared (backend owns deletion, new service tests cover it).
- Contract impact: none (no `openapi/openapi.yaml` change).
- 2026-10-28 lead: pre-review correction — `softDelete` must flush the `deleted=true` update before the new insert, otherwise V15's partial unique indexes reject every second save (Hibernate flushes inserts before updates); add a real-Postgres regression test that saves the same scope twice.

- Round 1 correction — Commit: 867be11 3 files +138/-8.
- Files: `DocumentDraftService.java:148` softDelete now `saveAndFlush` (doc comment on flush order); `DocumentDraftServiceTest` mock expectations moved to `saveAndFlush`; new `DocumentDraftPersistencePostgresTest`.
- Root cause: `repository.save(draft)` queued the delete update; Hibernate flushes inserts first, so the second save hit `ux_document_draft_rent_scope` / `ux_document_draft_statement_scope` (V15).
- Red->green: new Postgres test red with 2 `DataIntegrityViolation` duplicate-key errors (rent + statement scope), 3 green after fix; asserts 2 rows, exactly 1 active, newest payload wins, generation cleanup still deletes.
- PASS targeted Postgres test: 3/3; PASS affected 11 files 90/90 (CodeGraph).
- PASS backend `./mvnw -B verify`: 536 tests, 0 failures, 1 skipped.
- PASS `scripts/diff-coverage.sh 6e01d92 all`: backend 92% (213 changed, 15 missing), frontend 93% (188 changed, 12 missing).
- PASS `make e2e`: exit 0, 6 specs / 26 tests passing, no retries; backend image rebuilt; stack left up.
- Contract impact: none (no openapi/V14/V15 change). Frontend untouched.
- 2026-10-28 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 2) — after generation, `markGenerated()` nulls `draftId`; the hydration effect in `useRentReceiptPage.ts:177-222` then reloads the just-deleted saved row from the still-cached query, reverting later edits. BLOCKED. Single decision: ship with this defect, or fix it without a third review round.
- 2026-10-28 lead: cumulative diff 44 files, above the 40-file L cap (35 planned); reported, no split of the cohesive task.
- 2026-10-28 lead: user chose the builder fix without a third review round; lead verifies the single fix, then USER_REVIEW.

- Round 2 fix — Commit: 2930c0f 2 files +107/-4.
- Fix (`useRentReceiptPage.ts:306-316`): before `draft.markGenerated()`, `queryClient.setQueryData(queryKeys.rentReceiptDraft(month, selectedLandlordId, selectedTenantId, selectedTenantCompanyId), null)` for the submitted and store months, so the hydration effect early-returns instead of reloading the just-deleted row; `invalidateQueries(queryKeys.drafts)` unchanged.
- Test: `GenerateRentReceiptPage.test.tsx` mock of `useSavedRentReceiptDraft` now reads the real query cache; new test "keeps an unsaved edit and clears the draft pane when generating after a save" (load id 40, save -> cache row id 50, edit 1200->1500 without saving, generate).
- Red->green: red `draftId` expected `null`, received `50` (deleted row reloaded) -> green; file 32 tests.
- PASS `codegraph affected` 2 changed files -> 7 test files, 126/126 tests.
- PASS `npm run test:coverage` 68 files / 899 tests; PASS `npm run build`.
- PASS `npm run lint`; FAIL `npm run format:check` (test file) -> `npx prettier --write` -> PASS.
- PASS `scripts/diff-coverage.sh 6e01d92 all`: frontend 94% (189 changed, 11 missing); backend untouched.
- PASS `make e2e`: exit 0, 6 specs / 26 tests passing, no retries; frontend image rebuilt; stack left up.
- Deviations: none. Contract impact: none.
- 2026-10-28 lead: fix verified (commit `2930c0f`) — targeted `GenerateRentReceiptPage` + `useRentReceiptPage` 65/65 PASS; USER_REVIEW.
- 2026-10-28 lead: DONE — user accepted.
