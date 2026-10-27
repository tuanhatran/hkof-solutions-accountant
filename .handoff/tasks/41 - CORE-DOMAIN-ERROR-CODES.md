# 41
Status: DONE
Branch: feat/41-core-domain-error-codes
Base: 10afed1
Size: L
Round: 1/2
## Goal
Give every BusinessException/NotFoundException thrown by the core domain services a stable code (and string params where a message interpolates a value) and translate those codes FR/EN in the UI, keeping the French server message as fallback. Out of scope: templates, LLM, files/storage (Task 42), framework handlers, contract/schema, PDFs, feature-page copy.
## Files
Read: backend/src/main/java/fr/hkof/homeofficeexpenses/service/{BusinessException,NotFoundException}.java · backend/src/main/java/fr/hkof/homeofficeexpenses/web/GlobalExceptionHandler.java · frontend/src/api/client.ts · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · .handoff/tasks/40 - API-ERROR-CODES.md
Write: backend/src/main/java/fr/hkof/homeofficeexpenses/service/{AddressService,Amounts,CalculationService,CompanyService,EmployeeService,ExpenseItemService,ExpenseStatementLineCalculator,ExpenseStatementService,LeaseService,PersonService,ReceiptService,RentReceiptService,SignatureService}.java · backend/src/test/java/fr/hkof/homeofficeexpenses/service/{AddressService,Amounts,AmountsEdgeCases,CalculationService,CalculationServiceEdgeCases,CompanyService,EmployeeService,ExpenseItemService,ExpenseStatementLineCalculator,ExpenseStatementService,LeaseService,PersonService,ReceiptService,RentReceiptService,SignatureService,SignatureServiceEdgeCases}Test.java · backend/src/test/java/fr/hkof/homeofficeexpenses/web/ApiErrorContractIntegrationTest.java · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/i18n/i18n.test.ts
Affected tests: the 16 service tests above · ApiErrorContractIntegrationTest · full backend/frontend suites
Symbols: BusinessException, NotFoundException, Amounts.decimal/percentage/date/month, CalculationService, service throw sites, api.errors
## Constraints
Contract: none (`code` is a free string; no YAML change, no gen:api) · Money: CalculationService + BigDecimal, never double · server title/detail stay French fallback · params values are strings only · no `any` · builder commits once, explicit paths, no push
## Acceptance
- Every throw in the 13 files passes a specific SCREAMING_SNAKE code; helpers that accepted a message now accept the code too; no generic BUSINESS_ERROR/RESOURCE_NOT_FOUND remains in scope.
- One code per rule, domain-prefixed (ADDRESS_, COMPANY_, LEASE_, PERSON_, EMPLOYEE_, EXPENSE_ITEM_, STATEMENT_, RECEIPT_, RENT_RECEIPT_, SIGNATURE_, AMOUNT_, PRO_RATA_, VAT_, MONTH_, DATE_); dynamic values go into string params (name, code, month); field labels stay only in the French fallback so no French literal is interpolated in English.
- FR/EN `api.errors.<CODE>` for every new code; FR/EN key-parity test; unknown code still falls back to the server detail; no generic BUSINESS_ERROR/RESOURCE_NOT_FOUND translation.
- Service tests assert code and params on each rule's main path (red first); ApiErrorContractIntegrationTest proves one real endpoint returns a core code; existing French message assertions stay green.
- Changed-line coverage >= 80% both sides; full E2E green.
## Commands
- cd backend && ./mvnw -B verify · scripts/diff-coverage.sh 10afed1 backend
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build · scripts/diff-coverage.sh 10afed1 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.

