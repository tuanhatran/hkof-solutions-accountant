# EXPENSE-NO-PERIOD

Status: DONE
Branch: feat/no-period-on-upload
Size: L
Round: 1/2

## Goal

No invoice period on an expense line: the amount counts fully in the statement month being edited, and the claimed amount is `monthlyAmount × proRataPct`. Out of scope: the rent-receipt period, `ExpenseItem.periodicity`.

## Files

Writable (base `backend/src/main/java/fr/hkof/homeofficeexpenses/`): `domain/ExpenseLine.java`, `service/ExpenseStatementService.java` (200-260, 340-410), `service/CalculationService.java` (18-45), `web/dto/Dtos.java` (112, 125, 185), `service/llm/ExtractionPipeline.java` (110-140, 215-240), `service/llm/DefaultPrompt.java`, `service/template/TemplateDataService.java` (60-70), `backend/src/main/resources/db/migration/V3__drop_expense_line_period.sql`
Writable (front/docs): `frontend/src/pages/GenerateExpenseStatementPage.tsx`, `frontend/src/lib/lines.ts`, `frontend/src/lib/validation.ts`, `frontend/src/api/schema.ts` (generated only), `frontend/cypress/e2e/02-expense-statement.cy.ts`, `openapi/openapi.yaml`, `product_prompt.md` (111, 293-294, 342, 374), `.opencode/instructions/20-backend.md`
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/CalculationServiceTest.java`, `.../service/llm/ExtractionPipelineTest.java`, `.../web/{ApiIntegrationTest,E2eResetIntegrationTest,ExpenseStatementActiveIntegrationTest}.java`, `frontend/src/lib/{validation,lines}.test.ts`

## Constraints

- `monthlyAmount = monthlyAmountOverride ?? amountInclVat`; delete `allocateToMonth`; keep `claimedAmount`, `total`, `proRataBase`, `totalRentReceipt`.
- Extraction stops asking for `periode_debut`/`periode_fin`, but `checkFields` still tolerates and ignores those keys: an admin-edited prompt must not produce a 400.
- Template `lignes[].periode` stays in the data model, filled from the statement month, so existing user templates keep rendering.
- Contract first (YAML, then backend, then `npm run gen:api`); Flyway V3 drops both columns (data loss accepted); French UI; no `any`; no test weakened.
- Worktree deviation: the 3-agent refactor is already committed on `main`; do not touch `.opencode/agents/`.

## Acceptance

- [ ] Line without period: monthly amount = amount excl. override, claimed = ×prorata, for any statement month (28/29/30/31-day months give the same result).
- [ ] `ExtractionDto` has no period field; a model reply that still contains `periode_debut`/`fin` is accepted and ignored.
- [ ] `openapi.yaml` has no `periodStart`/`periodEnd` on `ExpenseLineRequest`, `ExpenseLineDto`, `ExtractionDto`; `RentReceipt*` untouched; types regenerated.
- [ ] V3 migration drops the columns; the expense-line form has no period inputs; e2e spec 02 green.

## Commands

- backend: `cd backend && ./mvnw -B test`
- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

- Files: backend `domain/ExpenseLine`, `service/{CalculationService,ExpenseStatementService}`, `service/llm/{ExtractionPipeline,DefaultPrompt}`, `service/template/TemplateDataService`, `web/dto/Dtos`, `db/migration/V3__drop_expense_line_period.sql`, tests `{CalculationServiceTest,ExtractionPipelineTest,ApiIntegrationTest}`; frontend `pages/GenerateExpenseStatementPage`, `lib/{lines,validation}.ts(+tests)`, `api/schema.ts` (generated), `cypress/e2e/02-expense-statement.cy.ts`; `openapi/openapi.yaml`, `product_prompt.md`, `.opencode/instructions/20-backend.md`.
- CONTRACT CHANGE: `ExpenseLineRequest` and `ExpenseLineDto` lose `periodStart`/`periodEnd`; `ExtractionDto` loses `periodStart`/`periodEnd`. `RentReceiptRequest`/`RentReceiptDto` untouched. YAML edited first, then `cd frontend && npm run gen:api`.
- Backend `cd backend && ./mvnw -B test`: PASS 64 tests, 0 failures, 0 errors, 1 skipped (`TemplateActivationPostgresTest`, pre-existing Docker skip).
- Frontend `npm run typecheck`: PASS. `npm test`: PASS 9 files / 50 tests. `npm run build`: PASS (chunk-size warning only).
- E2E `docker compose -p homeofficeexpenses-e2e ... --exit-code-from cypress`: PASS 19/19 specs, exit 0; Flyway applied V1→V3 on PostgreSQL 17.11 and Hibernate `validate` passed.
- Red→green: CalculationServiceTest monthlyAmount* red (cannot find symbol `monthlyAmount`) → green 7/7 · ExtractionPipelineTest validExtraction+3 red (400 « champ periode_debut absent ») → green 9/9 · ApiIntegrationTest.monthlyAmountDoesNotDependOnMonthLength red (`monthlyAmount` 0.00 ≠ 80.00) → green · validation.test « no longer accepts an invoice period » red (schema shape) → green · lines.test « never sends an invoice period » red → green.
- Deviations: (1) `CalculationService.monthlyAmount(amountInclVat, override)` replaces `allocateToMonth` (override wins, negative rejected) so the rule stays in CalculationService. (2) `api/schema.ts` regenerated wholesale: committed copy used 2-space indent, openapi-typescript 7.13 emits 4 → ~3.6k-line reindent diff, no semantic change beyond the period removal. (3) `lib/allocation.ts`+test, `format.ts#formatPeriod`, `dates.ts#periodInOrder` are now unused but outside the writable list → left untouched. (4) `product_prompt.md` lines 138/247/257/265/271/308/379 also updated beyond the 4 listed lines. (5) README "Assumptions" not updated (not in writable list). (6) Parallel subagents not used: blocks share the OpenAPI contract and the same generated types, so they ran serially.

## Review (Round 1/2)

VERDICT: PASS — money stays in `CalculationService` (`monthlyAmount` override/negative/scale-2, `claimedAmount`, `total`), the YAML/schema removal covers only the three expense/extraction schemas, V3 drops exactly the two columns on a fresh V1→V3 path, `checkFields` still accepts and ignores the legacy period keys, and `lignes[].periode` is now the statement month; every behaviour change has a test that fails on pre-fix code (`monthlyAmount` compile-red, `validExtraction` 400-red, `monthlyAmountDoesNotDependOnMonthLength` 0,00-red, validation shape and e2e input absence red), the `schema.ts` reindent was verified semantics-free, and no leftover period field remains wired.
