# 73 - AUTH-LOGIN-REGISTRATION

Status: DONE · Branch: feat/73-auth-login-registration · Base: 1a74b14 · Size: L · Round: 2/2

## Goal

Email+password login, open self-registration with email confirmation (Mailpit locally, SMTP via env), session cookie, seeded thtran with forced password change, all API/UI protected; authenticated users keep full access. Out of scope: user_id ownership (next tasks), admin gating, password reset, 2FA.

## Files

Context (read only): `product_prompt.md` (§ no authentication), `openapi/openapi.yaml`, `frontend/src/api/client.ts` (`request`, `blobRequest`), `frontend/src/components/layout/AppShell.tsx` (`AppShell`), `frontend/src/router.tsx` (`router`), `frontend/src/i18n/resources/{fr,en}.ts`, `backend/src/main/java/fr/hkof/homeofficeexpenses/{config/DataInitializer.java,service/E2eResetService.java}`, `frontend/cypress/support/e2e.ts`, `backend/src/test/resources/application-test.yml`.
Routes: `POST /api/auth/{register,confirm-email,resend-confirmation,login,logout,change-password}`, `GET /api/auth/me`.
Writable backend: `backend/pom.xml`; `backend/src/main/resources/{application.yml,db/migration/V19__auth.sql}`; `backend/src/main/java/fr/hkof/homeofficeexpenses/{config/AppProperties.java,config/SecurityConfig.java,domain/AppUser.java,repository/AppUserRepository.java,service/AuthService.java,service/EmailService.java,web/AuthController.java,web/dto/AuthDtos.java,config/DataInitializer.java,service/E2eResetService.java}`; `backend/src/test/resources/application-test.yml`; `backend/src/test/java/fr/hkof/homeofficeexpenses/{web/AuthIntegrationTest.java,config/DataInitializerTest.java}`.
Writable frontend/config: `openapi/openapi.yaml`; `frontend/src/api/{schema.ts,client.ts,endpoints.ts,queries.ts}`; `frontend/src/{pages/auth/AuthPage.tsx,pages/auth/AuthPage.css,router.tsx,components/layout/AppShell.tsx,lib/validation.ts,i18n/resources/fr.ts,i18n/resources/en.ts}`; `frontend/src/{router.test.tsx,components/layout/AppShell.test.tsx,api/client.test.ts,api/endpoints.test.ts,pages/auth/AuthPage.test.tsx}`; `docker-compose.yml`; `docker-compose.e2e.yml`; `docker-compose.dev.yml`; `.env.example`; `frontend/cypress/{support/e2e.ts,e2e/06-auth.cy.ts}`. Max 40 files; stop and report if exceeded (up to 2 incidental test updates allowed: `api/queries.test.ts`, `i18n/i18n.test.ts`).
Affected tests: backend web `*IntegrationTest` (security off under `test`), `DataInitializerTest`; frontend router/client/endpoints/AppShell tests; all Cypress specs via shared login.

## Constraints

Contract first: `openapi/openapi.yaml` adds `cookieAuth` (apiKey, cookie, JSESSIONID), global `security`, `security: []` on public auth paths, auth schemas, 401/403; then `npm run gen:api`. Session cookie `HttpOnly`, `SameSite=Lax`, BCrypt, CSRF `XSRF-TOKEN` cookie + `X-XSRF-TOKEN` on authenticated mutations (ignored on public auth and `/api/e2e/**` only under e2e), CORS credentials. Never log tokens/passwords; hash confirmation tokens, 24h TTL, single use, no account enumeration; normalized lowercase email unique. Seed `thtran@homeofficeexpenses.local`/`thtran` confirmed + `mustChangePassword` in every profile only if absent; e2e user `e2e@homeofficeexpenses.local`/`e2e-password` confirmed, no forced change; e2e reset restores the thtran seed and never deletes users. While `mustChangePassword`, allow only `me`/`logout`/`change-password` (403 `PASSWORD_CHANGE_REQUIRED`); UI redirects to `/mot-de-passe`. Public UI `/connexion`, `/inscription`, `/confirmer-email`; French, existing tokens/primitives, accessible labels/autocomplete/errors, no new palette. Mailpit in compose (SMTP 1025, UI 8025, backend `SPRING_MAIL_HOST=mailpit`, Cypress `mailpitUrl`); SMTP env-driven, default `localhost:1025`; confirmation link configurable (`APP_AUTH_CONFIRMATION_URL`, default `http://localhost:5173/confirmer-email`). Test profile `app.security.enabled=false` keeps existing web tests unchanged; `PasswordEncoder` bean always present; `AuthIntegrationTest` re-enables security and covers 401/403/CSRF/forced change.
## Acceptance

- [x] Unauthenticated API returns 401; UI redirects to `/connexion`; login/logout/`me` work with a session cookie.
- [x] Register → Mailpit email → confirm → login; duplicate email and wrong password show French errors; resend is non-enumerating; expired/used token rejected; confirmation link works on both the `make dev` (5173) and `make up` (8080) flows; confirm page resolves under React StrictMode.
- [x] thtran/thtran first login forces an 8+ character change; e2e user logs in directly; forced state blocks other APIs; all existing E2E specs pass through the shared login; the new auth spec covers registration, confirmation, login, logout and forced change.
- [x] Contract YAML + regenerated types; gates pass with changed-line coverage >= 80%; production classes and CSS < 300 lines.

## Commands

`cd backend && ./mvnw -B verify` · `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` · `scripts/diff-coverage.sh 1a74b14 all` · `make e2e-up` once then `make e2e` (full suite, leave the stack up) · commit once with explicit paths; no push.

## Evidence