## Builder evidence
- Commit 7e12eb0 — 33 files, +660/-218 (13 services, 17 backend tests, fr.ts, en.ts, i18n.test.ts); `.handoff/` untouched.
- Codes: AddressService ADDRESS_REQUIRED; Amounts AMOUNT_{REQUIRED,INVALID,MUST_BE_STRICTLY_POSITIVE,MUST_BE_POSITIVE_OR_ZERO}, PRO_RATA_{REQUIRED,INVALID,TOO_MANY_DECIMALS,OUT_OF_RANGE}, DATE_INVALID, MONTH_{REQUIRED,INVALID}.
- CalculationService AMOUNT_{REQUIRED,NEGATIVE,PRO_RATA_REQUIRED}, PRO_RATA_{OUT_OF_RANGE,BUSINESS_AREA_OUT_OF_RANGE}, VAT_{NET_AMOUNT_REQUIRED,NET_AMOUNT_NEGATIVE,RATE_REQUIRED,RATE_OUT_OF_RANGE}; CompanyService LEASE_{NOT_FOUND,ALREADY_LINKED,COMPANY_LEASE_LOCKED}, COMPANY_{IN_USE,ACTIVE_LEASE_TENANT,REQUIRED,NOT_FOUND,SIREN_DUPLICATE,NAME_REQUIRED}.
- EmployeeService EMPLOYEE_{HAS_SIGNATURES,NOT_FOUND,FIRST_NAME_REQUIRED,LAST_NAME_REQUIRED,EMAIL_INVALID,EMAIL_DUPLICATE,TITLE_REQUIRED,TITLE_INVALID}; ExpenseItemService COMPANY_REQUIRED, EXPENSE_ITEM_{UNKNOWN_CODE,NOT_FOUND,LABEL_REQUIRED,CODE_DUPLICATE,PERIODICITY_INVALID,CODE_INVALID}.
- ExpenseStatementLineCalculator EXPENSE_ITEM_{REQUIRED,SINGLE_USE}, STATEMENT_{AMOUNT_SOURCE_INVALID,AI_CONFIDENCE_INVALID}; ExpenseStatementService STATEMENT_{LINES_REQUIRED,NOT_FOUND}; LeaseService LEASE_{PARTIES_REQUIRED,SINGLE_TENANT_REQUIRED,ACTIVE_NOT_FOUND,NOT_FOUND,NOT_IN_COMPANY,LANDLORD_REQUIRED,COMPANY_TENANT_INVALID,TENANT_COMPANY_REQUIRED,ALREADY_EXISTS,TENANT_REQUIRED,PARTIES_IDENTICAL,COMPANY_ALREADY_LINKED,SURFACES_REQUIRED,EMPLOYEE_PARTY}, ADDRESS_REQUIRED, PERSON_NOT_FOUND.
- PersonService PERSON_{HAS_SIGNATURES,IN_USE,REQUIRED,NOT_FOUND,NAME_REQUIRED}; ReceiptService RECEIPT_{NOT_FOUND,IN_USE}; RentReceiptService RENT_RECEIPT_{NOT_FOUND,PDF_NOT_FOUND,TEMPLATE_INVALID,PERIOD_INVALID}, SIGNATURE_MISSING.
- SignatureService SIGNATURE_{NAME_REQUIRED,NAME_TOO_LONG,FILE_REQUIRED,FILE_UNREADABLE,NOT_OWNED,COMPANY_REQUIRED,NOT_CEO,NOT_FOUND}, PERSON_{REQUIRED,NOT_FOUND}; params (strings): title, code, periodicity, label, source, confidence.
- Red: targeted 17-class run 166 tests, 72 failures (expected BUSINESS_ERROR/RESOURCE_NOT_FOUND); i18n parity 1 failed/6 passed (FR added, EN missing).
- Green: same targeted run 166/0; `codegraph affected` 30 files run 313 tests/0 failures; French detail assertions unchanged.
- `./mvnw -B verify`: PASS 510 tests, 0 failures, 1 skipped, BUILD SUCCESS.
- `scripts/diff-coverage.sh 10afed1 backend`: PASS 99% (125 changed lines, 1 missing: ExpenseItemService:57).
- Frontend: `npm run test:coverage` PASS 63 files/676 tests; `lint` PASS; `format:check` PASS; `build` PASS.
- `scripts/diff-coverage.sh 10afed1 frontend`: PASS exit 0 (no changed lines with coverage data; i18n resources/tests only).
- E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, 6 specs/26 tests/26 passing/0 failing/0 pending, no retries; `down -v --remove-orphans` exit 0.
- Deviations: `format:check` flagged the 3 i18n files before prettier --write (fixed, rechecked). Custom invalid-image signature assertions left without code (FileTypeDetector is Task 42). No other deviation.
- Contract impact: none. Task 42 dependencies: StorageService, FileTypeDetector, ExpenseStatementDocumentService, TemplateService, extraction/ and llm/ throw sites still generic.

- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — 10afed1..7e12eb0, 75 codes with FR/EN parity, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
