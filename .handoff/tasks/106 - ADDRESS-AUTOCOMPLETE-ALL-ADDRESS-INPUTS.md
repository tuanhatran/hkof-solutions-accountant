# 106 - ADDRESS-AUTOCOMPLETE-ALL-ADDRESS-INPUTS
Status: DONE
Branch: feat/106-address-autocomplete-all-address-inputs
Base: 1da1d65
Size: M
Round: 1/2
## Goal
Use the existing `AddressAutocomplete` (`https://api-adresse.data.gouv.fr/search/?q={query}&limit=5`, 300 ms debounce) for every street-address input left in settings and onboarding, including the onboarding agency address (`agencyAddress`) found in review. Out of scope: `addressNote`/`issuePlace`, backend, contract.
## Files
Context (read only): `frontend/src/components/ui/AddressAutocomplete.tsx`, `frontend/src/components/ui/FieldGroup.tsx`, `frontend/src/lib/validation.ts`
Writable: `frontend/src/components/ui/AddressAutocomplete.tsx` (only if a fix is needed), `frontend/src/components/settings/{LandlordForm,TenantForm,PersonForm,LeaseForm}.tsx`, `frontend/src/pages/settings/{EmployeeForm,SettingsCompanySection,CompanyIdentityModal,AgencySection}.tsx`, `frontend/src/pages/onboarding/{OnboardingStepProfile,OnboardingCompanyStepLease,OnboardingCompanyStepEmployees}.tsx`
Writable tests: `frontend/src/components/settings/{LandlordsSection,TenantsSection,PersonForm,LeaseForm}.test.tsx`, `frontend/src/pages/settings/{CompanyLeaseTab,EmployeeSection,CompanyIdentityModal,AgencySection}.test.tsx`, `frontend/src/pages/onboarding/{OnboardingCompanySteps,OnboardingPage}.test.tsx`, `frontend/src/components/ui/AddressAutocomplete.test.tsx`
Symbols: `AddressAutocomplete`, `LandlordForm`, `LeaseForm`, `SettingsCompanySection`, `OnboardingCompanyStepEmployees`
Affected tests: `LandlordsSection.test.tsx`, `TenantsSection.test.tsx`, `PersonForm.test.tsx`, `LeaseForm.test.tsx`, `CompanyLeaseTab.test.tsx`, `EmployeeSection.test.tsx`, `CompanyIdentityModal.test.tsx`, `AgencySection.test.tsx`, `OnboardingCompanySteps.test.tsx`, `AddressAutocomplete.test.tsx`
Touched E2E: `00-settings`
## Constraints
Frontend only, contract none · keep every `data-cy` unchanged · use RHF `Controller` (add `control` to `SettingsCompanySection`) or the existing local state · freeform typing must still save · mock `fetch` in tests (no real personal data) · French UI, no `any`, files < 300 lines · do not commit `.handoff/`, `.codegraph/` or the pre-existing dirty `OnboardingCompanyWizard.tsx`.
## Acceptance
- [x] The 10 converted address inputs (including onboarding `agencyAddress`) expose `role="combobox"`, query the government API after 3 chars/300 ms, fill on selection and still accept freeform text; payloads, validation and `data-cy` unchanged; `addressNote`/`issuePlace` untouched; gates pass, coverage >= 80%, `make e2e 00-settings` green.

## Evidence
Converted 9 inputs: Landlord/Tenant/Person/Lease/Employee/SettingsCompanySection via RHF `Controller` (+`control` prop from CompanyIdentityModal), onboarding lease landlord via `Controller`, AgencySection + onboarding employee rows via local state. `AddressAutocomplete` now aborts on blur and never reopens after blur. `addressNote`/`issuePlace` untouched.
Tests (red→green): LandlordsSection 4F→10P, TenantsSection 4F→10P, PersonForm 4F→11P, LeaseForm 3F→4P, CompanyLeaseTab 1F→26P, EmployeeSection 1F→36P, CompanyIdentityModal 1F→9P, AgencySection 1F→4P, OnboardingCompanySteps 1F→9P, AddressAutocomplete 1F→11P (targeted `npx vitest run`).
PASS `npm run test:coverage`: 82 files, all pass, 95.09% lines.
PASS `npx eslint <23 changed files>`: 0 errors.
FAIL `npm run format:check`: only pre-existing dirty `OnboardingCompanyWizard.tsx` (user blank line); `git show HEAD:` version passes Prettier, my 23 files pass `npx prettier --check`.
PASS `npm run build`: tsc + vite, built in 1.42s.
PASS `scripts/diff-coverage.sh 1da1d65 frontend`: 14 changed lines, 0 missing, 100%.
PASS `make e2e-up`; PASS `make e2e 00-settings`: exit 0, 1 spec, 8/8 passing in 9s.
Deviations: added a default `fetch` stub in `frontend/src/test/setup.ts` (outside the writable test list) so no suite reaches the real address API; repo-wide format gate blocked by the user's unrelated edit (not touched or committed).
Contract impact: none. `.handoff/` and the dirty `OnboardingCompanyWizard.tsx` stay uncommitted.
Commit: ad0b585 23 files +676/-62
- 2026-10-31 lead: `VERDICT: BLOCKERS (1)` (reviewer, round 1) — `OnboardingStepProfile.tsx:251`: onboarding agency address (`agencyAddress`) still a plain input; fix in round 2.
## Round 1 fix
Blocker fixed: onboarding `agencyAddress` renders via `AddressAutocomplete` (same `id`, `data-cy`); duplicated RHF address controller extracted to `ProfileAddressField.tsx` so `OnboardingStepProfile.tsx` stays 291 lines (<300).
Test (red→green): new OnboardingPage test "suggests addresses for the onboarding agency address and fills it on selection" 1F (no role combobox) → 21P for the file.
PASS `npx vitest run OnboardingPage.test.tsx`: 21/21. PASS affected (6 files): 90/90.
PASS `npm run test:coverage`: 82 files, all pass, 95.09% lines. PASS `npm run lint`: 0 errors.
PASS `npx prettier --check` on the 3 changed files. FAIL `npm run format:check`: only the pre-existing dirty `OnboardingCompanyWizard.tsx` (not touched).
PASS `npm run build`: tsc + vite, built in 1.20s. PASS `scripts/diff-coverage.sh 1da1d65 frontend`: 16 changed lines, 0 missing, 100%.
PASS `make e2e 00-settings`: exit 0, 8/8 passing in 9s.
Deviation: new `ProfileAddressField.tsx` (outside original Writable list) is required by the 300-line limit; used by both person and agency address fields, behavior unchanged.
Contract impact: none. Commit: fbda0b0 3 files +100/-18
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 2) — onboarding agency address fixed; no remaining raw street-address inputs.
- 2026-10-31 lead: `USER_REVIEW` — only red gate is `npm run format:check` on the user's uncommitted `OnboardingCompanyWizard.tsx` blank line; the 26 task files pass Prettier.
- 2026-10-31 lead: DONE — user accepted (with the documented `format:check` deviation on the user-owned `OnboardingCompanyWizard.tsx`).
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 1da1d65 frontend` · `make e2e-up` once, then `make e2e 00-settings`
