# 22 - MULTI-COMPANY-EMPLOYEES
Status: USER_REVIEW · Branch: feat/multi-company-employees · Size: L · Round: 0/2
## Goal
Several companies, each owning its expense items/statements; employees with title enum CEO|CFO|ACCOUNTANT|EMPLOYEE; signatures attached to employees; lease optionally linked to a company. Out of scope: login, sessions, guards, @PreAuthorize, auth UI (RBAC deferred).
Plan: `.handoff/plans/2026-10-24-multi-company-employees.md`
## Files
Context: `product_prompt.md`, `README.md`, `openapi/openapi.yaml`, `backend/src/main/java/.../{domain,repository,service,web,config}`, `frontend/src/{api,components,pages,state}`, `frontend/cypress/e2e`
Writable: the exact paths per W0-W8 in the plan; `.handoff/plans/2026-10-24-multi-company-employees.md`
Tests: backend `*ServiceTest`, `MultiCompanyMigrationPostgresTest`, `ApiIntegrationTest`, `E2eResetIntegrationTest`; frontend `*.test.ts(x)`; Cypress specs.
## Constraints
Contract first: `openapi/openapi.yaml` then `cd frontend && npm run gen:api`; report breaking changes (`/api/settings` removed, `companyId` required, global codes/numbering removed).
Money: `CalculationService` only, BigDecimal, amounts as strings; UI French; no `any`; no commit/push; logical deletion only.
RBAC is documented, never enforced; employee title is descriptive.
## Acceptance
- [ ] W0 `product_prompt` + `README` record the deferred RBAC matrix; W1 contract + generated types; W2 V7 backfills company 1; W3 backend scoped; W4-W6 frontend; W7 E2E.
- [x] backend `./mvnw -B verify` >= 90% LINE/BRANCH; frontend `npm run test:coverage` >= 90% x4; production classes < 300 lines.
- [x] full E2E on the branch: every spec/test green, no retry-only pass.
## Commands
`cd backend && ./mvnw -B verify`
`cd frontend && npm run typecheck && npm test && npm run test:coverage && npm run build`
`docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`
## Evidence
- `2026-10-24 lead:` sized L; RBAC deferred; plan written; branch proposed, awaiting user confirmation.
- `2026-10-24 lead:` branch `feat/multi-company-employees` created from `main`; W0 + W1 dispatched.
- `2026-10-24 builder (W1):` openapi.yaml + generated types updated; removed /api/settings; added companies/employees and companyId scoping; gen:api exit 0.
- `2026-10-24 builder (W0):` product_prompt + README updated; RBAC documented as deferred; grep "Multi-company, employees and deferred RBAC" product_prompt.md -> line 125, grep "RBAC is documented but not implemented" README.md -> line 157 PASS.
- `2026-10-24 lead (W2+W3, inline on primary agent):` V7 migration + multi-company backend implemented; `cd backend && ./mvnw -B verify` exit 0, Tests run: 465, Failures: 0, Errors: 0, Skipped: 8 (Testcontainers/Postgres migration tests skipped: Docker unavailable); JaCoCo bundle LINE 97.36% (3432/3525), BRANCH 92.77% (1206/1300).
- `2026-10-24 lead (W4+W5+W6, inline on primary agent):` frontend API/store/shell, settings companies/employees/signatures/lease, expense/rent/history migrated to the company-scoped contract; `npm run typecheck` exit 0; `npm test` 46 files / 466 tests pass; `npm run test:coverage` exit 0, statements 96.61% / branches 90.32% / functions 95.20% / lines 96.75%; `npm run build` exit 0; `npm run lint` exit 0 (0 errors, 0 warnings); `npm run format:check` exit 0.
- `2026-10-24 lead (W6 closeout):` `SignatureService` split by responsibility into `SignatureService` (223 lines) + `SignatureOwnerService` (117 lines), every production class < 300 lines; `cd backend && ./mvnw -B verify` exit 0, Tests run: 465, Failures: 0, Errors: 0, Skipped: 8, JaCoCo bundle LINE 97.37% (3437/3530), BRANCH 92.77% (1206/1300). The 8 skips are Testcontainers Postgres classes; Testcontainers fails its socket probe (HTTP 400) on this Docker Desktop WSL host while the Docker CLI works.
- `2026-10-24 lead:` W7 not requested (user scope W2–W6) and not done: Cypress specs still target the pre-multi-company contract, so the full E2E gate has NOT run; no independent reviewer ran (user requested primary-agent-only). Status stays USER_REVIEW, never DONE on partial evidence.
- `2026-10-24 lead (W7 E2E, inline):` added `frontend/cypress/e2e/05-multi-company.cy.ts` (2 tests: company/employee/signature/expense-item isolation; statement generation + PDF export + history scoped to the active company). Two real defects found and fixed with failing tests: active-company reset after creation (`CompanyForm` cache upsert before refetch) and invisible landlord signatures in company-filtered lists (`SignatureRepository.findVisibleForCompany`; `SignatureServiceTest#listsSignatures` RED→GREEN, new `SignatureControllerIntegrationTest#listsLandlordSignaturesForCompany`).
- `2026-10-24 lead (E2E gate):` `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml run --rm cypress "cypress run"` exit 0: 6 specs / 26 tests passed, 0 failed, 0 skipped, no retry-only pass (no "Attempt" line). Breakdown: 00-settings 5, 01-rent-receipt 1, 02-expense-statement 12, 03-statement-finalization 1, 04-admin-templates 5, 05-multi-company 2.
- `2026-10-24 lead (W7 gates):` `cd backend && ./mvnw -B verify` exit 0, Tests run: 466, Failures: 0, Errors: 0, Skipped: 8, JaCoCo LINE 97.65% (15952/16336), BRANCH 92.77% (1206/1300). Frontend `npm run test:coverage` exit 0: statements 96.53% / branches 90.23% / functions 95.09% / lines 96.72%; typecheck, lint, format:check, build exit 0. No independent reviewer (primary-agent-only per user): status USER_REVIEW.
