---
name: Frontend delivery
description: Use when implementing or fixing a React/TypeScript screen or component in HomeOfficeExpenses - form, query hook, dropzone, PDF preview, admin page, history. Enforces strict typing, backend-authoritative amounts and French UI text.
---

# Frontend delivery

## Before writing code

1. Read the relevant part of `product_prompt.md`.
2. Confirm the API shape in `openapi/openapi.yaml` and the generated
   `frontend/src/api/schema.ts`.
3. Write the failing Vitest test when the change has logic or a user flow.
4. Implement.

## Data flow

- Every HTTP call goes through `frontend/src/api/endpoints.ts`.
- Query hooks and keys live in `frontend/src/api/queries.ts`.
- Invalidate with `queryKeys` constants, never string literals. Use a prefix key
  (for example `queryKeys.expenseItemsAll`) when several variants exist.
- Use TanStack Query for server state; Zustand only for local draft state.
- Never compute an authoritative amount on the client. An instant estimate is allowed,
  then the backend response is authoritative.
- API amounts are strings. Use `parseAmount`, `parsePercentage`, `formatEUR`,
  `formatDate`, `formatMonth`, `formatPeriod` from `frontend/src/lib/`.
- Use `estimateAllocation` only for immediate feedback, never as the final total.

## Forms

- React Hook Form + Zod schemas in `frontend/src/lib/validation.ts`.
- Accept both `80,50` and `80.50`; normalize before validation.
- Prorata accepts `35,71`, `35.71`, `35,71 %`, `50 %`, bounded 0 to 100, two decimals max.
- Show field errors below the field, in French.
- Feedback goes through `toast` from `frontend/src/state/toasts.ts`.
- Disable submit while pending; keep user input on failure.

## UI quality

- TypeScript strict, no `any`, no non-null assertion used to silence a real case.
- Loading, error and empty states are mandatory (`components/States.tsx`).
- French labels, messages and toasts.
- Accessibility: associated labels, keyboard navigation including the dropzone,
  `aria-live` for the total, analysis status and errors.
- Use the `data-cy` attributes listed in the specification; never style selectors.
- Responsive: below 1024 px the two panels become tabs with an update badge.

## PDF preview

- Use `react-pdf`, never an iframe.
- Debounce 400 ms, cancel the previous request with `AbortController`.
- Keep the previous preview visible under a loading veil, no flicker.
- The preview persists nothing; only the generate action saves.

## Tests

- Vitest in `src/**/*.test.ts(x)`, setup `src/test/setup.ts`.
- Cover parsers, formatting, table edits, polling, debounce/cancellation, responsive switch.
- Use Testing Library queries a user would use; assert on visible French text.

## Definition of done

```bash
cd frontend && npm run typecheck && npm test && npm run build
```

A build with warnings that fail CI, an `any`, or a failing test blocks delivery.
