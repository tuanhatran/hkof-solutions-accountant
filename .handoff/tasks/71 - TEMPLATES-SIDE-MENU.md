# 71 - TEMPLATES-SIDE-MENU
Status: USER_REVIEW
Branch: feat/71-templates-side-menu
Base: 3badace
Size: M
Round: 1/2
## Goal
Move rent-receipt and expense-statement template management out of the Company and LMNP settings tabs into a dedicated `Modèles` side-panel entry. Out of scope: template sandbox/validation logic, backend, contract.
## Files
Context (read only): `frontend/src/pages/templates/TemplatesCard.tsx`, `frontend/src/pages/templates/templateTypes.ts`, `frontend/src/components/layout/PageHeader.tsx`
Writable: `frontend/src/pages/templates/{TemplatesPage.tsx,TemplatesPage.css,TemplatesPage.test.tsx,TemplatesCard.test.tsx,TemplateCompare.test.tsx,templateTypes.ts}`, delete `TemplatesTab.tsx`/`.css` (rename its test to `TemplatesCard.test.tsx`), `frontend/src/pages/settings/{CompanySection.tsx,LmnpPage.tsx,LmnpPage.test.tsx,SettingsPage.test.tsx}`, `frontend/src/components/layout/AppNav.tsx`, `AppNav.test.tsx`, `frontend/src/router.tsx`, `router.test.tsx`, `frontend/src/i18n/{resources/fr.ts,resources/en.ts,i18n.test.ts}`, `frontend/cypress/e2e/04-admin-templates.cy.ts`
Affected tests: `AppShell`, `LlmBadge`, `useDraftBlock`, `GenerateExpenseStatementPage`, `LmnpPage`, `SettingsPage`, `TemplateCompare`, `TemplatesCard`, `router`
## Constraints
Contract: none. Route `/templates`; nav link `data-cy="tab-templates"` in Réglages before Société; page = PageHeader + both cards (Quittance then Note de frais) + one shared sandbox warning; remove `settings.{company,lmnp}.tabs.templates`, add `navigation.links.templates` and `templates.page.*`. UI French · no `any` · money untouched · builder commits once (explicit paths), nobody pushes.
## Acceptance
- [x] `Modèles` side and mobile nav entries reach `/templates`; Company and LMNP tabs no longer contain templates
- [x] `/templates` renders both dropzones and the warning; `TemplatesTab` and its i18n keys removed; updated unit tests green
- [x] `npm run test:coverage`, lint, format:check and build pass; changed-line coverage >= 80%; full E2E green
## Commands
`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`; `scripts/diff-coverage.sh 3badace frontend` (>= 80%); `make e2e-up` once, then `make e2e` (all specs green, none only on retry)

## Evidence
Changed: added `TemplatesPage.tsx/.css/.test.tsx`, `TEMPLATE_CONFIGURATIONS`, `/templates` route + `Modèles` nav link; renamed `TemplatesTab.test.tsx`→`TemplatesCard.test.tsx` (renders card), switched `TemplateCompare.test.tsx`, deleted `TemplatesTab.tsx/.css`, removed settings tabs from Company/LMNP + their tests, updated `i18n` fr/en/test, `AppNav/AppShell/router` tests, Cypress `04-admin-templates.cy.ts`.
PASS `npx vitest run <12 affected files>`: 12 files / 194 tests.
PASS `npm run test:coverage`: exit 0, 68 files / 925 tests.
PASS `npm run lint`: exit 0.
PASS `npm run format:check`: exit 0.
PASS `npm run build`: exit 0.
PASS `scripts/diff-coverage.sh 3badace frontend`: 100% changed lines (4/4).
PASS `make e2e-up`: exit 0; `make e2e`: exit 0, 6 specs / 29 tests, 0 failing, no retry-only pass. Stack left running.
Red→green: `TemplatesPage.test.tsx` module-not-found (1 file failed) → 2/2 green; `AppNav|AppShell|router` 9/20 failed → 20/20; `SettingsPage|LmnpPage|i18n` 3/56 failed → 56/56; `TemplatesCard|TemplateCompare|TemplatesPage` 45/45 green after card rename.
Deviations: `AppShell.test.tsx` (not in Writable, listed in Affected) updated for the new nav entry/order. Contract: none.
Commit: 2b54bed 21 files +263/-271
2026-10-29 lead: `VERDICT: PASS` (reviewer, round 1)
