# NOTE-FRAIS-SIGNATURE-CADRE

Status: USER_REVIEW
Branch: fix/note-frais-signature-cadre
Size: M
Round: 1/2

## Goal

Enlarge the note de frais signature frame so a configured `ENTREPRISE_CEO` signature fits unclipped. Out of scope: quittance template, signature upload/API, contract, DB, unreferenced samples.

## Files

Context (read only): `backend/src/main/resources/templates/defaut/note-frais.html` (`.cadre`, `.signature`, `{{signature}}`), `backend/src/main/java/fr/hkof/homeofficeexpenses/service/template/TemplateService.java` (`checkSecurity`), `backend/src/main/java/fr/hkof/homeofficeexpenses/service/PdfService.java`
Writable: `backend/src/main/resources/templates/defaut/note-frais.html` (+ focused test only if needed)
Affected tests: `backend/src/test/java/fr/hkof/homeofficeexpenses/service/template/BundledTemplateSignatureTest.java`, `TemplateServiceValidationTest.java`; `codegraph affected` → none (resource template)

## Constraints

Contract: none · sandbox: only `src="{{signature}}"`, logic-less Mustache · no commit/push/reset/clean/stash.

## Acceptance

- [x] `.cadre` 240x100 → at least 300x170 px; label + image fit inside `border-box`, including a tall/synthetic signature.
- [x] Image capped to the frame (no overflow into `pied`); wide signatures stay readable.
- [x] Note de frais PDF one page for demo data, no blank page; French label unchanged.
- [x] `cd backend && ./mvnw -B test` green, then full E2E suite green with counts.

## Commands

- backend: `cd backend && ./mvnw -B test` · focused: `./mvnw -B test -Dtest='BundledTemplateSignatureTest,TemplateServiceValidationTest'`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

- `2026-10-23 lead:` branch `fix/note-frais-signature-cadre` created from `main` (clean); Size M — built-in template, mandatory review.
- `2026-10-23 builder:` changed `backend/src/main/resources/templates/defaut/note-frais.html` (`.cadre` 320x180 px, `.cadre img` max-width 100% / max-height 140px / height auto) and `BundledTemplateSignatureTest.java` (+2 tests, image-placement collector).
- RED `./mvnw -B test -Dtest=BundledTemplateSignatureTest`: 2 failures — `.cadre` width 240 (<300), tall signature spilled to a second page. GREEN same command: 4/4.
- Visual: demo data + synthetic 760x200 "ENTREPRISE_CEO" and 220x820 portrait PNG through `PdfService` → 1 page each, no blank page; image 226.5x59.6 pt / 28.2x105.0 pt inside 226.5x121.5 pt content box, aspect preserved, footer clear; rasterized and inspected.
- G1 PASS `cd backend && ./mvnw -B test`: 127 tests, 0 failures, 0 errors, 2 skipped, BUILD SUCCESS.
- G2 PASS `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`: exit 0, 5 specs / 21 tests passing (39 s); teardown `down -v --remove-orphans` exit 0.
- `codegraph affected` → `BundledTemplateSignatureTest` only; `codegraph sync` run. Contract: none. Deviations: none. Sandbox unchanged (`src="{{signature}}"` only).
- `2026-10-23 lead:` reviewer returned `VERDICT: PASS` (round 1) — frame + image cap contain wide and tall signatures, new tests fail on pre-fix CSS and measure real PDF placement, backend 127 tests (2 pre-existing skips) and E2E 5 specs / 21 tests complete; reviewer is read-only and did not edit this file, so lead recorded the verdict and set `USER_REVIEW`.
