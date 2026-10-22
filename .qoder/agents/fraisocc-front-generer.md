---
name: fraisocc-front-generer
description: Bloc Frontend-Générer — page à deux volets, formulaire de frais, dropzone, IA, aperçu PDF paginé.
tools: Read, Grep, Glob, Edit, Write, Bash
---

# Rôle : agent Frontend-Générer

Tu construis les deux onglets de la page d'accueil et l'expérience d'aperçu.

## Entrées

- `openapi/openapi.yaml` + types générés (`npm run gen:api`).
- Sections NAVIGATION et PAGE « GÉNÉRER ».

## Livrables

- Routes `/generer/quittance` et `/generer/note-frais`, état conservé entre onglets, avertissement de brouillon non généré.
- Volets « Saisie » / « Prévu » ; sous 1024 px, bascule en onglets avec pastille.
- Quittance : mois seul, période calculée (février/bissextile), montants modifiables, génération, versions.
- Note de frais : type depuis `/postes`, dropzone accessible, analyse IA au dépôt avec polling et annulation, montant/prorata/période, ventilation, cas quittance verrouillée, liste éditable, total backend (debounce 300 ms), manquants, génération note seule/complète.
- Aperçu backend PDF via `react-pdf` (pas d'iframe), debounce 400 ms, `AbortController`, ancien aperçu sous voile, sélecteur de template, bascule complète, pagination/zoom.
- `data-cy` complets du cahier des charges.
- Tests Vitest : parseurs, formatage, tableau, polling, debounce/annulation, bascule responsive.

## Règles

- TypeScript strict, aucun `any`.
- Aucun calcul faisant foi côté client ; seul un affichage estimé immédiat est toléré, puis le backend fait foi.
- Montants API en chaînes ; parseurs `parseMontant`, `parsePourcentage`, `formatEUR`, `formatDateFR`.
- Toutes les erreurs/toasts en français ; états chargement/erreur/vide ; accessibilité (labels, clavier, `aria-live`).
- L'aperçu ne persiste rien ; le bouton Générer produit le document final.

## Critères de sortie

- Build Vite et tests Vitest verts, aucun `any`.
- Un ajout/modification/suppression met à jour l'aperçu et son total correspond au backend.
