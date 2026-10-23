# SIGNATURE-CONFIG

Status: TODO
Branch: feat/configurable-signatures
Size: L
Round: 0/2

## Goal

Add named signatures (PNG/JPEG bytes in DB, logical delete) typed `LANDLORD` | `ENTREPRISE_CEO`, managed in a new "Signatures" card on the configuration page, offered in a dropdown on the quittance and note de frais pages and injected into the PDF through a `signature` template variable; with no signature, show "Aucune signature trouvée" and block generation. Out of scope: `templates/RentReceipt.html`, `templates/HomeOfficeExpense.html`, money rules.

## Files

Context: `product_prompt.md`, `web/dto/Dtos.java`, `service/template/{TemplateService,TemplateCatalog,TemplateDataService}.java`, `pages/{SettingsPage,GenerateRentReceiptPage,GenerateExpenseStatementPage}.tsx`.
Writable: `openapi/openapi.yaml`, `db/migration/V4__signature.sql`, `domain/{Signature,SignatureType}.java`, `repository/SignatureRepository.java`, `service/{SignatureService,FileTypeDetector,RentReceiptService,ExpenseStatementService}.java`, `service/template/*`, `web/SignatureController.java`, `templates/defaut/{quittance,note-frais}.html`, backend tests, `frontend/src/**`.
Tests: `BundledTemplateSignatureTest`, `TemplateServiceValidationTest`, new signature service/controller tests, `GenerateRentReceiptPage.test.tsx`, new settings/statement tests.

## Constraints

Contract: `openapi/openapi.yaml` first — `GET/POST/DELETE /api/signatures`, `GET /api/signatures/{id}/image`, `SignatureDto` (no bytes), `signatureId` on `RentReceiptRequest`, `StatementPreviewRequest`, `StatementGenerationRequest`.
Sandbox: `TemplateService.checkSecurity` must accept only `src="{{signature}}"` in addition to literal `data:image/...`; every other non-data `src` stays rejected.
PNG/JPEG magic bytes, ≤ 2 MB, French errors; `bytea` in DB; no `any`; no commit/push/stash/reset.

## Acceptance

- [ ] Signature CRUD + image endpoint: 201/400/404, type and name required, deleted signatures hidden and unusable.
- [ ] Settings "Signatures" card: type, name, image dropzone (PNG/JPEG, preview), thumbnail list, delete with confirm.
- [ ] Quittance and note de frais: dropdown of all signatures, default `LANDLORD` / `ENTREPRISE_CEO`, `signatureId` in preview + generate; empty state warning with link to settings and disabled submit.
- [ ] PDF embeds the chosen image; `{{signature}}` is an allowed optional variable in both catalogs; `npm run gen:api` regenerated.
- [ ] `./mvnw -B test`, `npm run typecheck`, `npm test`, `npm run build` green.

## Commands

- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run gen:api && npm run typecheck && npm test && npm run build`

## Evidence

Append one line per event; never rewrite a previous line.

- `2026-10-23 lead:` branch `feat/configurable-signatures` created from `ab3dbab` (clean); previous `PDF-TEMPLATE-SIGNATURES` work already committed there. Size L — migration + contract + template sandbox, always reviewed.
- `2026-10-23 builder WI-0:` `openapi/openapi.yaml` only, +157/-0: paths `/api/signatures` (GET listSignatures, POST createSignature multipart `type`+`name`+`file` required, 201, 400 problem+json), `/api/signatures/{id}` (DELETE, 204, 404 problem+json), `/api/signatures/{id}/image` (GET, `image/png`+`image/jpeg` binary, 404 problem+json); schema `SignatureDto` (id/type/name/mimeType/createdAt, no bytes) and optional `signatureId` on `RentReceiptRequest`/`StatementPreviewRequest`/`StatementGenerationRequest`. `python3 -c "import yaml;yaml.safe_load(open('openapi/openapi.yaml'))"` → OK (PyYAML 6.0.3). `signature-controller` tag and `SignatureDto` in generated `schema.ts` still pending a later WI (`npm run gen:api`).
- `2026-10-23 builder WI-2:` frontend only: `npm ci && npm run gen:api` (openapi-typescript 7.13.0; regenerated `src/api/schema.ts` reindents the whole file to 4 spaces → full-file diff), `SignatureDto`/`SignatureType` in `types.ts`, `api.signatures {list,create,remove,imageUrl}` (multipart without manual Content-Type) and `queryKeys.signatures`/`useSignatures`, new `components/SignaturesManager.tsx` (type + nom + PNG/JPEG ≤ 2 Mo dropzone with preview, thumbnail list, delete via ConfirmDialog) mounted in `SettingsPage`; signature select with `signatureId` in `GenerateRentReceiptPage` (default LANDLORD) and `GenerateExpenseStatementPage` (default ENTREPRISE_CEO), French empty-list warning + disabled preview/generate. Gates green: `npm run typecheck`, `npm test` 12 files / 67 tests, `npm run build`. Deviation: the warning links to `/configuration`, the only settings route (`/parametres` is not routed and would 404).
- `2026-10-23 builder WI-1:` backend only — `V4__signature.sql` (table `signature`), `Signature`/`SignatureType`/`SignatureRepository`, `SignatureService` (list/create/logical delete/dataUri/resolve; PNG/JPEG magic bytes ≤ 2 Mo, French errors), `SignatureController` (GET list, POST 201 multipart, DELETE 204, GET `/{id}/image`), `Dtos` (`SignatureDto`, `signatureId` on `RentReceiptRequest`/`StatementGenerationRequest`/`StatementPreviewRequest`), `RentReceiptService`/`ExpenseStatementService` resolve the signature (default `LANDLORD`/`ENTREPRISE_CEO`) and block with `Aucune signature configurée. Configurez une signature dans la page Paramètres.`, `TemplateService.checkSecurity` accepts only `src="{{signature}}"` plus literal `data:image/...`, `TemplateCatalog` declares the optional variable, `TemplateDataService` injects the data URI (admin preview resolves the default signature, transparent-PNG fallback), bundled `quittance.html`/`note-frais.html` use `src="{{signature}}"`. TDD: new `SignatureServiceTest` (10) + `SignatureControllerIntegrationTest` (3) failed before the implementation, then green; `ApiIntegrationTest`/`ExpenseStatementActiveIntegrationTest` gained an idempotent signature setup (no assertion weakened). `cd backend && ./mvnw -B test` → Tests run: 123, Failures: 0, Errors: 0, Skipped: 2 (Testcontainers Postgres guard, Docker socket 400 at `/var/run/docker.sock`; one `DocumentTextExtractorTest` case, `pdftotext` absent). `openapi/openapi.yaml` and `frontend/**` untouched by this WI.
- `2026-10-23 builder SIGNATURE-CONFIG review fixes:` (1) `SignatureService.create` trims then rejects a name longer than 255 chars with `BusinessException("Le nom de la signature est trop long (255 caractères maximum).")` before the DB constraint; red test `SignatureServiceTest.rejectsOversizedName` (11 tests in the class) then green. (2) `GenerateRentReceiptPage`/`GenerateExpenseStatementPage` render a French `role="alert"` `data-cy="alerte-signatures-erreur"` block built with `errorMessage(signatures.error)` when `useSignatures().isError`, instead of the empty-list warning (empty list unchanged, preview/generate still disabled); `SignaturesManager` name input gains `maxLength={255}`; one error-state test per page (mocks reject). `cd backend && ./mvnw -B test` → Tests run: 124, Failures: 0, Errors: 0, Skipped: 2 (same Testcontainers/Docker + `pdftotext` skips as WI-1); `cd frontend && npm run typecheck && npm test && npm run build` → typecheck OK, Test Files 12 passed / Tests 69 passed, build OK (`✓ built in 409ms`, chunk-size warning only). No `openapi/openapi.yaml` change.
