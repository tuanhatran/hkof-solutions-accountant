# 22 - MULTI-COMPANY-EMPLOYEES
Status: TODO · Branch: feat/multi-company-employees · Size: L · Round: 0/2
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
- [ ] backend `./mvnw -B verify` >= 90% LINE/BRANCH; frontend `npm run test:coverage` >= 90% x4; production classes < 300 lines.
- [ ] full E2E on the branch: every spec/test green, no retry-only pass.
## Commands
`cd backend && ./mvnw -B verify`
`cd frontend && npm run typecheck && npm test && npm run test:coverage && npm run build`
`docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`
## Evidence
- `2026-10-24 lead:` sized L; RBAC deferred; plan written; branch proposed, awaiting user confirmation.
- `2026-10-24 lead:` branch `feat/multi-company-employees` created from `main`; W0 + W1 dispatched.
- `2026-10-24 builder (W1):` openapi.yaml + generated types updated; removed /api/settings; added companies/employees and companyId scoping; gen:api exit 0.
- `2026-10-24 builder (W0):` product_prompt + README updated; RBAC documented as deferred; grep "Multi-company, employees and deferred RBAC" product_prompt.md -> line 125, grep "RBAC is documented but not implemented" README.md -> line 157 PASS.
