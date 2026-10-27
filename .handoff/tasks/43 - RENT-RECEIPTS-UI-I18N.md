# 43
Status: DONE
Branch: feat/43-rent-receipts-ui-i18n
Base: 3f1a844
Size: L
Round: 1/2
## Goal
Make the rent-receipt (quittance) generation UI fully bilingual FR/EN with react-i18next: page labels, help text, toasts, PDF preview chrome, month labels and the rent-receipt form validation messages, while French remains byte-identical. Out of scope: expense statements, history, settings/LMNP, templates, Admin IA, PDF templates/documents, API/contract, other validation schemas.
## Files
Read: .handoff/tasks/{39 - I18N-FOUNDATION,40 - API-ERROR-CODES}.md · frontend/src/i18n/{index.ts,resources/fr.ts,resources/en.ts} · frontend/src/test/setup.ts · frontend/cypress/support/e2e.ts
Write: frontend/src/pages/rent-receipt/{GenerateRentReceiptPage,RentReceiptForm,RentReceiptAmountFields,RentReceiptPartyFields,RentReceiptSignatureField,RentReceiptPreviewPane,RentReceiptResultCard,ActiveRentReceiptBanner}.tsx · frontend/src/pages/rent-receipt/useRentReceiptPage.ts · frontend/src/components/pdf/PdfViewer.tsx · frontend/src/lib/format.ts · frontend/src/lib/validation.ts · frontend/src/i18n/resources/{fr,en}.ts · frontend/src/pages/rent-receipt/{GenerateRentReceiptPage,useRentReceiptPage}.test.tsx · frontend/src/components/pdf/PdfViewer.test.tsx · frontend/src/lib/{format,validation}.test.ts
Affected tests: the 5 test files above · full frontend suite · full E2E
Symbols: GenerateRentReceiptPage, RentReceiptForm, useRentReceiptPage, PdfViewer, formatMonth, rentReceiptSchema, i18n resources
## Constraints
Domain terms (Quittance, NoteFrais, LigneFrais, Justificatif, Parametres, Poste) stay French in UI · amounts stay `1 234,56 €` and dates `DD/MM/YYYY` (`formatEUR`/`formatDate` untouched) · only `formatMonth` becomes language-aware; `formatPeriod`/`formatBytes` out of scope · only `rentReceiptSchema` messages become language-aware (other schemas untouched) · no `any` · no API/contract change · no money logic · FR output byte-identical · builder commits once, explicit paths, no push
## Acceptance
- No hardcoded French UI text remains in the 10 writable production components except domain terms and dynamic data; every label, help, aria-label and toast uses `t()`.
- In EN the page, preview chrome and toasts read English; domain terms stay French; amounts/dates render as before.
- `formatMonth` returns French or English month names from the current language (FR unchanged, e.g. "Octobre 2026"); `formatEUR`/`formatDate`/`formatPeriod`/`formatBytes` unchanged.
- Rent-receipt validation messages follow the current language at parse time in both `zodResolver` and `safeParse` paths; other schemas keep their French messages.
- Existing FR page/PdfViewer/format/validation tests stay green; new EN tests cover page labels, a validation error, `formatMonth` and PdfViewer accessibility labels; E2E keeps its FR assertions.
- Frontend diff coverage >= 80%; full E2E green.
## Commands
- cd frontend && npm run test:coverage && npm run lint && npm run format:check && npm run build
- scripts/diff-coverage.sh 3f1a844 frontend
- full E2E once: docker compose -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml up --build --abort-on-container-exit --exit-code-from cypress; then down -v --remove-orphans; if Docker unavailable set BLOCKED.
## Builder evidence
Commit: c0ed3c2 19 files +608/-130
- Red (5 test files): 5 failed / 98 passed — one new EN test per file failed before keys/behavior.
- New keys: rentReceipt.{page,form,fields,preview,result,banner,toasts,tenantOptions,validation}, pdfViewer.* (FR/EN parity).
- formatMonth reads i18n.resolvedLanguage ("fr-FR"/"en-GB"); FR unchanged, invalid -> "—"; EUR/date formats untouched.
- rentReceiptSchema uses `{ error: () => i18n.t(...) }`, re-evaluated per parse (zod 4.6.7); other schemas keep French strings.
- PASS targeted 5 files / 103 tests — exit 0.
- PASS codegraph affected 53 files / 632 tests — exit 0.
- PASS cd frontend && npm run test:coverage — 63 files, 684 tests, exit 0.
- PASS cd frontend && npm run lint — exit 0.
- PASS cd frontend && npm run format:check — exit 0.
- PASS cd frontend && npm run build — exit 0.
- PASS scripts/diff-coverage.sh 3f1a844 frontend — 96% (26 changed lines, 1 missing), exit 0.
- PASS E2E up --build --abort-on-container-exit --exit-code-from cypress — exit 0, 6/6 specs, 26/26 tests, 0 retries.
- PASS same compose down -v --remove-orphans — exit 0.
- Deviations: none. Contract: none. No string left untranslated: JSX space/punctuation separators kept literal.

- 2026-10-27 lead: VERDICT: PASS (reviewer, round 1/2) — 3f1a844..c0ed3c2, FR byte-identical, EN complete, 279/279 parity, no blocker; status USER_REVIEW.
- 2026-10-27 lead: DONE — user accepted.
