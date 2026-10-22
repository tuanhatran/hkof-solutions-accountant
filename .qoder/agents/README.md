# HomeOfficeExpenses agents

Breakdown derived from "Working method for agents" (`product_prompt.md`). Seven agents, one per block, plus an implicit orchestrator (the main agent).

| Order | Agent | Scope | Depends on |
|---|---|---|---|
| 0 | `homeofficeexpenses-orchestrateur` | plan, OpenAPI contract, decisions | — |
| 1 | `homeofficeexpenses-infra` | Compose, Dockerfiles, CI, Makefile | contract |
| 2 | `homeofficeexpenses-domaine` | entities, Flyway, calculations, tests | contract |
| 3 | `homeofficeexpenses-pdf-templates` | rendering, validation, preview, merge | domain |
| 4 | `homeofficeexpenses-llm` | Ollama, extraction, jobs, LLM admin | domain |
| 5 | `homeofficeexpenses-front-generer` | Generate page, PDF preview, AI | contract + backend |
| 6 | `homeofficeexpenses-front-admin` | Admin, Templates, Configuration, History | contract + backend |
| 7 | `homeofficeexpenses-e2e` | Cypress, mock-ollama, fixtures | everything |

## Contract

- `openapi/openapi.yaml` is the source of truth between backend and frontend.
- Frontend types are produced by `npm run gen:api` (`openapi-typescript`).
- The backend does not silently change the contract: any deviation is reported and carried through to the YAML and the generated types.
- Amounts are decimal strings (`"123.45"`) or integer cents, never JSON floats.

## Usage

Each `.md` file is self-contained: it can be loaded as the prompt of a sub-agent. The main agent orchestrates, checks interfaces and runs integration tests. Agents never access the real LLM in automated tests: `mock-ollama` is deterministic.

## Shared implementation decisions

- Backend package: `fr.hkof.homeofficeexpenses`.
- A single active template per type; a single active version per month and per document.
- Date/time in `Europe/Paris` for display, storage as `Instant`/`LocalDate`.
- Preview PDFs never touch the database (no writes) and carry the watermark "APERÇU" (PREVIEW).
- Built-in templates are delivered as HTML + CSS, rendered by Mustache (logic-less) and OpenHTMLToPDF.
