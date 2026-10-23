# EXPENSE-STATEMENT-REMOVE-MONTHLY-OVERRIDE

Status: DONE
Branch: task/note-frais-ui-cleanup
Size: L
Round: 0/2

## Goal

Remove the monthly-amount override end-to-end (already gone from the frontend UI/model): contract, backend DTO/service/calculation and spec. Also delete the unused SSE endpoint `GET /api/analyses/{id}/events`; the UI keeps polling `GET /api/analyses/{id}`. Out of scope: polling behavior, other endpoints, DB (no column exists), the kept "Montant retenu estimé" card.

## Files

Context (read only): `backend/src/main/java/fr/hkof/homeofficeexpenses/service/llm/AnalysisJobService.java`, `frontend/src/api/endpoints.ts`
Contract/spec: `openapi/openapi.yaml` (ExpenseLineRequest property, analyses events path + SseEmitter schema), `product_prompt.md` (lines 138, 145, 247, 265, 358)
Backend: `web/dto/Dtos.java`, `service/ExpenseStatementService.java`, `service/CalculationService.java`, `web/AnalysisController.java`, `service/llm/AnalysisJobService.java`, `service/CalculationServiceTest.java`, `web/ApiIntegrationTest.java`
Frontend: `frontend/src/api/schema.ts` (regenerated only)
Affected tests: `CalculationServiceTest`, `ApiIntegrationTest`, frontend vitest suite

## Constraints

- Contract first, then backend, then `cd frontend && npm run gen:api`; never hand-edit `schema.ts`.
- `CalculationService` stays `BigDecimal`/`HALF_UP`/scale 2; negative amounts still rejected with a French message.
- Preserve existing changes; no commit, push, reset, clean or stash.

## Acceptance

- [ ] `monthlyAmountOverride` absent from `openapi.yaml`, `Dtos`, `ExpenseStatementService`, `CalculationService`, both backend tests, `product_prompt.md` and the regenerated types.
- [ ] `/api/analyses/{id}/events`, the controller method, `events`/`broadcast`, `SseEmitter` schema and import are gone; `GET /api/analyses/{id}` and `DELETE` untouched.
- [ ] `./mvnw -B test`, `npm run gen:api`, typecheck, vitest and build pass.

## Commands

- backend: `cd backend && ./mvnw -B test`
- frontend: `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build`

## Evidence

- `2026-10-23 lead:` USER_CHANGES_REQUESTED — extend to contract/backend removal of `monthlyAmountOverride` and removal of unused SSE endpoint; spec update approved (Round reset to 0).
- `2026-10-23 lead:` S/M items above remain valid; frontend part unchanged.

- `2026-10-23 builder:` TDD red — updated `validation.test.ts` (shape `["itemCode","amountInclVat","proRataPct"]`, override test/fixture key removed) and `lines.test.ts` (fixture key and both override tests removed); `npx vitest run src/lib/validation.test.ts src/lib/lines.test.ts` → 6 failed / 14 passed (shape still had `monthlyAmountOverride`, fixture rejected).
- `2026-10-23 builder:` implemented — removed UI block (`Montant du mois (optionnel)`, help text, `input-montant-mois`, inline "Montant retenu estimé pour …"); kept estimate card. Dropped `monthlyAmountOverride` from `expenseSchema`, `DraftLine`, `fromLineDto`, `buildRentLine`, `toLineRequest`; page no longer sets it and estimates from `values.amountInclVat` + `proRataPct`.
- `2026-10-23 builder:` `cd frontend && npm run typecheck` → pass; `npm test` → 10 files / 53 tests passed; `npm run build` → success (existing >500 kB chunk warning only). `LineRequest.monthlyAmountOverride` untouched in `api/schema.ts` and never sent by the page.
- `2026-10-23 builder:` Status → REVIEW, ready for reviewer.
- `2026-10-23 lead:` `git diff` skim + `cd frontend && npm run typecheck && npm test` → 10 files / 53 tests PASS; no code edit by lead; USER_REVIEW awaiting user acceptance.
- 2026-10-23 reviewer: PASS — diff vs cedcba4 touches exactly the 5 writable frontend files plus this handoff; no leftover monthlyAmountOverride / input-montant-mois / "Montant du mois" in frontend/src (sole hit api/schema.ts:729, contract untouched as required); estimate card intact (GenerateExpenseStatementPage.tsx:1284-1293) fed by amountInclVat + proRataPct (lines 871-873); remaining tests keep amount/pro-rata normalization, receipt omission and 3-key schema-shape coverage; builder evidence (typecheck, vitest 53 tests, build) plausible, not re-run. Status -> USER_REVIEW.
- `2026-10-23 builder (WI1, relayed by lead):` contract+spec — removed `ExpenseLineRequest.monthlyAmountOverride`, `/api/analyses/{id}/events`, `SseEmitter`; `product_prompt.md` lines 138/145/247/265 updated (line 358 kept, no override wording). Strict-YAML: 33 paths, 27 schemas, no dangling `$ref`, grep zero.
- `2026-10-23 builder (WI2, relayed by lead):` backend — DTO field, service override path, single-arg `CalculationService.monthlyAmount`, SSE controller method, `events`/`broadcast`/`SSE_TIMEOUT_MS`/scheduler removed; tests updated. Red: 4 compile errors; green: `./mvnw -B test` 67 run / 0 fail / 1 skipped (Docker-gated PG test).
- `2026-10-23 builder (WI3, relayed by lead):` frontend — `npm run gen:api` only source of `schema.ts` (43 deletions), Prettier restored repo formatting (no manual edit); grep zero for override/SSE. typecheck pass, 53 tests pass, build success.
- `2026-10-23 lead:` `./mvnw -B test` 67/0/1 skipped PASS; `npm run typecheck && npm test` 53 PASS; 15 files, +22/−270; dispatching reviewer (L, combined diff).

- 2026-10-23 reviewer: PASS — combined diff vs cedcba4 (15 files, +22/−270) verified: openapi.yaml has no monthlyAmountOverride / SseEmitter / streamAnalysisEvents / events path left and no dangling $ref; CalculationService.monthlyAmount single-arg keeps BigDecimal scale-2 HALF_UP with exact French messages ("Le montant TTC est obligatoire." / "Le montant TTC ne peut pas être négatif."), no other two-arg caller, ExpenseStatementService semantics otherwise unchanged; removed scheduler was SSE-only (@PreDestroy removal safe, executor still used at AnalysisJobService:80), GET/DELETE /api/analyses/{id} intact, frontend polls via useAnalysis.ts:63; schema.ts diff is pure 43-line deletion matching the contract, no /events or EventSource in frontend; removed tests only encoded the override, null-rejection test added; product_prompt.md renumbering correct (old item 6 → 5, list ends there); no secrets, no commit. Status -> USER_REVIEW.

- `2026-10-23 lead:` `DONE — user accepted`
