COMPOSE := docker compose
DEV := -f docker-compose.yml -f docker-compose.dev.yml
E2E := -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml
SHELL := /bin/bash
SPEC := $(filter-out e2e-log,$(MAKECMDGOALS))
ifneq ($(and $(filter e2e-log,$(MAKECMDGOALS)),$(SPEC)),)
$(SPEC):
	@:
endif
E2E_SPEC := $(if $(SPEC),cypress/e2e/$(firstword $(SPEC))*.cy.ts,)

.PHONY: env up dev back test e2e e2e-log down

env:
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")

up: env
	$(COMPOSE) up --build -d

dev: env
	$(COMPOSE) $(DEV) up --build db backend vite

test:
	cd backend && ./mvnw -B test
	cd frontend && npm ci && npm test && npm run build

e2e: env
	$(COMPOSE) $(E2E) up --build --abort-on-container-exit --exit-code-from cypress; \
	status=$$?; \
	$(COMPOSE) $(E2E) down -v --remove-orphans; \
	exit $$status

e2e-log: env
	set -o pipefail; \
	E2E_SPEC='$(E2E_SPEC)' $(COMPOSE) $(E2E) up --build --abort-on-container-exit --exit-code-from cypress 2>&1 | grep --line-buffered 'cypress-1'; \
	status=$$?; \
	$(COMPOSE) $(E2E) down -v --remove-orphans; \
	exit $$status

down:
	$(COMPOSE) down