- Files: 39 changed/untracked (backend auth, SecurityConfig, V19 migration, tests; openapi + generated schema; AuthPage.tsx/.css/.test; router/AppShell/client/endpoints/queries/i18n/validation; compose + Mailpit; Cypress support + 06-auth spec).
- PASS `cd backend && ./mvnw -B verify` -> BUILD SUCCESS, 585 tests, 0 failures, 0 errors, 1 pre-existing skip (DocumentTextExtractorTest); AuthIntegrationTest 7/7, DataInitializerTest 3/3.
- PASS `cd frontend && npm run gen:api && npm run test:coverage && npm run lint && npm run format:check && npm run build` -> 69 files, 948 tests passed; statements 96.46%, lines 96.55%; AuthPage.tsx 94.89% lines; tsc + vite exit 0.
- PASS `scripts/diff-coverage.sh 1a74b14 all` -> backend 93% (352 changed lines, 24 missing), frontend 90% (216 changed lines, 21 missing).
- RED E2E: `make e2e-up` once, then `make e2e` -> exit 2, 17 failed / 17 passed; every failure 403 CSRF_INVALID on direct `cy.request` mutations in existing specs.
- Fix in writable `frontend/cypress/support/e2e.ts`: overwrite `cy.request` to mirror the XSRF-TOKEN cookie into X-XSRF-TOKEN for unsafe methods.
- GREEN E2E: `make e2e` -> exit 0, 7 specs, 34 tests passed, 0 failed/pending/skipped, no retry; stack left up.
- After the support edit: PASS `npm run lint`, `npm run format:check`, `npm run build`, `npx vitest run --coverage` (69 files/948 tests) and diff-coverage unchanged (93%/90%).
- Sizes: SecurityConfig 232, AuthService 258, DataInitializer 270, E2eResetService 242, AuthController 146, AppUser 119, AuthPage.css 89 lines.
- AuthPage.tsx is 579 lines: one page component hosting login/register/confirm/password modes; not split because new files are outside the handoff writable list.
- Mailpit SMTP 1025/UI 8025, backend `SPRING_MAIL_HOST=mailpit`; e2e overlay hides its host port, Cypress reads `--expose mailpitUrl`; `cy.login()` runs after `cy.resetState()` and is skipped for 06-auth; reset restores thtran and e2e users.
- Contract impact: `openapi/openapi.yaml` adds cookieAuth, global security, 6 auth paths, auth schemas and 401/403; `frontend/src/api/schema.ts` regenerated via `npm run gen:api`.
- Assumption: 403 CSRF failures were test-harness-only (direct API calls), not product defects; UI mutations already send the header.
- Commit: a556d01 39 files +3935/-32
- 2026-10-29 lead: VERDICT: BLOCKERS (2) (reviewer, round 1) — (1) confirmation URL dead in `make up`: `docker-compose.yml` does not forward `APP_AUTH_CONFIRMATION_URL`, so the default 5173 link fails on 8080; add base env 8080 + `docker-compose.dev.yml` override 5173 + `.env.example` doc. (2) `frontend/src/pages/auth/AuthPage.tsx:391-412` StrictMode confirm effect keeps "loading" forever; fix the effect and add a StrictMode-wrapped test. Round 2: fix commit only.

- 2026-10-29 builder round 2: fixed the 2 reviewers blockers only.
- Blocker 1 files: docker-compose.yml (backend `APP_AUTH_CONFIRMATION_URL: ${APP_AUTH_CONFIRMATION_URL:-http://localhost:${FRONTEND_PORT:-8080}/confirmer-email}`), docker-compose.dev.yml (backend override 5173), docker-compose.e2e.yml (`http://frontend/confirmer-email`), .env.example (optional var documented).
- PASS `docker compose config` -> `http://localhost:8080/confirmer-email`; with `FRONTEND_PORT=9090` -> `http://localhost:9090/confirmer-email`; explicit `APP_AUTH_CONFIRMATION_URL` honored.
- PASS `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` -> `http://localhost:5173/confirmer-email`; e2e overlay config and running e2e backend `printenv` -> `http://frontend/confirmer-email`.
- Blocker 2: AuthPage.tsx ConfirmPanel caches the confirm promise per token in a ref (one POST per token), each effect run attaches a fresh mounted flag; StrictMode remount now reads the live flag. Single-use token semantics unchanged.
- RED `npx vitest run src/pages/auth/AuthPage.test.tsx -t StrictMode` -> 1 failed (page stuck on "Confirmation en cours…") before the fix; GREEN with new StrictMode test -> 9/9 AuthPage tests, `confirm-email` called once.
- PASS `codegraph affected AuthPage.tsx AuthPage.test.tsx` -> 7 files; targeted run 115 tests passed.
- PASS `cd frontend && npm run test:coverage` -> 69 files, 949 tests passed; statements 96.46%, lines 96.55%, AuthPage.tsx 95% lines; `npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0 (tsc + vite).
- PASS `scripts/diff-coverage.sh 1a74b14 all` -> backend 93% (352 lines, 24 missing), frontend 90% (214 lines, 21 missing).
- PASS `make e2e` (stack already up) -> exit 0, 7 specs, 34 tests passed, 0 failed/pending/skipped, no retry; stack left up.
- Backend untouched; no backend gate run (frontend/config only). Contract impact: none.
- Deviations: none.
- Commit: f871aa3 6 files +52/-9
- 2026-10-29 lead: VERDICT: PASS (reviewer, round 2, fix commit a556d01..f871aa3) — blocker 1 resolved (base compose 8080 honoring `FRONTEND_PORT`, dev overlay 5173, e2e `http://frontend/confirmer-email`, explicit override honored); blocker 2 resolved (one POST per token via ref cache, per-run mounted flag, StrictMode test red→green); no new blocker. Status set to USER_REVIEW.
- 2026-10-29 lead: DONE — user accepted
