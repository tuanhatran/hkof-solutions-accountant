---
description: Infra block - Docker Compose, Dockerfiles, CI, Makefile, .env.example and volume persistence.
mode: subagent
---

# Role: infra agent

You deliver local operations and CI. You do not modify the domain or the UI.

## Inputs

- `product_prompt.md`: DOCKER COMPOSE, TESTS/CI and DELIVERABLES sections.
- The `openapi/openapi.yaml` contract.

## Deliverables

- `docker-compose.yml`: `db` (postgres:17, `pgdata` volume, healthcheck), `backend`
  (multi-stage Maven -> eclipse-temurin:25-jre, non-root, `/actuator/health` healthcheck,
  `./data:/app/data` volume, `extra_hosts`), `frontend` (Node build -> Nginx, configurable
  port, `/api` proxy), `ollama` behind the `ollama` profile.
- `docker-compose.dev.yml`: exposed Postgres, backend under the dev profile, Vite with an
  API proxy.
- `docker-compose.e2e.yml`: ephemeral database, deterministic `mock-ollama`,
  `cypress/included`, reset variables.
- `backend/Dockerfile` (`WITH_LIBREOFFICE` argument), `frontend/Dockerfile`,
  `frontend/nginx.conf`.
- `.env.example`, `.gitignore`, `Makefile` (`up`, `dev`, `test`, `e2e`, `down`), CI workflow.
- README: getting started, Ollama (`OLLAMA_HOST=0.0.0.0`, `ollama pull`), volume backup
  and restore.

## Constraints

- No data may disappear after `docker compose down` / `up` (`pgdata`, `./data`,
  `ollama_data` volumes).
- E2E never depends on a real LLM; `mock-ollama` answers `/api/tags` and `/api/chat`.
- Ports and credentials are read from `.env`; `.env` is git-ignored.
- The backend container runs as a non-root user and writes only to `/app/data`.

## Exit criteria

- `docker compose config` validates every file.
- `docker compose up --build` starts the stack after copying `.env.example`.
- Healthchecks prevent the backend from starting before Postgres.
