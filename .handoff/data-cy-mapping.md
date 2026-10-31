# data-cy FR → EN migration — shared dictionary

Shared by tasks 49-53 (`.handoff/tasks/`). Every task applies the same vocabulary so the
five diffs compose into one coherent set of hooks.

## Rules

1. Rename `data-cy` values only: suppliers (`data-cy="…"`, `dataCy="…"`, `data-cy={`…${x}`}`)
   and consumers (`[data-cy="…"]`, `cy.get('[data-cy="…"]')`). No behaviour, CSS or UI text change.
2. Segments split on `-`. Keep unchanged: numbers, ids, months, item codes (`loyer`, `gaz`,
   `electricite`, `telephone`, `internet_pro`), `llm`, `pdg`, `siren`, `email`, `template`,
   `prorata`, `admin`, `lmnp`, `ttc`, `tab`, `btn`, `input`, `select`, `dropzone`, `badge`, `toast`.
3. Dynamic parts stay verbatim: `${lease.id}`, `${person.id}`, `${expense.itemCode}`, `2026-01`.
4. Prefixes owned by a component: `dialogue-`→`dialog-`, `onglet-`→`tab-`, `filtre-`→`filter-`,
   `tri-`→`sort-`, `entetes-`→`headers-`, `alerte-`→`alert-`, `aucun-`/`aucune-`→`no-`,
   `groupe-`→`group-`, `formulaire-`→`form-`, `liste-`→`list-`, `ligne-`→`line-`.
5. A task renames only the literals its handoff lists; a literal belongs to the task that owns
   its producing component, and every file mentioning that literal is updated in the same task.

## Word order (tasks 66-69)

Semantic English: adjectives before nouns (`societe-active`→`active-company`,
`total-retenu`→`retained-total`); possessor before possessed (`quittance-bail`→`lease-rent-receipt`,
`apercu-template`→`template-preview`, `liste-frais`→`expense-list`, `entetes-versions-modele`→
`template-versions-headers`, `rapport-validation-template`→`template-validation-report`).
Kept segments (rule 2) participate in ordering only when another segment in the literal changes.
Plural where English reads better: `aucun-resultat-X`→`no-results-X`. LLM exception: in
`pages/admin-llm` only, `modele` means the LLM model → `model` (never `template`); `template`
suffixes in `pages/templates` keep the dictionary `modele`→`template`.

## Compounds (applied on the whole literal, before the word list)

`note-frais`→`expense-statement`, `bail-societe`→`company-lease`, `baux-societe`→`company-leases`,
`bail-note-frais`→`lease-expense-statement`, `charge-supplementaire`→`extra-charge`,
`frais-generaux`→`general-expense`, `montant-ttc`→`amount-incl-vat`,
`raison-sociale`→`legal-name`, `configuration-bas`→`basic-configuration`,
`lieu-emission`→`issue-place`, `societe-quittance`→`company-rent-receipt`,
`societe-note-frais`→`company-expense-statement`, `montant-mois`→`monthly-amount`.

## Words

actif→active, activer→activate, adresse→address, ajouter→add, alerte→alert, analyse→analysis,
annuler→cancel, apercu→preview, aucun→no, aucune→no, bail→lease, bailleur→landlord, barre→bar,
bas→basic, baux→leases, brouillon→draft, charge→charge, charges→charges, cle→key,
colonne→column, comparaison→comparison, comparer→compare, complet→full, complete→full,
compteur→count, configurer→configure, confirmer→confirm, debut→start, defaut→default,
detail→detail, detecte→detected, dialogue→dialog, direction→direction, distante→remote,
divers→misc, droite→right, eau→water, effacer→clear, electricite→electricity, emission→issue,
enregistree→saved, enregistrer→save, entetes→headers, entreprise→company, erreur→error,
fichier→file, filtre→filter, fin→end, formulaire→form, fournisseur→supplier, frais→expense,
gauche→left, gaz→gas, generaux→general, generer→generate, groupe→group, historique→history,
ia→ai, inconnue→unknown, justification→supporting-document, justificatif→supporting-document,
langue→language, libelle→label, lien→link, lieu→place, ligne→line, liste→list,
locataire→tenant, location→rental, loyer→rent, maj→updated, manquant→missing,
manquante→missing, modele→template, modeles→templates, modifier→edit, mois→month,
montant→amount, nom→name, note→statement, nouvelle→new, onglet→tab, pdg→ceo, periode→period,
personnalise→custom, personne→person, personnes→persons, poste→item, postes→items,
prenom→first-name, pro→pro, prompt→prompt, quitter→leave, quittance→rent-receipt, quittances→rent-receipts,
raison→legal, rapport→report, regeneration→regeneration, reinitialiser→reset, resultat→result,
retenu→retained, retirer→remove, rouvrir→reopen, saisie→entry, salarie→employee,
salaries→employees, signature→signature, signatures→signatures, sociale→name, societe→company,
statut→status, supplementaire→extra, suppression→deletion, supprimer→delete, surface→area,
telecharger→download, telephone→phone, televerser→upload, titre→title, total→total,
totale→total, tri→sort, ttc→incl-vat, vide→empty, voir→view, volet→pane

## Onboarding wizard hooks (task 90)

New attributes only (`frontend/src/pages/onboarding/*.tsx`): no behaviour, text, CSS or layout
change. Consumed by `frontend/cypress/e2e/07-onboarding.cy.ts`.

| Hook                                | Producer             | Purpose                                        |
| ----------------------------------- | -------------------- | ---------------------------------------------- |
| `input-onboarding-first-name`       | OnboardingStepProfile | landlord first name                           |
| `input-onboarding-last-name`        | OnboardingStepProfile | landlord last name                            |
| `input-onboarding-phone`            | OnboardingStepProfile | landlord phone                                |
| `input-onboarding-person-address`   | OnboardingStepProfile | landlord postal address                       |
| `input-onboarding-address-note`     | OnboardingStepProfile | landlord address note                         |
| `input-onboarding-agency-name`      | OnboardingStepProfile | agency legal name                             |
| `input-onboarding-legal-form`       | OnboardingStepProfile | agency legal form                             |
| `input-onboarding-siren-siret`      | OnboardingStepProfile | 9-digit SIREN or 14-digit SIRET               |
| `input-onboarding-agency-address`   | OnboardingStepProfile | agency address                                |
| `btn-save-onboarding-profile`       | OnboardingStepProfile | save the profile, then continue               |
| `input-onboarding-property-address` | OnboardingStepProperty | rented dwelling address                      |
| `input-onboarding-rent`             | OnboardingStepProperty | rent excluding charges                       |
| `input-onboarding-charges`          | OnboardingStepProperty | charges provision                            |
| `onboarding-landlord`               | OnboardingStepProperty | pre-filled landlord (name and account email) |
| `btn-next-onboarding-property`      | OnboardingStepProperty | validate the dwelling and continue           |
| `onboarding-lease-individual`       | OnboardingStepLease  | individual lease radio                        |
| `onboarding-lease-colocation`       | OnboardingStepLease  | solidary colocation lease radio               |
| `input-onboarding-tenant-first-${index}` | OnboardingStepLease | co-tenant first name (field-array index 0, 1, …) |
| `input-onboarding-tenant-last-${index}`  | OnboardingStepLease | co-tenant last name (field-array index 0, 1, …) |
| `btn-next-onboarding-lease`         | OnboardingStepLease  | validate tenants and continue                 |

Existing hooks reused by the spec: `onboarding-signature`, `btn-draw-signature`,
`signature-pad-canvas`, `btn-confirm-signature-pad`, `onboarding-finalize`.
