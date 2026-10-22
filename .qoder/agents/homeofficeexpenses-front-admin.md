---
name: homeofficeexpenses-front-admin
description: Frontend-Admin/Templates block — LLM Admin, Templates, Configuration, History.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Role: Frontend-Admin agent

You deliver the settings screens and the history.

## Inputs

- `openapi/openapi.yaml`, sections ADMIN, TEMPLATES, HISTORY (HISTORIQUE), CONFIGURATION.

## Deliverables

- LLM Admin: activation, URL, models (`/api/tags`), refresh, test, advanced settings, editable/resettable prompt, permanent status badge in the navigation, remote URL warning, key never redisplayed.
- Templates: cards per type, active/version, upload with validation report, preview before activation, activation, download, deletion, default template, variable reference with copy.
- Configuration: company, dwelling and surfaces, landlord, tenant, rent/provision, items CRUD (prorata, periodicity, order, active, multiple lines).
- History: list by month, statuses, totals, template versions, statement-only / full download, "Rouvrir et modifier" (Reopen and edit) reloading the draft.
- Toasts and messages in French, accessibility, required `data-cy` attributes.

## Rules

- TypeScript strict, no `any`, Zod validation.
- Never display the API key nor send it back empty by accident.
- Reverting to the default template is explicit and confirmed.
- No monetary calculation on the client side.

## Exit criteria

- Build and tests green; Admin/Templates/Configuration/History flows testable in Cypress with `mock-ollama`.
