# 103 - FRONTEND-AGENCY-LANDLORD-AND-TENANT-SEPARATION

Status: DONE
Branch: feat/103-frontend-agency-landlord-and-tenant-separation
Base: 1bec1e7
Size: L
Round: 0/2

## Goal

Split the Real Estate Agency "Personnes" tab into "Bailleurs" and "Locataires" tabs in `/settings/agency`, wire `api.landlords`/`api.tenants`, filter lease party selectors by kind, and make agency onboarding create landlords/tenants with the right kinds. Out of scope: backend/contract changes (102) and the company wizard (104).

## Files

Context (read only): `frontend/src/components/settings/{PersonForm.tsx,PersonSignatureSection.tsx,SettingsSection.tsx,SettingsListSortHeader.tsx,LeaseForm.css}`.
Writable: `frontend/src/api/schema.ts` (only via `npm run gen:api`), `frontend/src/api/{endpoints.ts,queries.ts}`, `frontend/src/pages/settings/{LmnpPage.tsx,LmnpPage.test.tsx}`, `frontend/src/components/settings/{LandlordsSection.tsx,LandlordsSection.css,LandlordForm.tsx,TenantsSection.tsx,TenantsSection.css,TenantForm.tsx,LeaseForm.tsx,LeaseSection.tsx,useRentReceiptSettings.ts,LandlordsSection.test.tsx,TenantsSection.test.tsx,LeaseForm.test.tsx,LeaseSection.test.tsx,PersonnesSection.tsx,PersonnesSection.test.tsx}`, `frontend/src/pages/onboarding/{OnboardingPage.tsx,OnboardingPage.test.tsx}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`, `frontend/cypress/e2e/00-settings.cy.ts`.
Affected tests: `LmnpPage.test.tsx`, `LandlordsSection.test.tsx`, `TenantsSection.test.tsx`, `LeaseForm.test.tsx`, `LeaseSection.test.tsx`, `OnboardingPage.test.tsx`.
Touched E2E: `00-settings`.

## Constraints

Contract: `openapi/openapi.yaml#/paths/~1api~1landlords` and `~1api~1tenants` (102, additive) · regenerate types with `cd frontend && npm run gen:api`, never hand-edit `schema.ts` · tabs `baux`, `bailleurs`, `locataires`, `agence` with `data-cy="tab-landlords"`/`tab-tenants`; remove `tab-persons` and update `00-settings.cy.ts` · landlords keep signatures/issuePlace; tenants expose email/addressNote · `LeaseForm` selects the landlord only from landlords and tenants only from tenants, never the mixed `/api/persons` list · onboarding creates tenants via `api.tenants.create` (102 makes `/api/persons` create a LANDLORD by default) and landlords via `api.landlords.create` · UI French + en; classes/CSS < 300 lines; commit once, no push.

## Acceptance

- [ ] `LmnpPage` shows 4 tabs ("Baux", "Bailleurs", "Locataires", "Agence") fully translated; `tab-persons` is gone from the UI and from `00-settings.cy.ts`.
- [ ] Landlords tab: list/search/sort/add/edit/delete with signatures; tenants tab: list/search/sort/add/edit/delete with email.
- [ ] Lease create/edit selects a landlord only from landlords and tenants only from tenants.
- [ ] Agency onboarding creates LANDLORD for landlords and TENANT for tenants; the profile person stays a landlord.
- [ ] Frontend gates + `make e2e 00-settings` green; changed-line coverage >= 80%; `07-onboarding` is covered by task 105.

## Commands

Run once, at the end:
- types: `cd frontend && npm run gen:api`
- frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- coverage: `scripts/diff-coverage.sh 1bec1e7 frontend` (>= 80% changed lines)
- e2e: `make e2e 00-settings` (stack is already up; run `make e2e-up` only if it is not)

## Evidence

(Append one line per event; never rewrite a previous line)

- Files: new `LandlordsSection.tsx/.css/.test.tsx`, `LandlordForm.tsx`, `TenantsSection.tsx/.css/.test.tsx`, `TenantForm.tsx`, `LeasePartyFields.tsx`, `pages/onboarding/onboardingPeople.ts`; deleted `PersonnesSection.tsx/.test.tsx`; modified `api/{endpoints,queries,schema}.ts`, `LmnpPage.tsx/.test.tsx`, `LeaseForm.tsx/.test.tsx`, `LeaseSection.tsx/.test.tsx`, `useRentReceiptSettings.ts`, `OnboardingPage.tsx/.test.tsx`, `i18n/{fr,en}.ts`, `cypress/e2e/00-settings.cy.ts`, `CompanyLeaseTab.tsx/.test.tsx` (deviation, see below).
- RED→GREEN: LmnpPage 4 tabs + separated landlord/tenant select options; LandlordsSection list/create+signature/update/delete/filter+sort; TenantsSection list/create/invalid-email/update/delete/filter+sort; OnboardingPage persons.create once + landlords.create/tenants.create twice with kinds.
- PASS `npm run gen:api` — schema.ts regenerated (LandlordDto/TenantDto, /api/landlords, /api/tenants), not hand-edited.
- PASS `npm run test:coverage` — 80 files / 1071 tests passed.
- PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build`.
- PASS `scripts/diff-coverage.sh 1bec1e7 frontend` — 155 changed lines, 23 missing, 85%.
- PASS `make e2e 00-settings` exit 0 — spec 00-settings.cy.ts, 8 passing / 0 failing. First attempt 7/8: stale toast assertion ("Personne … ajoutée.") fixed in the spec to "Bailleur … ajouté."; second run green. Stack left up.
- Contract: consumed generated `LandlordDto/LandlordRequest/TenantDto/TenantRequest` via `endpoints.ts`; no openapi change.
- Deviation: `CompanyLeaseTab.tsx` + test updated (not in writable list) because LeaseForm now requires `landlords`/`tenants` props; `LeasePartyFields.tsx` and `onboardingPeople.ts` extracted to keep components <300 lines; `LeaseSection.tsx` is 357 lines pre-existing (base 355, +3 prop lines).
- Commit: 8e9fbcf 28 files +2617/-793
- 2026-10-31 lead: VERDICT: PASS (reviewer, round 1)
- 2026-10-31 lead: DONE — user accepted
