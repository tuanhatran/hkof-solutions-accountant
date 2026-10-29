# 79 - REMOVE-PASSWORD-MIN-LENGTH

Status: DONE · Branch: quick/remove-password-min-length · Base: 65cf508 · Size: S · Round: 1/1

## Goal

Remove the 8-character minimum on account passwords (registration and password change) everywhere: contract, backend, frontend, copy. Keep the "not blank" rule and the 100-character maximum. Out of scope: login, BCrypt, sessions, CSRF, any other auth behaviour.

## Files

Writable: `openapi/openapi.yaml`, `frontend/src/api/schema.ts` (regenerated via `npm run gen:api`), `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/AuthService.java,web/dto/AuthDtos.java}`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AuthIntegrationTest.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/AuthServicePasswordTest.java`, `frontend/src/lib/{validation.ts,validation.test.ts}`, `frontend/src/i18n/resources/{fr,en}.ts`, `README.md`.

## Constraints

Contract: `RegisterRequest.password` and `ChangePasswordRequest.newPassword` drop `minLength: 8` (keep `maxLength: 100`); register description no longer mentions 8 characters. Backend error code `PASSWORD_TOO_SHORT` (only raised for > 100 now) is renamed `PASSWORD_TOO_LONG`; i18n key follows. Security-related diff: user-requested weakening, user accepted (keep not blank + max 100). No commit without explicit user instruction.

## Acceptance

- [x] Register and change password accept a 1-character password; blank and > 100 characters are still rejected (backend + frontend).
- [x] No user-facing copy mentions an 8-character minimum.
- [x] Gates: backend `verify`, frontend coverage/lint/format/build, diff coverage >= 80%, full E2E.

## Commands

`cd backend && ./mvnw -B verify` · `scripts/diff-coverage.sh 65cf508 all` · `cd frontend && npm run lint && npm run format && npm run test:coverage && npm run build` · `make e2e-up` once then `make e2e` (full suite, leave the stack up; `make e2e-down` only after acceptance).

## Evidence

Append one line per event; never rewrite a previous line.

- Files changed (11): `openapi/openapi.yaml`, `frontend/src/api/schema.ts`, `backend/src/main/java/fr/hkof/homeofficeexpenses/{service/AuthService.java,web/dto/AuthDtos.java}`, `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AuthIntegrationTest.java`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/AuthServicePasswordTest.java`, `frontend/src/lib/{validation.ts,validation.test.ts}`, `frontend/src/i18n/resources/{fr,en}.ts`, `README.md`.
- TDD frontend `frontend/src/lib/validation.test.ts`: RED (2 failing on 1-character passwords rejected with "Le mot de passe doit contenir au moins 8 caractères.") -> GREEN (34/34 passing after replacing min(8) with not-empty check + max 100).
- TDD backend `backend/src/test/java/fr/hkof/homeofficeexpenses/web/AuthIntegrationTest.java`: RED (Status expected 204/200, got 400 VALIDATION_FAILED on 1-character passwords) -> GREEN (8/8 passing in AuthIntegrationTest, 2/2 in AuthServicePasswordTest).
- PASS `frontend/src/api/schema.ts`: regenerated via `npm run gen:api` from `openapi/openapi.yaml`.
- PASS `frontend npm run lint && npm run format && npm run test:coverage && npm run build`: 69 test files passed, 942 tests passed, 0 failures; lint and format clean; production bundle built cleanly.
- PASS `cd backend && ./mvnw -B verify`: 608 tests run, 0 failures, 0 errors, 1 skipped (exit 0). Max production class length among touched classes: `AuthService.java` (257 lines < 300), `AuthDtos.java` (44 lines < 300).
- PASS `scripts/diff-coverage.sh 65cf508 all`: backend 100% (3/3 changed lines covered), frontend 100% (4/4 changed lines covered).
- PASS `codegraph sync`: 11 changed files synced, 356 nodes.
- PASS E2E: `make e2e-up && make e2e` -> exit 0, 7/7 specs passed, 34/34 tests passing (0 failing, 0 retried); E2E stack left running.
- Contract: `RegisterRequest.password` and `ChangePasswordRequest.newPassword` dropped `minLength: 8`, description updated. Deviations: none.
- 2026-10-29 reviewer: VERDICT: PASS (round 1) — Contract, backend, and frontend drop 8-character minimum while enforcing not-blank and 100-character maximum; all gates green including full E2E 34/34. Status set to USER_REVIEW.
- 2026-10-29 lead: DONE — user accepted

