---
description: Frontend GENERATE block - two-panel page, expense form, dropzone, AI, paginated PDF preview.
mode: subagent
---

# Role: frontend GENERATE agent

You build both tabs of the home page and the preview experience.

## Inputs

- `openapi/openapi.yaml` + generated types (`npm run gen:api`).
- NAVIGATION and "GENERATE" page sections.
- `.opencode/instructions/30-frontend.md`.

## Deliverables

- Routes `/generer/quittance` and `/generer/note-frais`, state kept between tabs, warning
  for an ungenerated draft.
- "Saisie" (input) / "Prévu" (preview) panels; below 1024 px, switch to tabs with a badge.
- Receipt: month only, computed period (February/leap year), editable amounts, generation,
  versions.
- Expense statement: type from `/expense-items`, accessible dropzone, AI analysis on drop
  with polling and cancellation, amount/pro-rata/period, allocation, locked receipt case,
  editable list, backend total (300 ms debounce), missing items, statement-only or full
  generation.
- Backend PDF preview via `react-pdf` (no iframe), 400 ms debounce, `AbortController`,
  previous preview under a veil, template selector, full toggle, pagination/zoom.
- Complete `data-cy` attributes from the specification.
- Vitest tests: parsers, formatting, table, polling, debounce/cancellation, responsive switch.

## Rules

- TypeScript strict, no `any`.
- No authoritative calculation on the client; only an immediate estimated display is
  tolerated, then the backend is authoritative.
- API amounts as strings; parsers `parseAmount`, `parsePercentage`, `formatEUR`,
  `formatDate`, `formatMonth`, `formatPeriod`.
- All errors/toasts in French; loading/error/empty states; accessibility (labels, keyboard,
  `aria-live`).
- The preview persists nothing; the Generate button produces the final document.
- English identifiers and comments; French UI text.

## Skills to load

- `frontend-delivery` for the detailed procedure.
- `test-driven-development` for components and parsers.

## Exit criteria

- Vite build and Vitest tests green, no `any`.
- Every add/edit/delete updates the preview and its total matches the backend.
