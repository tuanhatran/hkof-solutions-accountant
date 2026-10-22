# Agents FraisOcc

Découpage issu de « Méthode de travail pour les agents » (`product_prompt.md`). Sept agents, un par bloc, plus un orchestrateur implicite (l'agent principal).

| Ordre | Agent | Périmètre | Dépend de |
|---|---|---|---|
| 0 | `fraisocc-orchestrateur` | plan, contrat OpenAPI, arbitrages | — |
| 1 | `fraisocc-infra` | Compose, Dockerfiles, CI, Makefile | contrat |
| 2 | `fraisocc-domaine` | entités, Flyway, calculs, tests | contrat |
| 3 | `fraisocc-pdf-templates` | rendu, validation, aperçu, fusion | domaine |
| 4 | `fraisocc-llm` | Ollama, extraction, jobs, admin LLM | domaine |
| 5 | `fraisocc-front-generer` | page Générer, aperçu PDF, IA | contrat + backend |
| 6 | `fraisocc-front-admin` | Admin, Templates, Configuration, Historique | contrat + backend |
| 7 | `fraisocc-e2e` | Cypress, mock-ollama, fixtures | tout |

## Contrat

- `openapi/openapi.yaml` est la source de vérité entre backend et frontend.
- Les types frontend sont produits par `npm run gen:api` (`openapi-typescript`).
- Le backend ne modifie pas silencieusement le contrat : tout écart est signalé et répercuté dans le YAML et les types générés.
- Les montants sont des chaînes décimales (`"123.45"`) ou des centimes entiers, jamais des flottants JSON.

## Utilisation

Chaque fichier `.md` est autonome : il peut être chargé comme prompt d'un sous-agent. L'agent principal orchestre, vérifie les interfaces et exécute les tests d'intégration. Les agents n'accèdent jamais au LLM réel dans les tests automatisés : `mock-ollama` est déterministe.

## Décisions d'implémentation partagées

- Package backend : `fr.hkof.fraisocc`.
- Un seul template actif par type ; une seule version active par mois et par document.
- Date/heure en `Europe/Paris` pour l'affichage, stockage `Instant`/`LocalDate`.
- Les PDF d'aperçu ne touchent jamais la base (aucune écriture) et portent le filigrane « APERÇU ».
- Les templates intégrés sont livrés en HTML + CSS, rendus par Mustache (logic-less) et OpenHTMLToPDF.
