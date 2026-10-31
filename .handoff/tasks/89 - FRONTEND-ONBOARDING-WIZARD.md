# 89 - FRONTEND-ONBOARDING-WIZARD

Status: DONE
Branch: feat/89-frontend-onboarding-wizard
Base: 03aa63e
Size: L
Round: 2/2

## Goal

Add the `/bienvenue` wizard (profile/agency/signature, property/landlord, lease/tenants, summary), the router guard redirecting authenticated users with `onboardingCompleted === false`, and the profile fields task 87 omitted (`person.phone`/`address_note`, `company.siret`) across contract, DTOs and mappers. Out of scope: studio internals (88), the new E2E spec (90), money.

## Files

Context (read only): `frontend/src/router.tsx`, `frontend/src/api/{queries.ts,endpoints.ts,schema.ts,types.ts}`, `frontend/src/components/settings/SignatureStudio.tsx`, `frontend/src/pages/settings/PersonForm.tsx`, `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/{PersonService.java,CompanyService.java},web/PersonController.java}`.
Writable contract: `openapi/openapi.yaml`; `frontend/src/api/schema.ts` (regenerate with `npm run gen:api`, never hand-edit).
Writable backend: `backend/src/main/java/fr/hkof/homeofficeexpenses/web/dto/{RentConfigurationDtos.java,CompanyDtos.java}`, `backend/src/main/java/fr/hkof/homeofficeexpenses/service/{PersonService.java,CompanyService.java}`; tests `backend/src/test/java/fr/hkof/homeofficeexpenses/service/{PersonServiceTest.java,CompanyServiceTest.java}`.
Writable frontend: `frontend/src/pages/onboarding/{OnboardingPage.tsx,OnboardingPage.css,OnboardingStepProfile.tsx,OnboardingStepProperty.tsx,OnboardingStepLease.tsx,OnboardingStepSummary.tsx,useOnboardingState.ts}`; `frontend/src/router.tsx`; `frontend/src/api/{queries.ts,endpoints.ts}`; `frontend/src/i18n/resources/{fr.ts,en.ts}`; `frontend/src/components/settings/{PersonForm.tsx,PersonForm.test.tsx}`; `frontend/src/pages/settings/{CompanyIdentityModal.tsx,useCompanyForm.ts,useCompanyForm.test.tsx}`; `frontend/cypress/e2e/{06-auth.cy.ts,00-settings.cy.ts}` (registration lands on `/bienvenue`; settings hooks only if needed).
Writable tests: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`, `frontend/src/router.test.tsx`.
Affected tests: `frontend/src/router.test.tsx`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/{AuthIntegrationTest.java,CompanyLeaseIntegrationTest.java}`.
Touched E2E: `00-settings` (round 2 fix targets the settings forms; 06-auth was green at e4b461d)

## Constraints

