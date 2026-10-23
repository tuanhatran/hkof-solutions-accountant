# PDF-TEMPLATE-SIGNATURES

Status: DONE
Branch: feat/add-signatures-to-templates
Size: M
Round: 1/2

## Goal

Embed `Signature_Bailleur.png` in the built-in quittance signature frame and `Signature_TRAN.png` in the built-in note de frais signature frame, as the base64 data URI the template sandbox requires. Out of scope: `templates/RentReceipt.html` and `templates/HomeOfficeExpense.html` (unreferenced samples), contract, settings, DB, PDF rendering code.

## Files

Context (read only): `backend/src/main/resources/templates/Signature_Bailleur.png` (782x325), `Signature_TRAN.png` (1640x703), `service/template/TemplateService.java` (`checkSecurity`), `service/PdfService.java`
Writable: `backend/src/main/resources/templates/defaut/quittance.html`, `backend/src/main/resources/templates/defaut/note-frais.html`, `backend/src/test/java/fr/hkof/homeofficeexpenses/service/template/BundledTemplateSignatureTest.java`
Affected tests: new `BundledTemplateSignatureTest`; `TemplateServiceValidationTest` must stay green unchanged.

## Constraints

- Sandbox: `<img src>` must be `data:image/png;base64,...`; no remote, `file:`, `classpath:` or `../` source.
- Keep the existing label ("Signature du bailleur" / "Signature du gérant") and frame; grow `.cadre` height so label + scaled image fit without overflow (`box-sizing: border-box` is global).
- No commit/push/reset/clean/stash; never modify a PNG, embed its exact bytes.

## Acceptance

- [ ] Quittance data URI decodes to bytes identical to `Signature_Bailleur.png`; note de frais to `Signature_TRAN.png`.
- [ ] New test mustache-renders the built-in quittance, runs `PdfService.renderHtmlToPdf` and finds a `PDImageXObject` on page 1; existing `TemplateServiceValidationTest` still passes.
- [ ] `cd backend && ./mvnw -B test` green.

## Commands

- backend: `cd backend && ./mvnw -B test`
- focused: `cd backend && ./mvnw -B test -Dtest='BundledTemplateSignatureTest,TemplateServiceValidationTest'`

## Evidence

Append one line per event; never rewrite a previous line.

- `2026-10-23 lead:` branch `feat/add-signatures-to-templates` created from `main` (clean worktree); Size M — template sandbox, always reviewed.
- `2026-10-23 builder:` red run `./mvnw -B -q test -Dtest='BundledTemplateSignatureTest,TemplateServiceValidationTest'` — BundledTemplateSignatureTest 2 failures (no data URI in quittance, no PDImageXObject on page 1), TemplateServiceValidationTest 5 passed.
- `2026-10-23 builder:` implementation — Python/base64 splice of `Signature_Bailleur.png` (71 808 b64 chars) into `defaut/quittance.html` and `Signature_TRAN.png` (462 456 b64 chars) into `defaut/note-frais.html`, single-line `src="data:image/png;base64,..." width="150" alt="Signature"`; `.cadre` height 92 -> 100 px (quittance) and 88 -> 100 px (note de frais), frames/colors unchanged. New test `BundledTemplateSignatureTest` (byte equality + PDFBox image assertion).
- `2026-10-23 builder:` green run `./mvnw -B test` — Tests run: 108, Failures: 0, Errors: 0, Skipped: 2 (Postgres-gated `TemplateActivationPostgresTest`, Docker unavailable; `DocumentTextExtractorTest` conditional skip). BUILD SUCCESS.
- `2026-10-23 builder:` skip precision — `docker info` succeeds on this host but Testcontainers reports "Docker is not available" (socket/daemon discovery), so `TemplateActivationPostgresTest` is skipped by `disabledWithoutDocker`; `DocumentTextExtractorTest` skips one case via `assumeTrue(realCommandAvailable("pdftotext"))`. Neither is a failure.
- `2026-10-23 reviewer:` `VERDICT: PASS` (round 1) — payloads independently decoded: 71 808 b64 chars → 53 856 bytes matching `Signature_Bailleur.png` (782×325), 462 456 b64 chars → 346 840 bytes matching `Signature_TRAN.png` (1640×703); `git diff main --name-only` shows only the 2 built-in templates, no `backend/src/main/java` or `openapi` change, `checkSecurity` untouched, samples/PNGs/`.md` untouched; layout recomputed with `border-box` (content 232×82 / 222×82, label + 150 px image cannot share a line, image line 66.3 / 68.3 px) → no overflow; test asserts byte equality plus a real `PDImageXObject` on page 1. Notes: note-frais budget tight (~80/82 px), note-frais data URI byte-verified but not render-tested, orphaned samples still carry their own signatures (out of scope).
- `2026-10-23 lead:` independent gate `cd backend && ./mvnw -B test` — Tests run: 108, Failures: 0, Errors: 0, Skipped: 2, BUILD SUCCESS; diff reviewed with base64 elided; no lead code edit. Status → USER_REVIEW, awaiting user acceptance.
- `2026-10-23 lead:` `DONE — user accepted`
