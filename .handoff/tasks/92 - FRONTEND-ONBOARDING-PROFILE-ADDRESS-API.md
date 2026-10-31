# 92 - FRONTEND-ONBOARDING-PROFILE-ADDRESS-API

Status: DONE
Branch: feat/92-frontend-onboarding-profile-address-api
Base: 5d8f00a
Size: M
Round: 0/2

## Goal

Update Onboarding Step 1 ("Profil de l'agence"): rename sections to "Gérant" and "Agence", add country code selection to the phone input, integrate French government address autocomplete (`api-adresse.data.gouv.fr`), rename agency name to "Nom" and make only agency name required (other agency fields optional), with full i18n in French and English. Out of scope: property and lease steps (93), dashboard page (94), backend contract.

## Files

Context (read only): `frontend/src/pages/onboarding/{OnboardingPage.tsx,useOnboardingState.ts,OnboardingStepProfile.tsx}`, `frontend/src/components/settings/SignatureStudio.tsx`.
Writable frontend: `frontend/src/components/ui/AddressAutocomplete.tsx`, `frontend/src/components/ui/CountryCodeSelect.tsx`, `frontend/src/pages/onboarding/OnboardingStepProfile.tsx`, `frontend/src/pages/onboarding/useOnboardingState.ts`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Writable tests: `frontend/src/components/ui/AddressAutocomplete.test.tsx`, `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Symbols: `AddressAutocomplete`, `CountryCodeSelect`, `OnboardingStepProfile`, `profileSchema`.
Affected tests: `frontend/src/pages/onboarding/OnboardingPage.test.tsx`.
Touched E2E: `none`

## Constraints

Frontend only; backend contract untouched · use the free official French address API (`https://api-adresse.data.gouv.fr/search/?q={query}&limit=5`) with debounced input (300ms), accessible combobox semantics (`role="combobox"`, `aria-autocomplete="list"`), and freeform typing fallback · phone input supports international country dial codes (`+33` France default, `+32`, `+41`, `+34`, `+44`, `+1`) · only agency "Nom" is required; `legalForm`, `sirenSiret`, and `agencyAddress` are optional; if `sirenSiret` is provided, validate 9 or 14 digits · step title: "Profil de l'agence", manager subtitle: "Gérant", agency subtitle: "Agence", field label: "Nom" · all text fully translated via `i18n` in `fr.ts` and `en.ts` · production classes and component CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] Onboarding Step 1 title displays "Profil de l'agence" (FR) / "Agency profile" (EN).
- [x] Manager section is titled "Gérant" (FR) / "Manager" (EN); phone input provides an interactive country code selector.
- [x] Typing in the postal address field suggests real addresses via `api-adresse.data.gouv.fr`; selecting a suggestion fills the input.
- [x] Agency section is titled "Agence" (FR) / "Agency" (EN); field label is "Nom" (FR) / "Name" (EN).
- [x] Only the agency "Nom" is required to proceed; omitting legal form, SIREN/SIRET, or agency address is accepted.
- [x] Unit and component tests pass, frontend gates pass, changed-line coverage >= 80%.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 5d8f00a frontend` · E2E: skipped (no touched spec).

## Evidence

- Files changed: `frontend/src/components/ui/{AddressAutocomplete.tsx,AddressAutocomplete.test.tsx,CountryCodeSelect.tsx}`, `frontend/src/pages/onboarding/{OnboardingStepProfile.tsx,useOnboardingState.ts,OnboardingPage.test.tsx}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`
- Lines check: `AddressAutocomplete.tsx` 249 l, `CountryCodeSelect.tsx` 64 l, `OnboardingStepProfile.tsx` 298 l, `useOnboardingState.ts` 188 l (< 300 lines)
- Red/Green `AddressAutocomplete.test.tsx`: RED (failed import) -> GREEN (10 tests passed)
- Red/Green `OnboardingPage.test.tsx`: RED (8 failed) -> GREEN (9 passed)
- PASS `cd frontend && npm run format:check` (0 issues)
- PASS `cd frontend && npm run lint` (0 errors, 0 warnings)
- PASS `cd frontend && npm run build` (built in 1.28s)
- PASS `cd frontend && npm run test:coverage` (77 files, 804 passed, 0 failed)
- PASS `scripts/diff-coverage.sh 5d8f00a frontend` (93% >= 80% threshold; 106 changed lines, 7 missing)
- E2E: skipped (no touched spec)
- Deviations: none
- Contract impact: none (backend contract untouched)
- Commit: 4bfca07 8 files +765/-42
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — Address autocomplete, country code select, optional agency fields and full i18n cleanly verified.
- 2026-10-31 lead: DONE — user accepted.
