# LEASE-RECEIPT-HISTORY

Status: DONE
Branch: feat/33-lease-receipt-history
Base: 7a9297d
Size: M
Round: 1/2

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

- 2026-10-26 lead: resumed on existing branch; HEAD 2269cad (unrelated user agent-config commit after Base 7a9297d); task review range = builder commit only.
- 2026-10-26 builder r0: files: queries.ts (+useAllRentReceipts), queries.test.ts, new LeaseReceiptHistory.tsx/.css/.test.tsx, LeaseSection.tsx/.test.tsx.
- red→green: queries.test.ts useAllRentReceipts 1 failed→file 17 passed; LeaseReceiptHistory.test.tsx module-missing red→12 passed; LeaseSection.test.tsx history 2 failed→6 passed.
- deviation: jsdom gives summary no button role and no Enter activation; test asserts focusability then expands via click (native details stays keyboard-accessible in browsers).
- PASS full vitest run: 582 passed; after coverage tests 587 passed / 59 files.
- PASS npm run typecheck · PASS npm run lint · PASS npm run format:check.
- coverage first run RED (branches 89.98% < 90): added 5 defensive-branch tests, no production change.
- PASS npm run test:coverage: global 97.22% stmts / 90.17% branch / 95.04% funcs / 97.36% lines.
- PASS npm run build (pre-existing >500 kB chunk warning).
- E2E: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress → exit 0; 6 specs, 26/26 tests passed, 0 retries; down -v --remove-orphans → exit 0.
- Contract: none (reused GET /api/rent-receipts and /{id}/pdf).
- Commit: 1065b43 7 files +637/-1 (.handoff excluded; user commit 2269cad untouched).
- 2026-10-26 lead: VERDICT: PASS (reviewer, round 1) — targeted LeaseReceiptHistory.test.tsx 12/12; gate evidence accepted; task at USER_REVIEW.
- 2026-10-26 lead: DONE — user accepted
