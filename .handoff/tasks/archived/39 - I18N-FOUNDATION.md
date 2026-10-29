# 39
Status: DONE
Branch: feat/39-i18n-foundation
Base: 14628b1
Size: L
Round: 1/2
## Goal
Add react-i18next FR/EN, a persisted top-right language selector, and translate the app shell, navigation and shared UI defaults. Out of scope: feature pages, backend/API messages, PDFs/templates, date/amount formats, E2E text rewrites.
User (2026-10-27): resume; fix the duplicate `data-cy` E2E blocker, commit and complete all gates.
## Files
Read: frontend/src/main.tsx · frontend/src/test/setup.ts · frontend/src/components/layout/{AppShell,AppNav}.tsx · frontend/src/components/ui/*.tsx · frontend/cypress/support/e2e.ts · frontend/vite.config.ts
Write: frontend/package.json · frontend/package-lock.json · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts,i18n.test.ts} (new) · frontend/src/components/layout/LanguageSelector.{tsx,css,test.tsx} (new) · frontend/src/components/layout/{AppShell,AppNav}.{tsx,test.tsx} · frontend/src/components/layout/AppShell.css · frontend/src/components/ui/{States.tsx,States.test.tsx,ConfirmDialog.tsx,FormModal.tsx,ToastHost.tsx,AiBadge.tsx,AmountConfirmButton.tsx} · frontend/src/main.tsx · frontend/src/test/setup.ts · frontend/cypress/support/e2e.ts
Affected tests: frontend/src/components/layout/{AppShell,AppNav,LanguageSelector}.test.tsx · frontend/src/components/ui/{States,AiBadge,AmountConfirmButton,ConfirmDialog,FormModal,ToastHost}.test.tsx · frontend/src/i18n/i18n.test.ts · frontend/src/router.test.tsx · full Vitest suite
Symbols: AppShell, AppNav SECTIONS/SideNavigation/MobileNavigation, LanguageSelector (new), States defaults, i18n (new)
## Constraints
Contract: none · money untouched · no any · domain terms stay French · amounts 1 234,56 € and dates DD/MM/YYYY unchanged · builder commits once, explicit paths
## Acceptance
- Fresh visit: navigator fr* → FR else EN, unsupported → FR; choice persisted/restored; <html lang> synced.
- Selector top-right in AppShell, labelled, keyboard accessible, data-cy="select-langue"; switch translates shell/nav/shared defaults instantly.
- Existing tests green; new tests cover detection, persistence, selector, EN shell; Cypress seeds FR so the 59 French assertions stay green.
- E2E selectors stay unique: `[data-cy="tab-historique"]` and `[data-cy="tab-configuration"]` each match exactly one element.
## Commands
- cd frontend && npm install i18next react-i18next i18next-browser-languagedetector (pin latest stable)
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 14628b1 frontend (>= 80% changed lines, real counts)
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans
- E2E blocker: if Docker unavailable, set BLOCKED with the failing evidence.
## Evidence (lead, 2026-10-27)
- builder returned with the handoff still TODO: 29 files modified/untracked, nothing committed (HEAD 14628b1).
- E2E (builder's background run, `/tmp/task39-e2e.log`): `E2E_EXIT=4`; 3/6 specs failed, 22/26 tests passing, 4 failing.
- Cause: `AppNav.tsx` adds `data-cy` to MobileNavigation links; SideNavigation and MobileNavigation are both mounted, so `[data-cy="tab-historique"]` / `[data-cy="tab-configuration"]` match 2 elements (01:97, 03:89, 05:269).
- Unit gates: `frontend/coverage/clover.xml` and `frontend/dist` exist, but no PASS/FAIL counts were recorded; no commit, so no review.
- Uncommitted work is left in place (no reset/clean/stash). Resume with builder on this branch; the duplicate `data-cy` is the E2E blocker.
## Evidence (builder, resume)
Commit: 187a160 29 files +756/-64
- Fix: `data-cy` removed from MobileNavigation (desktop SideNavigation keeps it); no spec weakened.
- Red-then-green: AppNav "keeps every data-cy selector unique when both navigations are mounted": FAIL 2 matches -> PASS 1 match.
- Existing red: 3 specs (01/03/05, 4 tests) failed on `cy.click() ... 2 elements` -> now green.
- PASS affected regression tests: 49 files / 494 tests
- PASS cd frontend && npm run test:coverage — 63 files, 669 tests, exit 0
- PASS cd frontend && npm run lint — exit 0
- PASS cd frontend && npm run format:check — exit 0
- PASS cd frontend && npm run build — exit 0
- PASS scripts/diff-coverage.sh 14628b1 frontend — 94% (37 changed lines, 2 missing), exit 0
- PASS codegraph sync — 5 files, exit 0
- PASS E2E `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress` — exit 0, 6/6 specs, 26/26 tests, 0 retries
- PASS same command `down -v --remove-orphans` — exit 0
Contract: none. Deviations: none.
## Review
reviewer: PASS (round 1/2) — diff `14628b1..187a160`, 29 files, +756/−64; no blocker.
lead: DONE — user accepted
