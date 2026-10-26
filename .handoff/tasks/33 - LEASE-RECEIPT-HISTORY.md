# LEASE-RECEIPT-HISTORY

Status: TODO
Branch: feat/33-lease-receipt-history
Base: 7a9297d
Size: M
Round: 0/2

## Goal

Each `lease-section-item` of "Baux et adresses" (`/parametres/configuration/lmnp`) gains a full-width subsection listing that lease's rent receipts grouped by month, newest month first: every month is collapsed with `formatMonth` + a badge counting all its generated versions and expands (keyboard accessible) to each version with its date, the backend total and a PDF download; French empty/loading/error states. Out of scope: backend, `openapi/openapi.yaml`, history page, `LeaseReceiptModal`, any month total computed client-side.

## Files

Context (read only): `frontend/src/pages/history/historyHelpers.ts` (`sortRentReceiptsDesc`), `frontend/src/pages/history/HistoryActions.tsx` (`PdfActionLink`, `VersionBadge`), `frontend/src/pages/history/RentReceiptMonthPanel.tsx` (details/summary + version list pattern), `frontend/src/api/endpoints.ts` (`rentReceipts.list()` with no args, `pdfUrl`), `frontend/src/api/queries.ts` (`queryKeys.rentReceiptsAll` prefix), `frontend/src/components/settings/useLeaseReceiptModal.ts` (invalidates `rentReceiptsAll`), `frontend/src/api/types.ts` (`LeaseDto`, `RentReceiptDto`), `frontend/src/lib/format.ts` (`formatEUR`, `formatMonth`, `formatDateTime`), `frontend/src/components/ui/States.tsx`
Writable: `frontend/src/api/queries.ts` (new `useAllRentReceipts` only), new `frontend/src/components/settings/LeaseReceiptHistory.tsx` + `.css` + `.test.tsx`, `frontend/src/components/settings/LeaseSection.tsx` + `.css` + `.test.tsx`, `frontend/src/api/queries.test.ts`
Affected tests: `queries.test.ts`, `LeaseSection.test.tsx`, `LeaseReceiptModal.test.tsx`, `LmnpPage.test.tsx`, `SettingsPage.test.tsx`, `router.test.tsx`, `AppShell.test.tsx`, `useDraftBlock.test.tsx`

## Constraints

Contract: none — reuse `GET /api/rent-receipts` and `GET /api/rent-receipts/{id}/pdf`. Receipt→lease match in the client (no `leaseId` exists): natural lease = same `landlordId` + `tenantId` and `tenantCompanyId == null`; company lease (`lease.companyLease`) = same `landlordId` + `tenantCompanyId === lease.companyId`. One `useAllRentReceipts()` query in `LeaseSection` calling `api.rentReceipts.list()`, never one query per row.
Money: display each `RentReceiptDto.total` as-is; never sum versions client-side. UI French · no `any` · CSS colocated `lease-receipt-history-*` under `@reference`/`@layer components`, tokens only, < 300 lines · download links focusable · no commit or push.

## Acceptance

- [ ] Subsection always visible below each row's actions; months sorted descending; `data-cy`: `quittances-bail-${lease.id}`, `quittances-bail-mois-${lease.id}-${month}`, `telecharger-quittance-bail-${receipt.id}`
- [ ] Collapsed month shows `formatMonth` + count of all versions; expanding lists every version newest first (badge, date, backend total, PDF download), including when count is 1; empty/loading/error states French and row-safe
- [ ] Receipts matched to the right lease only (natural + company cases, no other tenant); modal generation refreshes the list via the existing `rentReceiptsAll` invalidation; new tests RED then GREEN
- [ ] coverage gates met: `npm run test:coverage` >= 90% lines/statements/functions/branches, lint, format:check, build and one full E2E run green

## Commands

- frontend: `cd frontend && npm run typecheck && npm run lint && npm run format:check && npm run test:coverage && npm run build`
- e2e: `docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress`

## Evidence

Append one line per event; never rewrite a previous line.
