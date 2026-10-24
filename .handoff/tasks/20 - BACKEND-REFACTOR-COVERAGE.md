# 20 - BACKEND-REFACTOR-COVERAGE

Status: DONE
Branch: refactor/backend-classes-coverage
Size: L
Round: 1/2

## Goal

Behavior-preserving backend refactor: every production class stays under 300 lines, JaCoCo
enforces global LINE and BRANCH >= 90%, and the per-task 90% backend / 90% frontend coverage
rule lands in the three agent configurations and the handoff template. Out of scope: contract,
migrations, frontend runtime, money semantics, LLM behavior.

## Files

Context (read only): `openapi/openapi.yaml`, `product_prompt.md`, `backend/src/main/resources/db/migration/`
Writable: `backend/src/main/java/fr/hkof/homeofficeexpenses/{service,web}/**`, `backend/pom.xml`, `.github/workflows/ci.yml`, `.opencode/**`, `.qoder/**`, `.github/**`, `.handoff/TEMPLATE.md`, `AGENTS.md`
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/**`

## Plan

1. JaCoCo 0.8.13: `prepare-agent`, `report`, `check` on bundle LINE 0.90 + BRANCH 0.90 bound to `verify`; CI backend runs `./mvnw -B verify`.
2. Split `ExpenseStatementService` (468) into calculation / document / persistence collaborators behind a thin facade.
3. Split `web/dto/Dtos.java` (326) into per-domain record files and update every reference.
4. Split `TemplateService` (310) into validation + catalog + render; `DocumentTextExtractor` (305) into PDF/OCR + office + helpers.
5. Add tests to raise bundle LINE 77.68% -> 90% and BRANCH 57.82% -> 90% (llm, service, template, extraction, web).
6. Write the 90%/90% coverage gate and the <300-line rule into `.opencode/instructions` + agents, `.qoder` config, `.github` copilot instructions + agents, and `.handoff/TEMPLATE.md`.

## Constraints

- Contract: none; no endpoint, DTO field, amount, rounding, LLM prompt or template-sandbox behavior change.
- Every production Java file < 300 lines after the refactor; no `double`, no client-side money.
- No commit or push. No coverage exclusion beyond the Spring Boot application class.

## Acceptance

- [ ] `find backend/src/main -name '*.java' | xargs wc -l` -> every file < 300 lines
- [ ] `cd backend && ./mvnw -B verify` exits 0 with bundle LINE >= 90% and BRANCH >= 90%
- [ ] `.opencode`, `.qoder`, `.github` and `.handoff/TEMPLATE.md` state the 90% backend (lines+branches) and 90% frontend gate for every new task
- [ ] Full E2E suite green on this branch

## Commands

- backend: `cd backend && ./mvnw -B verify`
- frontend: `cd frontend && npm run typecheck && npm test && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.

- `2026-10-24 lead:` sized L; branch `refactor/backend-classes-coverage` from `main`; user chose global lines+branches >= 90%, production classes only for the 300-line cap.
- `2026-10-24 lead:` baseline `./mvnw -B test` 138 tests / 0 failures / 6 skipped (no Docker); JaCoCo LINE 77.68% (2471/3181), BRANCH 57.82% (680/1176).
- `2026-10-24 lead:` Docker unavailable locally; E2E gate cannot run until it is up, so the task can only reach BLOCKED without it.
- `2026-10-24 builder:` JaCoCo 0.8.13 (`prepare-agent`, `report`, `check` on BUNDLE LINE/BRANCH 0.90, exclusion `**/HomeOfficeExpensesApplication.class`) + CI backend `./mvnw -B verify` wired; coverage/size rule written in `AGENTS.md`, `.opencode/instructions/{20-backend,40-verification}.md`, `.opencode/agents/{lead,builder,reviewer}.md`, `.qoder/README.md`, `.qoder/agents/{lead,builder,reviewer}.md`, `.github/copilot-instructions.md`, `.github/agents/{lead,builder,reviewer}.agent.md`, `.handoff/TEMPLATE.md`.
- `2026-10-24 builder:` `cd backend && ./mvnw -B test` PASS 138 tests / 0 failures / 0 errors / 6 skipped, 23.9 s.
- `2026-10-24 builder:` `cd backend && ./mvnw -B verify` FAIL (expected) at `jacoco:0.8.13:check`: `Rule violated for bundle homeofficeexpenses-backend: lines covered ratio is 0.77, but expected minimum is 0.90` and `branches covered ratio is 0.57, but expected minimum is 0.90`; real coverage LINE 77.72% (2470/3178), BRANCH 57.82% (680/1176) with the application class excluded (111 classes checked, 112 reported).
- `2026-10-24 builder:` behavior-preserving split. `ExpenseStatementService` 468 -> 222 (facade) with new `ExpenseStatementLineCalculator` 107 + `ExpenseStatementDocumentService` 227 + package-private `CalculatedLine` 23; `Dtos` 326 -> removed, split into `SettingsDtos` 34, `RentConfigurationDtos` 48, `RentReceiptDtos` 55, `ExpenseItemDtos` 30, `StatementDtos` 78, `ExtractionDtos` 36, `LlmDtos` 58, `TemplateDtos` 33, `SignatureDtos` 19 (record names/components/order unchanged; 27 files had their imports rewritten, 23 main + 4 test); `TemplateService` 310 -> 194 + `TemplateValidator` 136; `DocumentTextExtractor` 305 -> 70 + `PdfDocumentReader` 156 + `OfficeDocumentReader` 74 + `DocumentTextNormalizer` 65. Public APIs, constructor used by tests, `@Service`/`@Transactional` boundaries and money semantics unchanged.
- `2026-10-24 builder:` `cd backend && ./mvnw -B test` PASS 138 tests / 0 failures / 0 errors / 6 skipped (no Docker), 23.6 s.
- `2026-10-24 builder:` `find backend/src/main -name '*.java' -exec wc -l {} + | sort -rn` max 299 lines (`service/llm/ExtractionPipeline.java`, unchanged, not over the cap); no file >= 300.
- `2026-10-24 builder:` E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0, "All specs passed!", 5 specs / 24 tests / 0 failures; `down -v --remove-orphans` done. Docker was available this run, so the earlier E2E blocker is cleared.
- `2026-10-24 builder:` JaCoCo gate still expected red: this run preserved behavior only. Risk for the coverage runs: the extracted collaborators (`ExpenseStatementLineCalculator`, `ExpenseStatementDocumentService`, `TemplateValidator`, `PdfDocumentReader`, `OfficeDocumentReader`, `DocumentTextNormalizer`) are covered only through their previous callers, so preview/generate/zip/OCR branches need explicit tests in the coverage run; line/statement totals shift slightly because the same logic now lives in more files.
- `2026-10-24 builder:` coverage run 3 summary (LLM + extraction). New test files: `FileTypeDetectorTest`, `OfficeDocumentReaderTest`, `AnalysisDocumentTest`, `AnalysisStatusTest`, `AnalysisJobServiceTest`, `ExtractionPipelineEdgeCasesTest`; extended `LlmConfigServiceTest`, `OllamaClientTest`, `TotalAmountResolverTest`, `ExternalCommandTest`. Bundle tests 138 -> 252 (+114). JaCoCo bundle LINE 2501/3211 (77.89%) -> 2825/3211 (87.98%, +324 lines); BRANCH 680/1176 (57.82%) -> 880/1176 (74.83%, +200 branches). Remaining to reach 90%: 65 lines and 179 branches. No production code, contract, migration, LLM behavior or Python/JS file touched; all production classes stay < 300 lines (max `ExtractionPipeline` 299).
- `2026-10-24 builder:` `cd backend && ./mvnw -B test` PASS 252 tests / 0 failures / 0 errors / 6 skipped (Docker-less migration tests), BUILD SUCCESS. `cd backend && ./mvnw -B verify` still FAIL at `jacoco:check` as expected: "lines covered ratio is 0.88, but expected minimum is 0.90" and "branches covered ratio is 0.74, but expected minimum is 0.90"; thresholds untouched. Full E2E `docker compose ... up --build --abort-on-container-exit --exit-code-from cypress` exit 0, "All specs passed!", 5 specs / 24 tests / 0 failures, then `down -v --remove-orphans` done.
- `2026-10-24 builder:` remaining uncovered classes/branches for run 4, prioritized: `template/TemplateService` 54L/19B, `template/TemplateDataService` 38L/15B, `service/ExpenseStatementService` 32L/17B, `service/StorageService` 23L/8B, `service/ExpenseItemService` 22L/19B, `service/Amounts` 15L/17B, `web/GlobalExceptionHandler` 15L/0B, `service/ExpenseStatementLineCalculator` 10L/14B, `template/TemplateValidator` 9L/16B, `extraction/DocumentTextExtractor` 9L/16B, `NumberToWords` 9L/14B, `DocumentTextNormalizer` 9L/6B, `web/TemplateController` 9L/0B, `ExpenseStatementDocumentService` 8L/16B, `PdfService` 8L/10B, `RentConfigurationService` 8L/9B, `RentReceiptService` 7L/28B, `PdfDocumentReader` 6L/8B. Genuinely unreachable in run 3 targets (reported, not excluded): `AnalysisJobService` line 75-76 (`launch == null` cannot occur because the transaction callback always returns a `Launch`); `ExtractionPipeline` line 88-89 (`root` is always an object because `isolateJson` extracts from the first `{` to the last `}`, so a parsed non-object root cannot occur) and line 197/201 (`checkFields` requires every read field, so `clean` never sees a missing node); `ExternalCommand` interruption branches (49-56, 64-69, 76-77) require thread interruption mid-wait and are not deterministically reachable in a unit test; `FileTypeDetector` switch `default` cases (43/51/79/82) are unreachable because every MIME-mapped extension has an explicit case.
- `2026-10-24 builder:` coverage run 4 summary (service/template/web/extraction). 23 new test files added across the coverage runs (last batch: `SignatureServiceEdgeCasesTest`, `RentReceiptServiceTest`, `ExpenseStatementServiceTest`, `ExpenseStatementDocumentServiceTest`, `TemplateServiceTest`, `TemplateDataServiceTest`, `TemplateCatalogTest`, `TemplateValidatorSecurityTest`, `PdfServiceEdgeCasesTest`, `StorageServiceEdgeCasesTest`, `SettingsServiceTest`, `ExpenseItemServiceTest`, `ReceiptServiceTest`, `RentConfigurationServiceTest`, `ExpenseStatementLineCalculatorTest`, `GlobalExceptionHandlerTest`, `DataInitializerTest`, `AmountsEdgeCasesTest`, `CalculationServiceEdgeCasesTest`, `NumberToWordsEdgeCasesTest`, `DocumentTextNormalizerTest`, `DocumentTextExtractorEdgeCasesTest`, `PdfDocumentReaderEdgeCasesTest`). JaCoCo bundle LINE 2825/3211 (87.98%) -> 3133/3211 (97.57%); BRANCH 880/1176 (74.83%) -> 1097/1176 (93.28%); METHOD 742/777 (95.50%). No production code, contract, migration, money or LLM behavior changed; max production class 299 lines (`ExtractionPipeline`, untouched).
- `2026-10-24 builder:` `cd backend && ./mvnw -B verify` PASS, BUILD SUCCESS: 439 tests / 0 failures / 0 errors / 6 skipped (Docker-less migration tests), `jacoco:0.8.13:check` -> "All coverage checks have been met." bundle LINE 97.57% (3133/3211) and BRANCH 93.28% (1097/1176), thresholds untouched at 0.90/0.90.
- `2026-10-24 builder:` full E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` exit 0, "All specs passed!", 5 specs / 24 tests / 0 failures; `down -v --remove-orphans` done. All four acceptance criteria now verified.
- `2026-10-24 lead:` independently re-ran `cd backend && ./mvnw -B verify` PASS: 439 tests / 0 failures / 0 errors / 6 skipped, "All coverage checks have been met.", LINE 97.57% (3133/3211), BRANCH 93.28% (1097/1176); max production file 299 lines.
- `2026-10-24 lead:` `cd frontend && npm run typecheck && npm run test:coverage && npm run build` PASS: 44 files / 417 tests; lines 96.67%, statements 96.49%, functions 95.02%, branches 90.14%.
- `2026-10-24 lead:` independently re-ran full E2E PASS (exit 0): 5 specs / 24 tests / 0 failures, "All specs passed!"; `down -v --remove-orphans` exit 0. Earlier Docker-unavailable blocker cleared.
- `2026-10-24 reviewer:` `APPROVED` (round 1) — no blocker on behavior preservation, DTO contract, coverage honesty, config wording or security.
- `2026-10-24 lead:` DONE — user accepted
