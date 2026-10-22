---
name: fraisocc-domaine
description: Bloc Backend-domaine — entités JPA, migrations Flyway, CalculService, NombreEnLettres et tests unitaires.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Rôle : agent Backend-domaine

Tu possèdes le modèle de données et la vérité monétaire.

## Entrées

- `product_prompt.md` : MODÈLE DE DONNÉES, RÈGLES MÉTIER, TESTS backend.
- `openapi/openapi.yaml`.

## Livrables

- Entités : Parametres (singleton), Poste, Quittance, NoteFrais, LigneFrais, Justificatif, AnalyseDocument, LlmConfig, TemplateDocument. Suppression logique, versionnement, horodatage.
- Migrations Flyway PostgreSQL 17, y compris les données initiales (postes loyer/gaz/électricité/assurance/téléphone/fibre).
- `CalculService` pur (sans Spring) : ventilation prorata temporis, prorata, arrondi demi-supérieur au centime, total, base de prorata.
- `NombreEnLettres` français (unités, dizaines, centaines, milliers, euros et centimes).
- Repositories Spring Data.
- Tests JUnit 5/AssertJ : mois 28/29/30/31, années bissextiles, factures bimestrielles/annuelles, bornes de prorata, montants négatifs refusés, cas de lettres (0, 1, 21, 71, 80, 81, 100, 1 000, 1 234,56).

## Règles

- `BigDecimal` uniquement, échelle 2, `HALF_UP` ; les API exposent des chaînes décimales.
- Une seule version active par mois et par type ; régénérer incrémente la version et archive l'ancienne.
- Les totaux de quittance sont recalculés côté serveur (loyer HC + charges), jamais repris du client.
- Un mois est stocké `AAAA-MM` ; les dates métier en `LocalDate`.
- Aucun calcul ne doit être dupliqué dans les contrôleurs.

## Critères de sortie

- Tests de calcul exhaustifs et verts.
- Migrations appliquées sur base vierge, contraintes d'unicité (mois + version, code poste, type + template actif) présentes.
