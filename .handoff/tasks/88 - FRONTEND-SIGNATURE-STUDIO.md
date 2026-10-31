# 88 - FRONTEND-SIGNATURE-STUDIO

Status: DONE
Branch: feat/88-frontend-signature-studio
Base: 11bf9d0
Size: M
Round: 1/2

## Goal

Build a reusable Signature Studio (upload, canvas drawing modal, cursive font generator, rename/delete list) and mount it in `PersonSignatureSection`. Out of scope: onboarding wizard and router guard (89); backend and contract (87).

## Files

Context (read only): `frontend/src/components/settings/{PersonSignatureSection.tsx,SignatureImageField.tsx,signatureUpload.ts}`, `frontend/src/components/ui/{Dialog.tsx,FormModal.tsx,ConfirmDialog.tsx,Button.tsx}`, `frontend/src/api/{endpoints.ts,schema.ts,types.ts}`, `frontend/src/i18n/resources/{fr.ts,en.ts}`.
Writable frontend: `frontend/src/components/settings/{SignatureStudio.tsx,SignatureStudio.css,SignaturePadModal.tsx,SignaturePadModal.css,SignatureFontGenerator.tsx,SignatureFontGenerator.css,SignatureRenameModal.tsx,PersonSignatureSection.tsx}`; `frontend/src/api/endpoints.ts`; `frontend/src/i18n/resources/{fr.ts,en.ts}`; `frontend/cypress/e2e/00-settings.cy.ts` (only selectors/flows forced by the new markup).
Writable tests: `frontend/src/components/settings/{SignatureStudio.test.tsx,SignaturePadModal.test.tsx,SignatureFontGenerator.test.tsx,PersonSignatureSection.test.tsx}`, `frontend/src/api/endpoints.test.ts`.
Affected tests: `frontend/src/components/settings/PersonSignatureSection.test.tsx`.
Touched E2E: `00-settings`

## Constraints

Stacked on task 87 head `11bf9d0` (`api.signatures.rename` + regenerated schema available) · UI French in `fr.ts` and `en.ts` · no `any` · canvas uses pointer events with `devicePixelRatio` scaling, exports a trimmed transparent PNG, and rejects a blank canvas with a French inline error · 3 cursive styles (Caveat, Dancing Script, Alex Brush) awaited with `document.fonts` before export and degrading to a local cursive fallback instead of throwing · reuse `FormModal` and `ConfirmDialog` · keep existing `PersonSignatureSection` behaviour and hooks · components and CSS < 300 lines · builder commits once, nobody pushes.

## Acceptance

- [x] Upload PNG/JPEG with validation; draw, clear and confirm a signature; a blank canvas shows a French error and saves nothing.
- [x] Preview the 3 cursive styles and export the chosen one as a transparent PNG.
- [x] Rename and delete existing signatures (delete asks for confirmation).
- [x] `PersonSignatureSection` hosts the studio without breaking current settings tests.
- [x] Frontend gates pass, coverage >= 80%, `make e2e 00-settings` green.

## Commands

`cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 11bf9d0 frontend` · `make e2e-up` once, then `make e2e 00-settings`.

## Evidence

Files: `SignatureStudio.tsx/.css`, `SignaturePadModal.tsx/.css`, `SignatureFontGenerator.tsx/.css`, `SignatureRenameModal.tsx`, `PersonSignatureSection.tsx/.css`, `api/endpoints.ts`, `i18n/fr.ts`, `en.ts` + 5 test files (17 files total).
RED→GREEN: endpoints rename 25/25; pad modal (module absent → 7/7); font generator (→ 5/5); studio (→ 7/7); person section 15/15.
PASS `npm run test:coverage` — 75 files, 1012 tests.
PASS `npm run lint`; PASS `npm run format:check`; PASS `npm run build`.
PASS `scripts/diff-coverage.sh 11bf9d0 frontend` — 94% (221 changed lines, 13 missing).
PASS `make e2e 00-settings` — exit 0, spec 00-settings.cy.ts, 7/7 passing.
Contract: none (consumes existing `PATCH /api/signatures/{id}` + `RenameSignatureRequest`; schema.ts untouched).
Deviation: the 3 cursive families are loaded by a Google Fonts `<link>` injected in `SignatureFontGenerator` (same source as `index.html`); offline or blocked network keeps the local cursive fallback. `index.html` untouched.
Commit: 03aa63e 17 files +1624/-137
- 2026-10-31 lead: `VERDICT: PASS` (reviewer, round 1) — rename PATCH, blank-canvas guard, export trimming, hooks, sizes and gate evidence verified.
- 2026-10-31 lead: DONE — user accepted
