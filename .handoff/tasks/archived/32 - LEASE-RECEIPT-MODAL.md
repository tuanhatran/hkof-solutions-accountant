# LEASE-RECEIPT-MODAL

Status: DONE
Branch: feat/32-lease-receipt-modal
Base: c509b68
Size: M
Round: 1/2

## Goal

Each lease row of the "Baux et adresses" tab (`/parametres/configuration/lmnp`) gets a "Quittance" button opening a modal that generates a rent receipt for that lease: month (current month default), lease amounts editable, backend PDF preview, generation keeps the modal open with the result and a "Télécharger le PDF" action. Out of scope: backend, `openapi/openapi.yaml`, `/generer/quittance` page, template selector, new Cypress spec, existing-version banner. User feedback (before acceptance): a lease between natural persons fails with "Sélectionnez une société." from the backend — the modal must resolve the receipt company exactly like `/generer/quittance` (`lease.companyId` else the active company) and use it for preview and generation.

## Files

Context (read only): `frontend/src/pages/rent-receipt/useRentReceiptPage.ts`, `rentReceiptRequest.ts` (`requestFromValues`), `RentReceiptResultCard.tsx`, `RentReceiptAmountFields.tsx`, `frontend/src/hooks/usePdfPreview.ts`, `frontend/src/components/pdf/PdfViewer.tsx`, `frontend/src/components/ui/FormModal.tsx`, `frontend/src/components/ui/FieldGroup.tsx`, `frontend/src/components/ui/Button.tsx`, `frontend/src/pages/settings/CompanyIdentityModal.tsx`, `frontend/src/api/endpoints.ts` (`rentReceipts.preview|create|pdf`, `downloadBlob`), `frontend/src/api/queries.ts` (`useCompanies`, `useSignatures`, `useTemplates`, `queryKeys.rentReceiptsAll`), `frontend/src/state/company.ts` (`resolveActiveCompanyId`, `useCompanyStore`), `frontend/src/api/types.ts` (`LeaseDto`, `RentReceiptDto`), `frontend/src/lib/validation.ts` (`tenantKeyFromLease`), `frontend/src/lib/dates.ts` (`currentMonth`, `periodOfMonth`), `frontend/src/lib/format.ts`, `frontend/src/components/settings/useRentReceiptSettings.ts`, `LeaseForm.tsx`
Writable: `frontend/src/components/settings/LeaseSection.tsx`, `LeaseSection.css`, new `LeaseReceiptModal.tsx` + `LeaseReceiptModal.css`, new `useLeaseReceiptModal.ts`, new `LeaseReceiptModal.test.tsx`, new `LeaseSection.test.tsx`
Affected tests: `frontend/src/pages/settings/LmnpPage.test.tsx`, `frontend/src/router.test.tsx`, `frontend/src/components/layout/AppShell.test.tsx`, `frontend/src/components/llm/LlmBadge.test.tsx`, `frontend/src/hooks/useDraftBlock.test.tsx`

## Constraints

Contract: none — existing `POST /api/rent-receipts`, `/preview`, `/{id}/pdf`; `companyId = lease.companyId` else `resolveActiveCompanyId(useCompanyStore.activeCompanyId, companies)` as on `/generer/quittance` (the backend rejects a null company with "Sélectionnez une société."), tenant via `tenantKeyFromLease`, no `paymentDate`/`issueDate`, period derived from the month (read-only), active template only.
Money: never compute a total in the modal — the generated `RentReceiptDto.total` is displayed as-is (no `Number()` sum); UI French, no `any`, component and CSS < 300 lines, `lease-receipt-modal-*` classes with `@reference`/`@layer components`/tokens.
Behaviour: button `btn-quittance-bail-${lease.id}` disabled with an explanatory French tooltip on a wrapping `<span title>` when `useSignatures(lease.landlordId)` returns none; modal `dialogue-quittance-bail` locks bailleur/locataire read-only, shows the lease company, previews with `usePdfPreview` (400 ms, abort) and, after generation, keeps `RentReceiptDto` + download; invalidates `queryKeys.rentReceiptsAll` and toasts success. Local modal state only: `useRentReceiptDraft` and `useRentReceiptSettings` untouched.

## Acceptance

