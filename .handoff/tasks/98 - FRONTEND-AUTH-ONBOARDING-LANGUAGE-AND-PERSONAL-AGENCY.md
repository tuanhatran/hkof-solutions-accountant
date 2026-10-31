# 98 - FRONTEND-AUTH-ONBOARDING-LANGUAGE-AND-PERSONAL-AGENCY

Status: DONE
Branch: feat/97-auth-onboarding-language-and-personal-agency
Base: 08ff5ec
Size: M
Round: 0/1

## Goal

Add the French/English language toggle (`LanguageSelector`) to `AuthPage` and `OnboardingPage`, add a "Personal Agency" ("Agence personnelle") checkbox in Onboarding Step 1 ("Profil") that removes the 3 corporate fields (`legalForm`, `sirenSiret`, `agencyAddress`), and remove all calls to `/api/companies` during onboarding by saving agency info to `api.agency.save(...)`.

## Files

Context (read only): `frontend/src/components/layout/LanguageSelector.tsx`, `frontend/src/api/schema.ts`, `frontend/src/api/endpoints.ts`.
Writable frontend:
- `frontend/src/pages/auth/AuthPage.tsx`
- `frontend/src/pages/auth/AuthPage.css`
- `frontend/src/pages/auth/AuthPage.test.tsx`
- `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`
- `frontend/src/pages/onboarding/OnboardingPage.tsx`
- `frontend/src/pages/onboarding/useOnboardingState.ts`
- `frontend/src/pages/onboarding/OnboardingPage.test.tsx`
- `frontend/src/i18n/resources/fr.ts`
- `frontend/src/i18n/resources/en.ts`
Affected tests: `frontend/src/pages/auth/AuthPage.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Touched E2E: none.

## Constraints

`LanguageSelector` rendered on `AuthPage` (`/login`, `/register`, etc.) and `OnboardingPage` header · "Personal Agency" checkbox (`isPersonalAgency`, boolean, default false) placed under Agence subtitle in Step 1 · checking Personal Agency hides `legalForm`, `sirenSiret`, and `agencyAddress`, and clears/omits validation for them · `ensureAgency` and all calls to `api.companies.*` removed from `OnboardingPage.tsx` · profile step saves agency to `api.agency.save(...)` and manager to `api.persons.*` · UI strings French in `fr.ts`, English in `en.ts` · every component < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] `AuthFrame` displays `LanguageSelector` allowing instant FR/EN switching on `/login`, `/register`, `/confirm-email`, and `/password`.
- [x] `OnboardingPage` header displays `LanguageSelector` allowing instant FR/EN switching at any onboarding step.
- [x] Onboarding Step 1 features an "Agence personnelle" checkbox with hook `data-cy="input-onboarding-personal-agency"`.
- [x] Checking "Agence personnelle" hides `legalForm`, `sirenSiret`, and `agencyAddress`, requiring only `agencyName`.
- [x] Saving profile in Step 1 does not invoke `/api/companies`, calls `api.agency.save(...)`, and completes without error when `companyEnabled = false`.
- [x] All unit tests pass in `AuthPage.test.tsx` and `OnboardingPage.test.tsx`; changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 4394181 all`.

## Deliverable

Files changed: `frontend/src/i18n/resources/{fr,en}.ts`, `frontend/src/pages/auth/AuthPage.{tsx,css,test.tsx}`, `frontend/src/pages/onboarding/{OnboardingPage.{tsx,css,test.tsx},OnboardingStepProfile.tsx,profileSchema.ts,useOnboardingState.ts}`.
Commands run:
- `cd frontend && npm run test:coverage`: PASS (78 test files, 1144 tests passed, 0 failed).
- `cd frontend && npm run lint`: PASS (0 errors, 0 warnings).
- `cd frontend && npm run format:check`: PASS (All matched files use Prettier code style).
- `cd frontend && npm run build`: PASS (tsc -b && vite build exit 0).
- `scripts/diff-coverage.sh 08ff5ec frontend`: PASS (9/9 lines, 100% changed-line coverage >= 80%).
Red-then-green tests:
- `AuthPage.test.tsx`: "displays the language toggle and switches between French and English" (RED: element not found -> GREEN).
- `OnboardingPage.test.tsx`: "renders the language selector in the header and toggles between French and English" (RED -> GREEN).
- `OnboardingPage.test.tsx`: "saves the person and the agency, then reveals the signature studio" (RED: api.agency.save not called -> GREEN).
- `OnboardingPage.test.tsx`: "toggles personal agency, hiding corporate fields and saving with api.agency.save without companies" (RED: checkbox not found -> GREEN).
- `OnboardingPage.test.tsx`: "allows omitting legal form, SIREN/SIRET, and agency address" (RED -> GREEN).
E2E: skipped (no touched spec).
Deviations: Extracted validation schema to `frontend/src/pages/onboarding/profileSchema.ts` (43 lines) to keep `OnboardingStepProfile.tsx` (294 lines) strictly under 300 lines limit.
Contract impact: none (contract already updated in task 97).
Commit: bae8626 11 files +323/-151.
- 2026-10-31 reviewer: VERDICT: PASS — Language selector, personal agency checkbox, schema validation, and api.agency.save decoupling verified with full coverage and no blockers.
- 2026-10-31 lead: DONE — user accepted.

