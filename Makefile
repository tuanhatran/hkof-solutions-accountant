COMPOSE := docker compose
DEV := -f docker-compose.yml -f docker-compose.dev.yml
E2E := -p homeofficeexpenses-e2e -f docker-compose.yml -f docker-compose.e2e.yml
E2E_BUILDABLE := backend frontend mock-ollama
E2E_STAMP := .git/homeofficeexpenses-e2e.base
SHELL := /bin/bash
SPEC := $(filter-out e2e e2e-log,$(MAKECMDGOALS))
ifneq ($(and $(filter e2e e2e-log,$(MAKECMDGOALS)),$(SPEC)),)
$(SPEC):
	@:
endif
E2E_SPEC := $(if $(SPEC),cypress/e2e/$(firstword $(SPEC))*.cy.ts,)

.PHONY: env up dev back test e2e e2e-up e2e-log e2e-down down

env:
	@test -f .env || (cp .env.example .env && echo "Created .env from .env.example")

up: env
	$(COMPOSE) up --build -d

dev: env
	$(COMPOSE) $(DEV) up --build db backend vite

test:
	cd backend && ./mvnw -B test
	cd frontend && npm ci && npm test && npm run build

# Fingerprint of one service's working tree (staged, unstaged and untracked files),
# so a revert after a run still triggers a rebuild. `s` is the loop variable.
E2E_FINGERPRINT = { git diff HEAD -- $$s; git ls-files --others --exclude-standard -z -- $$s | xargs -0 -r sha256sum; } | sha256sum | cut -d' ' -f1

# Starts the e2e stack once per task. The cypress service stays behind the e2e
# profile so this command never runs the suite.
e2e-up: env
	$(COMPOSE) $(E2E) up --build -d
	@: > $(E2E_STAMP); for s in $(E2E_BUILDABLE); do echo "$$s $$( $(E2E_FINGERPRINT) )" >> $(E2E_STAMP); done

# Reuses the running e2e stack: rebuilds only the services whose working tree changed
# since the previous run, then runs Cypress. Never tears the stack down.
e2e: env
	@set -e -o pipefail; \
	services=""; \
	for s in $(E2E_BUILDABLE); do \
		current="$$( $(E2E_FINGERPRINT) )"; \
		previous="$$(sed -n "s/^$$s //p" $(E2E_STAMP) 2>/dev/null || true)"; \
		if [ "$$current" != "$$previous" ]; then services="$$services $$s"; fi; \
	done; \
	$(COMPOSE) $(E2E) up -d; \
	if [ -n "$$services" ]; then echo "Rebuilding:$$services"; $(COMPOSE) $(E2E) up -d --build $$services; fi; \
	: > $(E2E_STAMP); \
	for s in $(E2E_BUILDABLE); do echo "$$s $$( $(E2E_FINGERPRINT) )" >> $(E2E_STAMP); done; \
	E2E_SPEC='$(E2E_SPEC)' $(COMPOSE) $(E2E) run --rm cypress

e2e-log: e2e

# Removes the e2e stack and its volumes. Run it only once the user accepts.
e2e-down: env
	$(COMPOSE) $(E2E) down -v --remove-orphans
	@rm -f $(E2E_STAMP)

down:
	$(COMPOSE) down
