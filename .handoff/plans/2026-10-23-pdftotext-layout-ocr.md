# pdftotext + OCR + deterministic TTC guard — Implementation Plan

**Goal:** Extract bill text with layout (`pdftotext -layout`), OCR scanned PDFs (`tesseract fra`), and let a deterministic `HT × (1 + taux)` check decide which candidate amount is the TTC before the LLM's answer is trusted.

**Architecture:** PDFs go through the external `pdftotext`; PDFBox remains the fallback when the binary is missing or fails. A PDF without a text layer is rendered and OCR'd; if OCR is unavailable the existing vision path is kept. `ExtractionPipeline` cross-checks the model's amount against `TotalAmountResolver`, which matches amount pairs with 5.5/10/20 % via `CalculationService`.

**Spec:** this plan plus the approved design in the task handoff. Out of scope: contract/API, UI, model choice, image uploads (vision stays).

## Global constraints

- Never commit, push, reset, clean or stash.
- Money: `CalculationService`, `BigDecimal`, `HALF_UP`, scale 2.
- No `openapi/openapi.yaml`, `api/schema.ts`, DTO or endpoint change.
- French user messages, English identifiers; no `any` (TS untouched).
- No personal PDF committed: tests build synthetic PDFs, never `backend/data/examples/sosh.pdf`.
- Missing external binaries must never fail an analysis: fallback to today's behaviour.

## Review focus

1. Filename with spaces, quotes or a leading `-` → fixed argv, no shell, no option injection (`--` where supported).
2. Huge PDF or hung binary → timeout, output cap, page cap, process killed.
3. Scanned PDF with no tesseract installed → current vision-image fallback, no analysis failure.
4. Invoice without a printed VAT rate → 5.5/10/20 trial; zero or several matches → no deterministic pick.
5. HT-only or foreign-currency bill → guard must not invent a TTC (EUR only).

## Task 1 — External command runner

**Files:** Create `backend/src/main/java/fr/hkof/homeofficeexpenses/service/extraction/ExternalCommand.java`; Test `backend/src/test/java/fr/hkof/homeofficeexpenses/service/extraction/ExternalCommandTest.java`.

**Interfaces:** `ExternalCommand.run(List<String> argv, Duration timeout, int maxChars)` → `record Result(int exitCode, String stdout, boolean timedOut)`. No shell; stderr discarded; output read up to `maxChars` then drained; `destroyForcibly` + `timedOut=true` on timeout; `IOException` (binary absent) → `Result(-1, "", false)`.

- [ ] Test: `printf`-free fixture uses `/bin/echo` and `/bin/sleep`; `echo hello` → exit 0, stdout "hello\n"; `sleep 5` with `Duration.ofMillis(100)` → `timedOut` true within ~1 s; script emitting 100 kB with `maxChars=10` → stdout length ≤ 10.
- [ ] Run: `cd backend && ./mvnw -B -Dtest=ExternalCommandTest test` → FAIL (class missing).
- [ ] Implement the runner.
- [ ] Re-run → PASS.

## Task 2 — Layout extraction with pdftotext fallback

**Files:** Modify `backend/src/main/java/fr/hkof/homeofficeexpenses/service/extraction/DocumentTextExtractor.java`; Create `backend/src/test/java/fr/hkof/homeofficeexpenses/service/extraction/DocumentTextExtractorTest.java`.

**Interfaces:** public `extract(Path, String, int)` unchanged; constructor takes `@Value("${analysis.pdftext.command:pdftotext}") String pdftextCommand`, `@Value("${analysis.pdftext.timeout:15s}") Duration pdftextTimeout`. PDF branch: `pdftotext -q -layout -enc UTF-8 -f 1 -l <MAX_TEXT_PAGES> <path> -`; non-empty stdout (≥20 chars) → `textOnly(layoutPreserving(text))`. Otherwise, or on `exitCode<0`/timeout/empty → existing `extractPdf` (PDFBox). `layoutPreserving` replaces `\r\n`/`\r` with `\n`, `\u000C` with `\n`, strips trailing spaces per line, caps at `MAX_LENGTH` **without collapsing inner spaces** (do not route through `truncate`).

- [ ] Test with a fake executable (temp shell script echoing `total auprès d'Orange 24,16 28,99`, then exiting 0): text returned verbatim, double spaces kept.
- [ ] Test fallback: script exits 2 → PDFBox text of a synthetic PDF (built with PDFBox, contains `Montant TTC : 120,00`) is returned.
- [ ] Test fallback: command path `/nonexistent/pdftotext` → PDFBox path, no exception.
- [ ] Gated real test: `Assumptions.assumeTrue` on `pdftotext -v`; synthetic 2-amount PDF → output contains both amounts in one line.
- [ ] Run the class → FAIL, then implement → PASS.

## Task 3 — OCR for PDFs without a text layer

**Files:** Create `backend/src/main/java/fr/hkof/homeofficeexpenses/service/extraction/OcrTextExtractor.java`; Modify `DocumentTextExtractor`; Test `OcrTextExtractorTest.java` + extend `DocumentTextExtractorTest`.

