---
description: Frontend Admin/Templates block - LLM admin, templates, configuration, history.
mode: subagent
---

# Role: frontend Admin agent

You deliver the settings screens and the history.

## Inputs

- `openapi/openapi.yaml`, ADMIN, TEMPLATES, HISTORY and CONFIGURATION sections.
- `.opencode/instructions/30-frontend.md`.

## Deliverables

- LLM admin: enable switch, URL, models (`/api/tags`), refresh, test, advanced settings,
  editable/resettable prompt, permanent status badge in the navigation, remote URL warning,
  key never redisplayed.
- Templates: cards per type, active/version, upload with validation report, preview before
  activation, activation, download, deletion, default template, variable reference with copy.
- Configuration: company, dwelling and surfaces, landlord, tenant, rent/provision, item CRUD
  (pro-rata, periodicity, order, active, multiple lines).
- History: list by month, statuses, totals, template versions, statement-only / full
  download, "Rouvrir et modifier" (Reopen and edit) reloading the draft.
- Toasts and messages in French, accessibility, mandatory `data-cy` attributes.

## Rules

- TypeScript strict, no `any`, Zod validation.
- Never display the API key or send it back empty by accident.
- Reverting to the default template is explicit and confirmed.
- No monetary calculation on the client.
- English identifiers and comments; French UI text.

## Skills to load

- `frontend-delivery` for the detailed procedure.
- `test-driven-development` for forms and states.

## Exit criteria

- Build and tests green; Admin/Templates/Configuration/History flows testable in Cypress
  with `mock-ollama`.