- [x] "Quittance" button on every lease row, disabled + tooltip when the landlord has no signature; enabled otherwise
- [x] Modal shows month (current default), read-only bailleur → locataire + société, period, editable amounts reusing `rentReceiptSchema`, and the backend PDF preview
- [x] Generate keeps the modal open, shows the backend version/total and "Télécharger le PDF" downloads the generated PDF; list refresh + French toast
- [x] New tests cover disabled-without-signature, preview/generation request bodies (lease pair, company, amounts) and download; affected tests green
- [x] Person-to-person lease without `companyId`, with an existing active company: preview and generation carry that company id and succeed (no "Sélectionnez une société." backend error); the modal displays the company actually used, "Aucune société" only when no company exists at all
- [x] coverage gates met: frontend `npm run test:coverage` >= 90% lines/statements/functions/branches, plus lint, format:check, build and the full E2E run

## Commands

- frontend: `cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.
Files: settings/LeaseSection.tsx + .css (row button + local modal target), new LeaseReceiptModal.tsx + .css, new useLeaseReceiptModal.ts, new LeaseSection.test.tsx, new LeaseReceiptModal.test.tsx.
RED: LeaseSection.test.tsx 2 failed (no button); LeaseReceiptModal.test.tsx 5 failed (no modal form/preview) then 4 failed (no generation/download).
GREEN: new tests 17 passed; affected (codegraph: AppShell, LlmBadge, useDraftBlock, LmnpPage, router) + new tests 53 passed / 7 files.
PASS `npm run test:coverage` exit 0 — 58 files / 569 tests; Statements 97.18% (2282/2348), Branches 90.11% (2353/2611), Functions 94.95% (791/833), Lines 97.33% (2225/2286).
PASS `npm run lint` exit 0 (no output).
PASS `npm run format:check` exit 0 ("All matched files use Prettier code style!").
PASS `npm run build` exit 0 (pre-existing >500 kB chunk warning only).
PASS E2E compose up --build exit 0: 6/6 specs, 26/26 tests, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
Contract: none — no backend, no `openapi/openapi.yaml`, no `gen:api`; reuses POST /api/rent-receipts, /preview, /{id}/pdf.
Deviations: none. No client total computed; result total is `RentReceiptDto.total` formatted as-is.
Commit: 32d2268 7 files +1156/-1
REVIEW round 1 (c509b68..HEAD, 32d2268): 7 frontend files only, no contract change; money read from RentReceiptDto.total; new tests re-run green (17/17, 2 files); VERDICT: PASS.
2026-10-26 lead: USER_CHANGES_REQUESTED — natural-person lease generation fails with backend "Sélectionnez une société.": `useLeaseReceiptModal` sends `leaseRow.companyId ?? null` with no active-company fallback; mirror `/generer/quittance` (`lease.companyId ?? resolveActiveCompanyId(stored, companies)`) for preview, generation and the displayed company. Round reset to 0.
Fix (round 2): companyId = `lease.companyId ?? resolveActiveCompanyId(useCompanyStore.activeCompanyId, useCompanies().data)` used by preview and create; modal shows `lease.companyName ?? companies.find(companyId)?.name ?? "Aucune société"`.
RED: LeaseReceiptModal.test.tsx 4 failed (no active company in preview/create bodies, no displayed company); GREEN: 19 passed / 2 files.
Affected (codegraph + handoff list) + new tests: 61 passed / 7 files.
PASS `npm run test:coverage` exit 0 — 58 files / 571 tests; Statements 97.19% (2288/2354), Branches 90.09% (2355/2614), Functions 94.97% (793/835), Lines 97.33% (2230/2291).
PASS `npm run lint` exit 0; `npm run format:check` exit 0; `npm run build` exit 0 (pre-existing >500 kB warning only).
PASS E2E compose up --build exit 0: 6/6 specs, 26/26 tests, 0 failing, 0 retries; `down -v --remove-orphans` exit 0.
Contract: unchanged (frontend only). Mocks updated to assert companyId 3 for a natural-person lease, stored active company 9, and no companyId when the directory is empty.
Commit: be69383 3 files +68/-7 (explicit paths; the already-staged `.handoff/` file was not committed).
2026-10-26 reviewer: VERDICT PASS (round 1, 32d2268..HEAD be69383) — no blocker; verdict reported to the lead but not written by the reviewer, transcribed here by the lead. Deviation: reviewer omitted its handoff write; not re-run.
2026-10-26 lead: DONE — user accepted