Stacked on task 88 head `03aa63e` · contract first: add `phone`/`addressNote` to `PersonRequest`/`PersonDto` and `siret` to `CompanyRequest`/`CompanyDto`, then `npm run gen:api` · `Person` has a single `name` field (compose "Prénom Nom"; add no column) · landlord email comes from `auth.me().email` (no `person.email` column; do not add one) · create or update the user's first active company for the agency SIREN/SIRET, never duplicate it · UI French in `fr.ts` + `en.ts` · no `any` · stepper `aria-current="step"` + French `aria-label` · inline validation `aria-describedby` · SIREN 9 or SIRET 14 digits (reject 10-13) · phone format · guard order: forced password change wins, auth routes and `/bienvenue` stay reachable, completed users never bounce back; seeded accounts are already complete (87) · signature studio operates on the person saved in Step 1 · finalize creates person/company/address/lease with `tenantIds`, calls `POST /api/auth/onboarding-complete`, invalidates `auth.me`, then goes to `/generer/quittance` · no client-side authoritative amount · components and CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [ ] An incomplete user on any protected page reaches `/bienvenue`; `/bienvenue` and auth pages do not loop.
- [ ] Back/next keeps form state across the steps.
- [ ] Step 1 validates names, phone and SIREN/SIRET, saves phone/addressNote/SIRET, and creates a signature with the studio.
- [ ] Step 2 captures the rented address and pre-fills the landlord from Step 1 (account email shown/validated).
- [ ] Step 3 supports "Bail individuel" and "Bail de colocation solidaire" with 2+ tenants.
- [ ] Finalize persists everything, marks onboarding complete and redirects to `/generer/quittance`.
- [ ] Backend + frontend gates pass, coverage >= 80%, `make e2e 06-auth` green.
- [ ] (round 2) Editing a saved person or company from settings must not erase `phone`/`addressNote`/`siret`; the settings forms expose and round-trip these fields.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 03aa63e all` · `make e2e-up` if the stack is gone, then `make e2e 00-settings` (round 2 fix).

## Evidence

Files: `openapi/openapi.yaml`; `backend/.../web/dto/{CompanyDtos,RentConfigurationDtos}.java`, `service/{CompanyService,PersonService}.java`, tests `{CompanyServiceTest,PersonServiceTest}.java`; `frontend/src/pages/onboarding/*` (7 sources + CSS + test), `frontend/src/{router.tsx,router.test.tsx}`, `frontend/src/api/{endpoints.ts,queries.ts,schema.ts}`, `frontend/src/i18n/resources/{fr,en}.ts`, `frontend/cypress/e2e/06-auth.cy.ts`.
- Red→green `PersonServiceTest.profileFields` (missing `phone()`/`addressNote()` + 5-arg request) and `CompanyServiceTest.exposesSiret` (missing `siret()` + 8-arg request); targeted `-Dtest=PersonServiceTest,CompanyServiceTest` green.
- Red→green `OnboardingPage.test.tsx` 6 tests (header/stepper, profile+studio, agency update no duplicate, invalid phone/SIREN 10-13, back keeps state, colocation finalize) and 3 new `router.test.tsx` guard tests (16 in file).
- PASS `cd backend && ./mvnw -B verify` — Tests 660, Failures 0, Errors 0, Skipped 1, BUILD SUCCESS (first run: one transient Testcontainers JDBC refusal; single rerun then full rerun green).
- PASS `cd frontend && npm run gen:api && npm run test:coverage` — 76 files, 1021 tests.
- PASS `npm run lint` · PASS `npm run format:check` · PASS `npm run build` (first build red: `@apply card` unknown utility; replaced with the card utilities, rebuild green).
- PASS `scripts/diff-coverage.sh 03aa63e all` — backend 15 lines / 2 missing / 86%; frontend 165 / 19 / 88%.
- PASS `make e2e 06-auth` — exit 0, `06-auth.cy.ts` 5/5 passing, 0 failing; stack left up.
- Contract: `#/components/schemas/PersonRequest/properties/{phone,addressNote}`, `PersonDto/.../{phone,addressNote}`, `CompanyRequest/properties/siret`, `CompanyDto/properties/siret`; `schema.ts` regenerated only.
- Deviations: none functional. `CompleteOnboarding` reuses the existing `/api/auth/onboarding-complete`; `CompanyDto.siret` added with a 10-arg delegating constructor to keep `TemplateDataServiceTest` source-compatible.
- Commit: e4b461d 23 files +2138/-5
- 2026-10-31 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1) — `PersonService.java:98` and `CompanyService.java:273` overwrite `phone`/`addressNote`/`siret` with null on update, while the existing settings forms (`PersonForm.tsx`, `useCompanyForm.ts`) send neither field: editing a saved person/company silently erases onboarding data. Round 2: preserve omitted values, expose the fields in the settings forms, add red-first tests, re-run all gates + `make e2e 00-settings`.
- Round 2 files: new `service/OptionalTexts.java` (shared `trimToNull`/`preserve`), `service/{PersonService,CompanyService}.java`, tests `{PersonServiceTest,CompanyServiceTest}.java`; `components/settings/PersonForm.tsx` + test, `pages/settings/{SettingsCompanySection.tsx,settingsValues.ts,useCompanyForm.ts,useCompanyForm.test.tsx,CompanyIdentityModal.test.tsx,SettingsPage.test.tsx}`; `lib/validation.ts`, `i18n/resources/{fr,en}.ts`, `PersonnesSection.test.tsx`.
- Red→green `PersonServiceTest.preservesOmittedProfileFieldsOnUpdate` (omitted keeps, `""` clears, value overwrites): red `expected: "06 12 34 56 78" but was: null`; `CompanyServiceTest.preservesOmittedSiretOnUpdate`: red `expected: "123 456 789 00012" but was: null`; targeted 28/28 green (`BUILD SUCCESS`).
- Red→green `PersonForm.test.tsx` (10, phone/address-note round-trip), `CompanyIdentityModal.test.tsx` (8, SIRET round-trip), `useCompanyForm.test.tsx` (6): red 11 failed / 13 passed in the 3 files; green 24/24.
- PASS `cd backend && ./mvnw -B verify` — Tests 662, Failures 0, Errors 0, Skipped 1, BUILD SUCCESS.
- PASS `cd frontend && npm run test:coverage` — 76 files, 1023 tests, 0 failed; PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build`.
- PASS `scripts/diff-coverage.sh 03aa63e all` — backend 23 lines / 2 missing / 91%; frontend 165 / 19 / 88%; services and `OptionalTexts` at 100% (round-2 frontend lines are object/JSX lines with no statement coverage entry).
- PASS `make e2e 00-settings` — exit 0, `00-settings.cy.ts` 7/7 passing, 0 failing; stack left up.
- Contract: none (`PersonRequest`/`CompanyRequest` untouched, `schema.ts` unchanged). No client-side amount.
- Deviations: `SettingsCompanySection.tsx` hosts the modal fields and was edited; `lib/validation.ts`, `settingsValues.ts` and the exact request-body expectations in `PersonnesSection.test.tsx`/`SettingsPage.test.tsx` were added beyond the handoff writable list (new form keys); `validation.ts` was already 441 lines and is now 444 (schema module, not a class).
- Commit: 6a61fcd 17 files +224/-17
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 2) — null-preserves/blank-clears/overwrite proven red-first on both services, settings forms round-trip the fields, no regression; `make e2e 00-settings` 7/7.
- 2026-10-31 lead: DONE — user accepted
