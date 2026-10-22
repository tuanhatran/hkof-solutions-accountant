---
name: PDF and templates
description: Use when working on HomeOfficeExpenses PDF generation, Mustache templates, upload validation, watermarked preview, template versioning or supporting-document merging.
---

# PDF and templates

## Security model

- User templates are untrusted input.
- Rendering engine: logic-less Mustache (JMustache). Never execute Thymeleaf, SpEL or
  any expression from a user file.
- HTML is sanitized before rendering.
- Reject `<script>`, `on*` handlers, `th:*`, `#{...}`, remote resources, `file://`,
  `../` and absolute paths.
- No network access during rendering.
- Templates calculate nothing: the service sends already formatted French amounts.

## Rendering pipeline

1. Build the view model in the service layer (no repository access inside the engine).
2. Render the active template with Mustache.
3. Convert HTML to PDF with OpenHTMLToPDF, embedded fonts, A4.
4. Add the "APERÇU" watermark with PDFBox for a preview.
5. Merge attachments with PDFBox when the full document is requested:
   the month's receipt, then each supporting document; images are converted to an A4 page.

Existing classes: `service/template/TemplateService`, `TemplateCatalog`,
`TemplateDataService`, `service/PdfService`.

## Preview rules

- The preview persists nothing: no database write, no stored file.
- It uses exactly the same calculation and data as the final PDF.
- A missing required field flags the empty area; it is not a blocking error.
- Watermark previews only; the generated PDF has no watermark.
- The total in the preview must equal the total returned by the calculation endpoint.

## Upload validation

- Maximum size: follow the specification (5 MB for templates, 10 MB for supporting
  documents) and the existing constants.
- Verify the real MIME type, not the file extension.
- Validate the structure and produce a report:
  - recognized variables,
  - unknown variables,
  - required variables that are missing,
  - rejected constructs with a clear French message.
- DOCX without macros; convert or reject as specified.

## Versioning

- One active template per document type.
- Upload creates a candidate version; activation is explicit.
- Logical deletion only; a previous version is never overwritten.
- Generated PDFs keep the reference to the template version they used.
- Reverting to the built-in template is explicit, confirmed and restores the default.

## Tests

- Validation: scripts, expressions, unknown and missing variables, oversize file,
  wrong MIME type, path traversal.
- Rendering: accents and the € symbol, pagination, no blank page.
- Watermark presence in preview and absence in the final file.
- Merge order and image conversion.
- Preview total identical to the calculation endpoint.

## Definition of done

```bash
cd backend && ./mvnw -B test
```

Open the produced PDF when the change affects layout; automated tests alone do not prove
visual correctness.
