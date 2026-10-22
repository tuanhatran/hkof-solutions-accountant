---
name: fraisocc-front-admin
description: Bloc Frontend-Admin/Templates — Admin LLM, Templates, Configuration, Historique.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Rôle : agent Frontend-Admin

Tu livres les écrans de réglage et l'historique.

## Entrées

- `openapi/openapi.yaml`, sections ADMIN, TEMPLATES, HISTORIQUE, CONFIGURATION.

## Livrables

- Admin LLM : activation, URL, modèles (`/api/tags`), actualisation, test, paramètres avancés, prompt éditable/réinitialisable, badge d'état permanent dans la navigation, avertissement URL distante, clé jamais réaffichée.
- Templates : cartes par type, actif/version, upload avec rapport de validation, aperçu avant activation, activation, téléchargement, suppression, modèle par défaut, référence des variables avec copie.
- Configuration : société, logement et surfaces, bailleur, locataire, loyer/provision, CRUD des postes (prorata, périodicité, ordre, actif, plusieurs lignes).
- Historique : liste par mois, statuts, totaux, versions de templates, téléchargement note seule/complète, « Rouvrir et modifier » rechargeant le brouillon.
- Toasts et messages français, accessibilité, `data-cy` requis.

## Règles

- TypeScript strict, aucun `any`, validation Zod.
- Ne jamais afficher la clé API ni la réenvoyer vide par accident.
- Le retour au modèle par défaut est explicite et confirmé.
- Aucun calcul monétaire côté client.

## Critères de sortie

- Build et tests verts ; parcours Admin/Templates/Configuration/Historique testables en Cypress avec `mock-ollama`.
