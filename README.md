# HomeOfficeExpenses

Personal local application for rent receipts (quittances de loyer) and home-office expense statements (notes de frais d'occupation). The application is in French. Amounts are in euros and dates use DD/MM/YYYY.

An LLM (Ollama) can propose values extracted from invoices. It never computes amounts: every monetary calculation is done by the backend, and the user validates each proposed value. The application remains fully usable without an LLM.

## Stack

- Backend: Java 25, Spring Boot 4.1, Flyway, PostgreSQL 17, OpenHTMLToPDF / PDFBox
- Frontend: React 19, TypeScript, Vite, Vitest, Cypress
- LLM: Ollama (local), with a deterministic `mock-ollama` for tests
- Deployment: Docker Compose, nginx

## Prerequisites

- Docker Engine or Docker Desktop with Docker Compose v2.24.4 or later
- GNU Make (optional, for the shortcuts)
- Ollama on the host, or the Compose `ollama` profile (see below)

## Installation

```bash
cp .env.example .env        # then edit DB_PASSWORD at least
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). The port is set by `FRONTEND_PORT` in `.env`.

Equivalent shortcut: `make up`.

To stop the stack: `docker compose down` (or `make down`). Data is kept in the `pgdata` volume and in `./data`.

## Configuration

All settings live in `.env` (git-ignored). The template is [.env.example](.env.example).

| Variable                            | Default                             | Purpose                                                            |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| `FRONTEND_PORT`                     | `8080`                              | Host port of the web application                                   |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | (required)                          | PostgreSQL credentials; compose refuses to start if unset          |
| `OLLAMA_BASE_URL`                   | `http://host.docker.internal:11434` | Ollama endpoint as seen from the backend container                 |
| `OLLAMA_MODEL`                      | `qwen2.5:7b`                        | Model used for extraction                                          |
| `WITH_LIBREOFFICE`                  | `false`                             | Build the backend image with LibreOffice (DOCX templates, phase 2) |
| `BACKEND_PORT`, `DB_PORT`           | `8081`, `5432`                      | Host ports, used by the development overlay only                   |

## Ollama configuration

The backend reaches Ollama over HTTP. Choose one of the two options.

### Option A: Ollama on the host (default)

1. Install Ollama from [ollama.com](https://ollama.com).
2. On Linux, Ollama must listen on all interfaces so containers can reach it. Set `OLLAMA_HOST=0.0.0.0` in the Ollama service (for systemd: `sudo systemctl edit ollama.service`, add `[Service]` and `Environment="OLLAMA_HOST=0.0.0.0"`, then `sudo systemctl restart ollama`).
3. Pull the model:

   ```bash
   ollama pull qwen2.5:7b
   ```

4. Keep `OLLAMA_BASE_URL=http://host.docker.internal:11434` in `.env`. The compose file maps `host.docker.internal` to the host gateway on Linux.

### Option B: Ollama in Compose

```bash
# .env
OLLAMA_BASE_URL=http://ollama:11434

docker compose --profile ollama up --build -d
docker compose exec ollama ollama pull qwen2.5:7b
```

The model cache is stored in the `ollama_data` volume. For GPU use on NVIDIA hosts, uncomment the `deploy` block of the `ollama` service in [docker-compose.yml](docker-compose.yml).

## Usage

1. Open the application and review the settings (LLM configuration, expense items, templates). Defaults are seeded at first start.
2. Create a rent receipt (quittance) or a home-office expense statement.
3. Upload supporting documents (invoices). The LLM proposes values; check and correct them before validating.
4. Generate the PDF. The preview, the on-screen total and the final PDF come from the same backend calculation.

Previous versions of documents are never overwritten: deletion is logical.

## Authentication and User Accounts

The application scopes documents, templates, leases and expense statements per user account.

### Default Seed Account

A default account is seeded automatically on first startup:

- **Email:** `thtran@homeofficeexpenses.local`
- **Password:** `thtran`

### Creating a New Account (Sign Up)

1. **Sign up**: Go to `/login` (or `/confirmer-email`), switch to registration mode and enter your email and a password (not blank, at most 100 characters).
   - Via API: `POST /api/auth/register` with `{"email":"...","password":"..."}` (returns `204 No Content`).
2. **Confirm email**: A confirmation link with a token is sent by email.
   - In local/Docker development (`make up` or `make dev`), incoming emails are captured by **Mailpit** at [http://localhost:8025](http://localhost:8025).
   - Click the confirmation link in Mailpit, or open `http://localhost:5173/confirmer-email?token=<TOKEN>`.
   - Via API: `POST /api/auth/confirm-email` with `{"token":"..."}` (returns `204 No Content`).
3. **Log in**: Once confirmed, sign in with your email and password at `/login` or via `POST /api/auth/login`.

## Development

```bash
make dev
```

This starts PostgreSQL, the backend (host port `BACKEND_PORT`) and Vite on [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the backend.

## Tests

```bash
make test
```

This runs the backend tests (`backend/mvnw test`), the frontend unit tests (`npm test`) and the frontend build.

End-to-end tests (Cypress against the full stack, with `mock-ollama` and an ephemeral database):

```bash
make e2e-up        # build and start the e2e stack once per task
make e2e           # rebuild changed services, run the Cypress suite
make e2e 00-settings   # run one spec (prefix match)
make e2e-down      # remove the stack and its volumes, once the change is accepted
```

`make e2e` reuses the running stack, rebuilds only `backend`, `frontend` or `mock-ollama` when
their files changed since the previous run, and never tears the stack down. The Compose project
(`homeofficeexpenses-e2e`) never touches `./data` or `pgdata`; volumes are removed by
`make e2e-down` only. The exit code is the Cypress result.

## Backup and restore

| Data                                 | Location             | Backup                                                                                |
| ------------------------------------ | -------------------- | ------------------------------------------------------------------------------------- |
| Database                             | `pgdata` volume      | `docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > backup-$(date +%F).sql` |
| Justificatifs, statements, templates | `./data`             | `tar czf data-$(date +%F).tar.gz data/`                                               |
| Ollama models (optional)             | `ollama_data` volume | Re-pull with `ollama pull`, or back up the volume                                     |

Restore the database with `docker compose exec -T db psql -U "$DB_USER" "$DB_NAME" < backup.sql` on a fresh stack. Restore `./data` by extracting the archive at the repository root while the stack is stopped.

## Sample data and demo files

- [backend/sample-facture.txt](backend/sample-facture.txt): sample EDF gas invoice (total 78,00 EUR).
- [frontend/cypress/fixtures/](frontend/cypress/fixtures/): invoices for the e2e scenarios (electricity, gas, fibre, telephone, insurance, and invalid or hostile cases), and valid and invalid HTML templates.
- [backend/src/main/resources/templates/defaut/](backend/src/main/resources/templates/defaut/): default templates for the rent receipt (`quittance.html`) and the expense statement (`note-frais.html`).

Templates are logic-less Mustache, sanitized HTML. Scripts and remote resources are not allowed.

## Repository layout

```
backend/            Spring Boot API, Dockerfile, tests
frontend/           React application, Dockerfile, nginx.conf, Cypress tests
mock-ollama/        Deterministic Ollama stand-in for tests
openapi/            API contract (openapi.yaml)
docker-compose.yml          Base stack
docker-compose.dev.yml      Development overlay
docker-compose.e2e.yml      End-to-end overlay
Makefile                    Shortcuts: up, dev, test, e2e-up, e2e, e2e-down, down
.github/workflows/ci.yml    CI: backend, frontend, e2e
```

## Assumptions

- Single-user, local deployment on a personal machine. The application is not exposed to the internet.
- Ollama runs on the host by default. Linux hosts must set `OLLAMA_HOST=0.0.0.0`.
- The default model is `qwen2.5:7b`. The LLM output is untrusted: it is constrained JSON validated server-side and is never applied without user validation.
- `./data` is a bind mount. The `data-init` service sets ownership to uid 10001, the non-root backend user, on each start.
- Docker Compose v2.24.4 or later is required for the `!reset` and `!override` merge tags used by the e2e overlay.
- The Cypress container runs as root, so files written to `frontend/cypress/screenshots` and `frontend/cypress/videos` may be owned by root on the host.
- LibreOffice is not included by default (`WITH_LIBREOFFICE=false`) because DOCX templates belong to phase 2.
- `openapi/openapi.yaml` is the API contract. Its changes are reported explicitly.
- Landlords, tenants and leases are separate directories. A lease binds one landlord, one tenant, the property address, the rent excluding charges and the charges advance; one active lease per couple (partial unique index on the non-deleted rows). Rent receipts record the selected pair; versions are per pair and every generation adds a new ACTIVE receipt, so several receipts can be active in the same month, including for the same pair.
- Landlord signatures are linked to a landlord. The generate page only offers the selected landlord's signatures plus legacy unlinked ones; an unlinked signature remains a fallback for existing data.
- The fresh-database initializer and `POST /api/e2e/reset` seed one landlord, one tenant and one active lease with the default home address and the default rent/charges. These values no longer live in `/api/settings`.
- Text extraction prefers the external `pdftotext` (poppler) with `-layout`, so columns and amounts stay aligned for the LLM. OCR uses `tesseract` with the French language pack (`fra`) for PDFs without a text layer. The backend image installs `poppler-utils`, `tesseract-ocr` and `tesseract-ocr-fra`; a local `make dev` run uses the host binaries when they are present.
- Missing external tools never fail an analysis: `pdftotext` failures, timeouts or empty output fall back to PDFBox, and a missing or failing OCR keeps the existing vision-image path sent to the LLM. The tools are configured by the `analysis.pdftext.*` and `analysis.ocr.*` properties (`ANALYSIS_PDFTEXT_COMMAND`, `ANALYSIS_PDFTEXT_TIMEOUT`, `ANALYSIS_OCR_ENABLED`, `ANALYSIS_OCR_COMMAND`, `ANALYSIS_OCR_LANGUAGE`, `ANALYSIS_OCR_TIMEOUT_PER_PAGE`).
- Rebuild the backend image (`docker compose build backend` or `make up`) to pick up the new runtime packages.
- The application is multi-company. Each company owns its expense items and statements, its home-office data and its issue place. A rent receipt takes its company from its lease only: a person lease has none and prints the landlord's issue place after « Fait à ». A note de frais chooses its company in the page header, with no persisted global selection: a single company is applied, several require an explicit choice, and the Settings company selection stays local to the page. A lease may optionally link to a company.
- Employees belong to one company and carry a descriptive title (`CEO`, `CFO`, `ACCOUNTANT`, `EMPLOYEE`). Signatures attach to an employee; landlord signatures remain attached to a landlord.
- RBAC is documented but not implemented: there is no authentication or authorization. The target matrix (CEO/CFO/accountant edit and export expense reports) lives in `product_prompt.md`; a future task enforces it.
- Existing data is migrated into company 1; the former `settings` row is preserved as `settings_legacy` and `/api/settings` is removed.
