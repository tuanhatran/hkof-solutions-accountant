# 40
Status: DONE
Branch: feat/40-api-error-codes
Base: 187a160
Size: L
Round: 2/2
## Goal
Add stable error codes to the RFC 9457 ProblemDetail and translate them in the frontend (FR/EN), with the French server detail as fallback. Out of scope: service-specific codes (Tasks 41/42), Accept-Language, PDFs, feature UI.
## Files
Read: openapi/openapi.yaml · backend/src/main/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandler.java · backend/src/main/java/fr/hkof/homeofficeexpenses/service/{BusinessException,NotFoundException}.java · frontend/src/api/{client.ts,client.test.ts,endpoints.ts} · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts
Write: openapi/openapi.yaml · backend/src/main/java/fr/hkof/homeofficeexpenses/service/{BusinessException,NotFoundException}.java · backend/src/main/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandler.java · backend/src/test/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandlerTest.java · frontend/src/api/schema.ts (generated) · frontend/src/api/{client.ts,client.test.ts} · frontend/src/i18n/resources/{fr.ts,en.ts}
Affected tests: backend/src/test/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandlerTest.java · frontend/src/api/{client,queries}.test.ts · frontend/src/i18n/i18n.test.ts · full suites
Symbols: ProblemDetail, GlobalExceptionHandler, BusinessException, NotFoundException, ApiError, errorMessage, api.errors
## Constraints
Contract: openapi/openapi.yaml#/components/schemas/ProblemDetail (`code` required, `params` optional) · never hand-edit schema.ts · no any · server title/detail stay French fallback · no money/LLM/template logic change · builder commits once, explicit paths
## Acceptance
- ProblemDetail carries `code` (required) and optional `params` (string map); `npm run gen:api` regenerates schema.ts.
- Every GlobalExceptionHandler response sets a stable code: RESOURCE_NOT_FOUND, BUSINESS_ERROR, VALIDATION_FAILED, REQUEST_INVALID, INVALID_PARAMETER, MISSING_OR_INVALID_PARAMETER, INVALID_BODY, FILE_TOO_LARGE, INVALID_FILE, INTERNAL_ERROR; exceptions accept code+params.
- `errorMessage` renders `api.errors.<CODE>` in the current language with params; unknown code falls back to server detail/title; NETWORK_ERROR, HTTP_ERROR and UNEXPECTED_ERROR are localized FR/EN.
- Do not translate BUSINESS_ERROR or RESOURCE_NOT_FOUND generically (would mask service details until Tasks 41/42).
- Tests cover codes/params, FR/EN rendering, fallback; existing suites green.
## Commands
- cd frontend && npm run gen:api · cd backend && ./mvnw -B verify · scripts/diff-coverage.sh 187a160 backend
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build · scripts/diff-coverage.sh 187a160 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.

## Builder evidence
Commit: 3baced1 10 files +388/-59
Contract: ProblemDetail requires `code` (string) and accepts optional `params` (additionalProperties string); no path changed; schema.ts regenerated.
- cd frontend && npm run gen:api: PASS (schema.ts +6)
- cd backend && ./mvnw -B verify: PASS (498 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS)
- scripts/diff-coverage.sh 187a160 backend: PASS (97%, 41 changed lines, 1 missing)
- cd frontend && npm run test:coverage: PASS (63 files, 674 tests, 96.96% lines overall)
- cd frontend && npm run lint: PASS · npm run format:check: PASS · npm run build: PASS
- scripts/diff-coverage.sh 187a160 frontend: PASS (93%, 33 changed lines, 2 missing)
- E2E: PASS exit 0, 6/6 specs, 26/26 tests, no retries; down -v --remove-orphans exit 0
- Red→green: GlobalExceptionHandlerTest 6 failures + 1 error → 7 passed; client.test.ts 7 failed/16 passed → 23 passed.
Deviations: none.
Round 2 builder evidence:
- Red before fix: ApiErrorContractIntegrationTest 4/5 failed with `No value at JSON path "$.code"` (malformed POST /api/companies, missing and mistyped companyId on GET /api/expense-items, unknown GET /api/definitely-not-a-route); bodies were Boot's ProblemDetail, e.g. `{"detail":"No static resource api/definitely-not-a-route.","status":404,"title":"Not Found"}`.
- Green after `@Order(Ordered.HIGHEST_PRECEDENCE)`: ApiErrorContractIntegrationTest 5/5 PASS, GlobalExceptionHandlerTest 7/7 PASS; params are asserted as JSON strings over HTTP (PROBE_CODE probe returns `"count":"3"` as String).
- cd backend && ./mvnw -B verify: PASS (503 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS).
- scripts/diff-coverage.sh 187a160 backend: PASS (96%, 30 changed lines, 1 missing).
- E2E run 1: FAIL exit 1, 6 specs, 25/26 tests; 00-settings.cy.ts "adds, edits then removes an expense type" failed both attempts (line 132: "Bail actif" not found; tab reset to Info générale while /api/companies returned 200). down -v exit 0.
- E2E run 2 (down -v first): exit 0, 6/6 specs, 26/26 tests, but the same spec passed only on Cypress retry ("Attempt 1 of 2", 1 screenshot); retry-only green, not valid evidence. down -v exit 0.
- Root cause: CompanySection.tsx:62-64 resets the tab to "identification" when selectedId resolves after the companies fetch; 00-settings.cy.ts:132 clicks Baux & Frais without waiting for the company. Pre-existing frontend race, untouched by this backend-only diff.
- Side effect (diagnostic probe, not committed): with HIGHEST_PRECEDENCE the catch-all Exception handler shadows Boot's other 4xx handlers; PUT /api/companies now answers 500 INTERNAL_ERROR instead of 405. Needs a decision beyond the prescribed annotation-only fix.
- BLOCKED: E2E gate not clean (red run, then retry-only green). Fix is ready but uncommitted per the no-commit-on-red-gate rule; Status unchanged.

