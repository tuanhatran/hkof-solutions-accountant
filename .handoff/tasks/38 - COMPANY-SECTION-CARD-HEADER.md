# 38 - COMPANY-SECTION-CARD-HEADER
Status: REVIEW
Branch: feat/38-company-section-card-header
Base: 895b87f
Size: M
Round: 0/2
## Goal
LMNP-like layout: a toolbar with the company selector, then "Nouvelle société", then "Supprimer" (in that order), above the four tabs, then `section.card.company-section` holding the tab panel; tab content sections keep their `SectionHeader` titles/actions but lose the outer `card` chrome. Out of scope: backend, `openapi/openapi.yaml`, money, LMNP page behavior, `data-cy` renames, unrelated refactors.
## Files
Context: `frontend/src/pages/settings/SettingsPage.tsx`, `frontend/src/components/settings/SettingsSection.tsx` (`SectionHeader`), `frontend/src/components/ui/ViewTabs.tsx`, `frontend/src/index.css` (`.card`, `.card-header`, `.card-body`, `.field`).
Writable: `frontend/src/pages/settings/{CompanySection.tsx,CompanySection.css,CompanyIdentityView.tsx,EmployeeSection.tsx,CompanyLeaseTab.tsx,CompanyLeaseTab.css,ExpenseItemsManager.tsx,ExpenseItemsManager.css}`, `frontend/src/pages/templates/{TemplatesCard.tsx,TemplatesTab.tsx}`.
Affected tests: `frontend/src/pages/settings/{SettingsPage,CompanyIdentityView,EmployeeSection,CompanyLeaseTab,ExpenseItemsManager,LmnpPage}.test.tsx`, `frontend/src/pages/templates/TemplatesTab.test.tsx`.
## Constraints
Contract: none · Money: none · UI French · no `any` · keep every `data-cy` · keep the 4 tabs and their labels/order · `TemplatesCard` keeps its default card on LMNP, embedded mode only in `CompanySection` · builder commits once (explicit paths), nobody pushes · component CSS < 300 lines.
## Acceptance
- [ ] `.company-section-toolbar` contains `data-cy="select-societe"` (with `aria-label="Société à configurer"`), then "Nouvelle société", then "Supprimer"; the toolbar precedes the tablist, and the tablist precedes `section.card.company-section`.
- [ ] `role="tabpanel".company-section-tabpanel` is a descendant of `section.card.company-section`.
- [ ] `CompanyIdentityView`, `EmployeeSection`, `CompanyLeaseTab` and the embedded `TemplatesCard` no longer render a `card` wrapper; their `SectionHeader` and actions stay.
- [ ] LMNP `TemplatesTab` still renders `section.card.templates-card`; frontend gates, changed-line coverage >= 80% and one full E2E run pass.
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`; `scripts/diff-coverage.sh 895b87f frontend`; full E2E via docker compose (`up --build --abort-on-container-exit --exit-code-from cypress`, then `down -v --remove-orphans`).
## Evidence
2026-10-27 builder (first iteration): 9 files; targeted `SettingsPage.test.tsx` 22 tests PASS; affected 11 files/123 tests PASS; `npm run lint` PASS; `npm run format:check` PASS; `npm run build` PASS (2384 modules); full coverage/diff-coverage/E2E not run; no commit; Status TODO, awaiting user review.
2026-10-27 builder (second iteration, user layout request): LMNP order implemented; targeted `SettingsPage.test.tsx` 22 tests PASS; affected 11 files/123 tests PASS; `npm run lint` PASS; `npm run format:check` PASS; `npm run build` PASS (2384 modules); full coverage/diff-coverage/E2E not run; no commit; awaiting user review.
2026-10-27 builder: red → `selector.closest(".company-section-toolbar")` null; `card` still on `company-lease-tab-leases` and `templates-card`.
2026-10-27 builder: PASS `npm run test:coverage` — 61 files / 649 tests; statements 97.02%, branches 90.04%, functions 94.74%, lines 97.14%.
2026-10-27 builder: PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build` (2384 modules).
2026-10-27 builder: changed-line coverage frontend 100% (6 lines) vs 895b87f.
2026-10-27 builder: E2E exit 0 — 6/6 specs, 26/26 tests; teardown `down -v --remove-orphans` exit 0.
2026-10-27 builder: `Commit: 7e7dde8 9 files +182/-124`