**Interfaces:** `OcrTextExtractor.recognize(Path png)` → String (`""` on failure); constructor `@Value("${analysis.ocr.command:tesseract}")`, `@Value("${analysis.ocr.language:fra}")`, `@Value("${analysis.ocr.timeout-per-page:30s}")`. `DocumentTextExtractor` gets `@Value("${analysis.ocr.enabled:true}") boolean ocrEnabled`; when PDFBox text < 20 chars and OCR is enabled: render pages at 300 dpi (existing `PDFRenderer`), temp PNG mode 600, OCR each up to `maxPagesVision`, join with `\n\n`; if joined text ≥ 20 chars → `textOnly`; else existing images path.

- [ ] Test fake tesseract script printing `Total TTC 28,99` → `recognize` returns it; missing command → `""`.
- [ ] Test image-only synthetic PDF (rectangle only, no text) + fake tesseract → extracted text contains the OCR text; with `ocrEnabled=false` → images list non-empty (vision path).
- [ ] Run → FAIL, implement → PASS.

## Task 4 — VAT gross calculation

**Files:** Modify `backend/src/main/java/fr/hkof/homeofficeexpenses/service/CalculationService.java`; Test `CalculationServiceTest.java`.

**Interfaces:** `public static BigDecimal grossFromNet(BigDecimal net, BigDecimal vatRatePct)` → `net × (1 + vatRatePct/100)`, `HALF_UP`, scale 2; null/negative net or rate outside 0..100 → `BusinessException` with a French message.

- [ ] Tests: `(24.16, 20) == 28.99`; `(100, 5.5) == 105.50`; `(80, 0) == 80.00`; negative net throws; rate 101 throws.
- [ ] Run → FAIL, implement → PASS.

## Task 5 — Deterministic TTC resolver

**Files:** Create `backend/src/main/java/fr/hkof/homeofficeexpenses/service/llm/TotalAmountResolver.java`; Test `TotalAmountResolverTest.java`.

**Interfaces:** `public static Resolution resolve(String text)` → `record Resolution(String ttc, String ht, String excerpt)`; `null` when no unique candidate.

Rules:
- Lines are scanned (max 400). A "total line" normalizes accents/lowercase and contains one of: `total a payer`, `net a payer`, `montant a payer`, `montant total`, `total ttc`, `total aupres`, `total facture`, `total de la facture`; it must not contain `total ht`, `total hors taxe`, `total tva`, `solde`, `cumul`.
- Amounts per line: `\d{1,3}(?:[ \u00A0\u202F]\d{3})*[.,]\d{2}` converted to `"123.45"`.
- For every total line holding ≥ 2 amounts, and for each rate in `{5.5, 10, 20}`: if `CalculationService.grossFromNet(a, rate)` equals `b`, record `(ht=a, ttc=b)`. Distinct TTC values: exactly 1 → resolution; ≥ 2 → `null`.
- If no pair matched, collect single amounts on total lines; exactly 1 distinct → `Resolution(amount, null, line)`; otherwise `null`.
- Excerpt = the matched line, max 500 chars.

- [ ] Test real layout shape `n° de facture...\ntotal auprès d'Orange 24,16 28,99\n... TVA 20,00 %` → `28.99`, `ht=24.16`.
- [ ] Test 10 % pair `total TTC 110,00 100,00` → TTC 110.00; 5.5 % pair `105,50 100,00` → 105.50.
- [ ] Test ambiguous: two total lines giving different TTC → `null`; HT-only line `total HT 24,16` → `null`; no total line → `null`.
- [ ] Run → FAIL, implement → PASS.

## Task 6 — Wire the guard into the pipeline

**Files:** Modify `backend/src/main/java/fr/hkof/homeofficeexpenses/service/llm/ExtractionPipeline.java`; Test `ExtractionPipelineTest.java`.

**Interfaces:** `interpret(String rawResponse, String textDocument, int imageCount)` keeps its signature; uses `TotalAmountResolver.resolve(...)` after field validation and only when normalized currency is `EUR`.

- [ ] Test model answers `24.16` (excerpt containing it) while resolver finds `28.99` → `montantTtc() == "28.99"`, `confiance == "basse"`, excerpt replaced by the total line.
- [ ] Test model answers `28.99` and resolver finds `28.99` → confidence unchanged (`haute`).
- [ ] Test model returns null, resolver finds `28.99` → amount `28.99`, confidence `moyenne`.
- [ ] Test no resolver candidate → current behaviour unchanged (amount kept or nulled by presence check).
- [ ] Test non-EUR currency (`devise: "CHF"`) → resolver ignored.
- [ ] Run → FAIL, implement → PASS.

## Task 7 — Runtime image and documentation

**Files:** `backend/Dockerfile`, `README.md` (Assumptions).

- [ ] Dockerfile runtime apt line adds `poppler-utils tesseract-ocr tesseract-ocr-fra` (same layer, still non-root).
- [ ] README Assumptions: external tools used when present, PDFBox/vision fallback, OCR French, rebuild needed for `make dev`.
- [ ] If Docker is available: `docker build -t hoe-backend-test backend` then `pdftotext -v` inside the image → PASS (report image size). If not, state it as unverified.

## Task 8 — Gates (lead + reviewer)

- [ ] `cd backend && ./mvnw -B test`
- [ ] `cd frontend && npm run typecheck && npm test && npm run build` (no frontend change expected)
- [ ] Reviewer on the combined diff; money path and LLM path force the review.