## Review round 1
Reviewer VERDICT: BLOCKERS (1) — backend/src/main/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandler.java:26 keeps default LOWEST_PRECEDENCE while `spring.mvc.problemdetails.enabled: true` (application.yml:24-25) registers Boot's ProblemDetailsExceptionHandler at `@Order(0)`. So HttpMessageNotReadable, missing/type-mismatch parameter, HandlerMethodValidation, MaxUploadSize and NoResourceFound are answered by Boot with a ProblemDetail that lacks the now-required `code`; the UI falls back to Boot's English detail and the new translations never apply. Direct unit tests cannot see this.
Fix: annotate the advice `@Order(Ordered.HIGHEST_PRECEDENCE)`; add a MockMvc integration test that loads Boot's problem-details handler and proves `code` for malformed JSON (INVALID_BODY), missing/invalid parameter (MISSING_OR_INVALID_PARAMETER) and unknown route (RESOURCE_NOT_FOUND); capture red before the annotation, green after; assert `params` values serialize as strings.
Fix write addition: backend/src/test/java/fr/hkof/homeofficeexpenses/web/ApiErrorContractIntegrationTest.java (new).

## Round 2 scope (lead decision)
Builder reproduced the blocker (red: no `$.code` on malformed body, missing/mistyped parameter, unknown route) and found two consequences to resolve before commit: the HIGHEST catch-all shadows Boot's 405/415/406 (returns 500 INTERNAL_ERROR), and the E2E spec 00-settings is flaky against a fresh backend.
Decision: keep `@Order(HIGHEST_PRECEDENCE)`; move the catch-all `Exception` handler to a new `FallbackExceptionHandler` left at default/LOWEST order so Boot still answers the framework exceptions it owns; add explicit code-bearing handlers for `HttpRequestMethodNotSupportedException` (405 METHOD_NOT_ALLOWED), `HttpMediaTypeNotSupportedException` (415 UNSUPPORTED_MEDIA_TYPE), `HttpMediaTypeNotAcceptableException` (406 NOT_ACCEPTABLE); broaden the parameter handler to `ServletRequestBindingException` (missing part/header) with MISSING_OR_INVALID_PARAMETER. No 500 where a 4xx is correct and no code-less ProblemDetail on the reviewer's cases. Add FR/EN `api.errors` for the three new codes plus tests. E2E: make `frontend/cypress/e2e/00-settings.cy.ts` wait for the resolved company before clicking `onglet-entreprise-bail-frais` (the `selectedId` effect resets the tab); the CompanySection race stays out of scope, report it as a risk.
Round 2 write additions: backend/src/main/java/fr/hkof/homeofficeexpenses/web/FallbackExceptionHandler.java (new) · backend/src/test/java/fr/hkof/homeofficeexpenses/web/{GlobalExceptionHandlerTest,ApiErrorContractIntegrationTest}.java · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/api/client.test.ts · frontend/cypress/e2e/00-settings.cy.ts

Round 2 builder evidence (advice split + E2E wait):
- Red 405/415/406: ApiErrorContractIntegrationTest 9 tests, 3 failures `Status expected:<405> but was:<500>` (same for 415/406), 500 body had `"code":"INTERNAL_ERROR"`; fallback probe green at 500 INTERNAL_ERROR.
- Green targeted: ApiErrorContractIntegrationTest 9/9, GlobalExceptionHandlerTest 9/9, FallbackExceptionHandlerTest 1/1 (18/18 PASS).
- cd backend && ./mvnw -B verify: PASS (509 tests, 0 failures, 0 errors, 1 skipped, BUILD SUCCESS).
- scripts/diff-coverage.sh 187a160 backend: PASS (100%, 38 changed lines, 0 missing).
- cd frontend && npm run test:coverage: PASS (63 files, 675 tests, 97.08% lines overall).
- cd frontend && npm run lint: PASS · npm run format:check: PASS · npm run build: PASS.
- scripts/diff-coverage.sh 187a160 frontend: PASS (93%, 33 changed lines, 2 missing).
- Red→green client.test.ts: new protocol-code test failed (`expected 'Détail serveur en anglais.'`), then 24/24 PASS; unknown code UNKNOWN_NEW_CODE still falls back to server detail (existing assertion green).
- E2E: PASS exit 0, 6/6 specs, 26/26 tests, `All specs passed!` with 0 failures; no retry Attempt 2 anywhere (00-settings 5/5 incl. expense type in Attempt 1). Pre down -v exit 0; post down -v --remove-orphans exit 0.
- 00-settings fix: wait for `[data-cy="info-societe"]` visible before clicking the Baux & Frais tab, so the selectedId effect cannot reset it.
- Commit: 10afed1 9 files +279/-17.
- Deviations: none. Contract: none changed (ProblemDetail.code already a free string, no enum).
- Risk (out of scope): CompanySection.tsx:60-70 unconditionally resets the tab to "identification" when selectedId resolves; the spec now waits, but the UI race remains.

- 2026-10-27 lead: VERDICT: PASS (reviewer, round 2/2) — 3baced1..10afed1, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
