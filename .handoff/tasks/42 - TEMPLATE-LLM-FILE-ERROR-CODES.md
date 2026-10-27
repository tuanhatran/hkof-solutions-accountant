# 42
Status: DONE
Branch: feat/42-template-llm-file-error-codes
Base: 7e12eb0
Size: L
Round: 1/2
## Goal
Give every BusinessException/NotFoundException thrown by the template, LLM, file/storage and document-extraction services a stable code (and string params where a message interpolates a value) and translate those codes FR/EN in the UI, keeping the French server message as fallback. Out of scope: core domain services (Task 41), framework handlers, contract/schema, PDF layout, template/LLM behaviour.
## Files
Read: backend/src/main/java/fr/hkof/homeofficeexpenses/service/{BusinessException,NotFoundException}.java · web/GlobalExceptionHandler.java · frontend/src/api/client.ts · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · .handoff/tasks/{40 - API-ERROR-CODES,41 - CORE-DOMAIN-ERROR-CODES}.md
Write: backend/src/main/java/fr/hkof/homeofficeexpenses/service/{ExpenseStatementDocumentService,FileTypeDetector,StorageService}.java · service/extraction/DocumentTextExtractor.java · service/llm/{AnalysisJobService,ExtractionPipeline,LlmConfigService,OllamaClient}.java · service/template/TemplateService.java · backend/src/test/java/fr/hkof/homeofficeexpenses/service/{ExpenseStatementDocumentService,FileTypeDetector,StorageService,StorageServiceEdgeCases}Test.java · service/extraction/{DocumentTextExtractor,DocumentTextExtractorEdgeCases}Test.java · service/llm/{AnalysisJobService,ExtractionPipeline,ExtractionPipelineEdgeCases,LlmConfigService,OllamaClient}Test.java · service/template/{TemplateService,TemplateServiceValidation}Test.java · web/ApiErrorContractIntegrationTest.java · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/i18n/i18n.test.ts
Affected tests: the 15 tests above · ApiErrorContractIntegrationTest · full backend/frontend suites
Symbols: BusinessException, NotFoundException, FileTypeDetector.validateReceipt/validateSignature/validateTemplateHtml, StorageService, DocumentTextExtractor.extract, ExtractionPipeline.extract/interpret, OllamaClient.chat, LlmConfigService, AnalysisJobService, TemplateService, api.errors
## Constraints
Contract: none (`code` is a free string; no YAML change, no gen:api) · Template sandbox logic untouched (TemplateValidator still returns the French report) · LLM/file behaviour untouched · never put the LLM URL/key, response body or server path in params or English messages (HTTP status param only) · params values strings only · no `any`/secrets/personal data · every production class < 300 lines (`ExtractionPipeline.java` is at 299: keep it net-zero or split) · builder commits once, explicit paths, no push
## Acceptance
- Every throw in the 9 files passes a specific SCREAMING_SNAKE code, domain-prefixed (FILE_, RECEIPT_, TEMPLATE_, STATEMENT_, DOCUMENT_, ANALYSIS_, LLM_); variants of the same rule reuse one code; no generic BUSINESS_ERROR/RESOURCE_NOT_FOUND left in scope.
- Dynamic values go into string params only when the translation needs them (e.g. extension, JSON field, HTTP status); the joined template-validation report keeps `TEMPLATE_INVALID` with the French reasons as fallback and no raw reasons in params.
- FR/EN `api.errors.<CODE>` for every new code; FR/EN key-parity test extended; unknown code still falls back to the server detail; no generic BUSINESS_ERROR/RESOURCE_NOT_FOUND translation.
- Service tests assert code and params on each rule's main path (red first); ApiErrorContractIntegrationTest proves one reachable template/LLM/file endpoint returns a code; French message assertions stay green.
- Changed-line coverage >= 80% both sides; full E2E green.
- Lead decision: `TEMPLATE_INVALID` intentionally has NO FR/EN key (same rationale as BUSINESS_ERROR/RESOURCE_NOT_FOUND): a generic translation hid the joined validator reasons and broke `04-admin-templates`; the French report stays the fallback. `TEMPLATE_ACTIVE_NOT_FOUND.type` is the raw TemplateType enum name (already exposed by the French fallback); localizing type labels belongs to the templates UI batch, not this task.
## Commands
- cd backend && ./mvnw -B verify · scripts/diff-coverage.sh 7e12eb0 backend
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build · scripts/diff-coverage.sh 7e12eb0 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
Files: 9 main + 11 backend tests + 3 frontend i18n (23 files, +527/-169), commit 3f1a844.
Codes by file:
- ExpenseStatementDocumentService: STATEMENT_PDF_NOT_FOUND (x2), STATEMENT_SIGNATURE_MISSING, STATEMENT_TEMPLATE_INVALID
- FileTypeDetector: RECEIPT_{EMPTY,TOO_LARGE,UNSUPPORTED_FORMAT,CONTENT_MISMATCH}, SIGNATURE_{EMPTY,TOO_LARGE,UNSUPPORTED_FORMAT} (x2), TEMPLATE_{EMPTY,TOO_LARGE,EXTENSION_INVALID,NOT_TEXT}
- StorageService: RECEIPT_FILE_REQUIRED, FILE_NOT_FOUND (x3 reused), FILE_ACCESS_DENIED
- DocumentTextExtractor: DOCUMENT_UNSUPPORTED_FORMAT, DOCUMENT_UNREADABLE
- AnalysisJobService: RECEIPT_NOT_FOUND (reused), ANALYSIS_NOT_FOUND (x2), ANALYSIS_ALREADY_FINISHED
- ExtractionPipeline: DOCUMENT_NO_TEXT, DOCUMENT_NO_TEXT_NO_VISION, LLM_RESPONSE_{INVALID_JSON,NOT_OBJECT,FIELD_NOT_ALLOWED,FIELD_MISSING,FIELD_INVALID,NO_JSON}
- LlmConfigService: LLM_{CONFIG_NOT_FOUND,PROVIDER_UNKNOWN,PROVIDER_UNSUPPORTED,TIMEOUT_OUT_OF_RANGE,TEMPERATURE_INVALID,TEMPERATURE_OUT_OF_RANGE,CONTEXT_OUT_OF_RANGE,MAX_PAGES_OUT_OF_RANGE,PROMPT_REQUIRED,URL_REQUIRED,URL_INVALID,URL_SCHEME_INVALID}
- OllamaClient: LLM_{MODEL_REQUIRED,EMPTY_RESPONSE,URL_NOT_CONFIGURED,HTTP_ERROR(status),UNREACHABLE}
- TemplateService: TEMPLATE_{ACTIVE_NOT_FOUND(type),NOT_FOUND,RENDER_FAILED(name),NAME_REQUIRED,FILE_UNREADABLE,INVALID,BUILT_IN_NOT_DELETABLE,ACTIVE_NOT_DELETABLE,BUILT_IN_NOT_FOUND}
Red→green: targeted backend 189 tests, 52 failures → 189/0/0; i18n parity EN 95 vs FR 150 keys red → 9/9 green.
PASS cd backend && ./mvnw -B verify: 512 tests, 0 failures, 1 env skip (pdftotext), BUILD SUCCESS.
PASS scripts/diff-coverage.sh 7e12eb0 backend: 95 changed lines, 96%.
PASS cd frontend && npm run test:coverage (63 files/678 tests), lint, format:check, build (all exit 0); diff-coverage frontend exit 0 (no instrumented lines).
PASS E2E: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress: exit 0, 6 specs/26 tests, 0 retries; down -v --remove-orphans exit 0.
Deviations: TEMPLATE_INVALID has no FR/EN key (deliberate: a translation hides the validator reasons; server French detail is the fallback); ExtractionPipeline 296 lines via formatting-only compaction; first E2E run red on 04-admin-templates ("Variables inconnues : variable_inconnue"), fixed then green.
Contract: none (no openapi change, no gen:api).
Commit: 3f1a844 23 files +527/-169

- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — 7e12eb0..3f1a844, 61 sites/56 codes, 55 translated + TEMPLATE_INVALID intentional, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
