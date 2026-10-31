# 100 - E2E-ONBOARDING-PERSONAL-AGENCY-AND-RESUME

Status: DONE
Branch: feat/97-auth-onboarding-language-and-personal-agency
Base: 7754fe8
Size: S
Round: 0/1

## Goal

Extend Cypress end-to-end testing in `07-onboarding.cy.ts` to cover the complete flow: language toggling on `/login` and `/welcome`, registering with only the Agency module (`companyEnabled = false, lmnpEnabled = true`), onboarding with Personal Agency (verifying zero `/api/companies` calls and no 403 errors), skipping to dashboard, resuming from the progress card, and switching from Personal to Professional agency in Settings.

## Files

Context (read only): `frontend/cypress/support/helpers.ts`, `frontend/cypress/e2e/06-auth.cy.ts`.
Writable E2E:
- `frontend/cypress/e2e/07-onboarding.cy.ts`
- `.handoff/data-cy-mapping.md`
Affected tests: `frontend/cypress/e2e/07-onboarding.cy.ts`.
Touched E2E: `07-onboarding`.

## Constraints

Run against the running E2E Docker stack via `make e2e 07-onboarding` · do not restart stack unnecessarily · update `.handoff/data-cy-mapping.md` with new test hooks (`input-onboarding-personal-agency`, `btn-skip-onboarding`, `btn-resume-onboarding`, `tab-agency-settings`).

## Acceptance

- [x] Cypress test verifies language switcher on login and onboarding pages.
- [x] Cypress test registers a user with only the Agency module enabled.
- [x] Onboarding Step 1 with "Agence personnelle" completes without calling `/api/companies`.
- [x] Cypress test skips to dashboard, verifies `OnboardingProgressCard`, and resumes back to `/welcome`.
- [x] Onboarding completes successfully, and editing in `/settings/agency` transitions to a Professional Agency.
- [x] `make e2e 07-onboarding` passes with 0 failures.

## Commands

`make e2e-up` (once) · `make e2e 07-onboarding` · `make e2e-down` (once user accepts).

## Evidence

Files changed: `frontend/cypress/e2e/07-onboarding.cy.ts`, `.handoff/data-cy-mapping.md`.
E2E: `make e2e 07-onboarding` exit 0 (1 spec, 1 test passing, 0 failing).
Lint: `npx eslint cypress/e2e/07-onboarding.cy.ts` PASS (0 errors).
Prettier: `npx prettier --check` PASS (2 files matched).
Build: `npm run build` PASS (tsc + vite build in 1.22s).
Deviations: none.
Contract impact: none.
Commit: 6822643 1 file +98/-22
- 2026-10-31 lead: DONE — user accepted; `make e2e-down` removed the e2e stack, containers, network and volumes.
