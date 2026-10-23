# ANALYSIS-PDFTOTEXT-OCR-TTC

Status: DONE
Branch: task/pdftotext-layout-ocr
Size: L
Round: 2/2

## Goal

Give the LLM layout-preserved text (`pdftotext -layout`), OCR scanned PDFs (`tesseract fra`), and let a deterministic `HT × (1 + taux)` check (5.5/10/20) decide the TTC before trusting the model's amount. Out of scope: contract, DTO, UI, model choice, image uploads (vision path unchanged).

## Files

Plan (signatures, tests): `.handoff/plans/2026-10-23-pdftotext-layout-ocr.md` · Context: `DocumentTextExtractor`, `ExtractionPipeline`, `CalculationService`, `StorageService` (UUID names)
Writable A: `backend/Dockerfile`, `service/extraction/{ExternalCommand,OcrTextExtractor,DocumentTextExtractor}.java`, their tests, `README.md` Assumptions
Writable B: `service/CalculationService.java`, `service/llm/{TotalAmountResolver,ExtractionPipeline}.java`, `CalculationServiceTest`, `TotalAmountResolverTest`, `ExtractionPipelineTest`

## Constraints

- Missing binary/timeout/empty output → today's PDFBox or vision path; never fail an analysis.
- Money only through `CalculationService` (`BigDecimal`, `HALF_UP`, scale 2); French messages.
- Never commit/push/reset/stash; synthetic PDFs only, never `sosh.pdf`; no contract or UI change.

## Acceptance

- [ ] PDFs use `pdftotext -layout` when available, layout preserved (no inner-space collapsing), PDFBox fallback covered by tests.
- [ ] Text-free PDFs go through tesseract when present, else vision images; OCR disabled/tool missing covered.
- [ ] Model amount `24,16` vs resolved TTC `28,99` → `28.99`, confidence `basse`, source line updated; agreement and no-candidate paths unchanged; non-EUR ignored.
- [ ] `./mvnw -B test` green; Docker image contains `pdftotext`/`tesseract` or the gap is reported.

## Commands

- backend: `cd backend && ./mvnw -B test` · frontend: `cd frontend && npm run typecheck && npm test && npm run build` · image: `docker build -t hoe-backend-test backend`

## Evidence

- `2026-10-23 lead:` design approved (option b, rates 5.5/10/20, deterministic first); branch `task/pdftotext-layout-ocr` from `c28788c`; plan written.
- `2026-10-23 builder A:` new tests red then green; `./mvnw -B test` 83 tests, 0 failures, 2 skips PASS; `docker build -t hoe-backend-test backend` PASS, `pdftotext 24.02.0` + `tesseract 5.3.4` + `fra`, 740 MB.
- `2026-10-23 builder B:` new tests red then green; `./mvnw -B test` 101 tests, 0 failures, 2 skips PASS.
- `2026-10-23 lead:` real bill: image `pdftotext -layout` on `sosh.pdf` → `TotalAmountResolver` → `ttc=28.99 ht=24.16` PASS.
- `2026-10-23 lead:` backend 101/0/2 PASS; frontend typecheck + 53/53 tests + build PASS.
- `2026-10-23 reviewer:` `PASS` (round 1), 101/0/2 re-run PASS; notes: model amount nulled by the presence check is not replaced by the resolver; resolver keys pairs by TTC only; test fixtures reuse real bill amounts/supplier.
- `2026-10-23 lead:` round 1 PASS but note 3 breaks `50-security-data.md` (no real amounts in tests); notes 1-2 accepted → `CHANGES_REQUESTED`, Round 2/2, back to builder B.
- `2026-10-23 builder B:` round 2 fixes; `./mvnw -B test` 104 tests, 0 failures, 2 skips PASS; dotted `24.16`/`28.99` left in `CalculationServiceTest`.
- `2026-10-23 reviewer:` `CHANGES_REQUESTED` (round 2, final) — blocker: `CalculationServiceTest.java:80-81` keeps the real bill's HT/TTC pair; 104/0/2 rerun PASS.
- `2026-10-23 lead:` Round 2 exhausted → `BLOCKED`; decision needed: swap the two constants to the synthetic 41.66/49.99 pair (then green rerun) or accept them.
- `2026-10-23 lead:` user decision — swap to synthetic values; builder B applies the two-constant change, lead reruns the gate; no third review round.
- `2026-10-23 builder B:` `CalculationServiceTest` swapped to 41.66/49.99 (HALF_UP facet kept); `./mvnw -B test` 104/0/2 PASS.
- `2026-10-23 lead:` backend 104/0/2 PASS; `src/test` real-amount grep EMPTY; real bill `sosh.pdf` → `ttc=28.99 ht=24.16` PASS. Pre-existing `templates/HomeOfficeExpense.md:31` "28.99" is out of this diff.
- `2026-10-23 lead:` USER_REVIEW — awaiting explicit acceptance.
- `2026-10-23 lead:` `DONE — user accepted`
