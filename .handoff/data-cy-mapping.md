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

## Onboarding wizard hooks (tasks 90-93)

New attributes only (`frontend/src/pages/onboarding/*.tsx`): no behaviour, text, CSS or layout
change. Consumed by `frontend/cypress/e2e/07-onboarding.cy.ts`.

| Hook                                                | Producer               | Purpose                                |
| --------------------------------------------------- | ---------------------- | -------------------------------------- |
| `input-onboarding-first-name`                       | OnboardingStepProfile  | manager first name                     |
| `input-onboarding-last-name`                        | OnboardingStepProfile  | manager last name                      |
| `select-onboarding-phone-country`                   | OnboardingStepProfile  | manager phone country code select      |
| `input-onboarding-phone`                            | OnboardingStepProfile  | manager phone                          |
| `input-onboarding-person-address`                   | OnboardingStepProfile  | manager postal address                 |
| `input-onboarding-address-note`                     | OnboardingStepProfile  | manager address note                   |
| `input-onboarding-agency-name`                      | OnboardingStepProfile  | agency legal name                      |
| `input-onboarding-legal-form`                       | OnboardingStepProfile  | agency legal form                      |
| `input-onboarding-siren-siret`                      | OnboardingStepProfile  | 9-digit SIREN or 14-digit SIRET        |
| `input-onboarding-agency-address`                   | OnboardingStepProfile  | agency address                         |
| `btn-save-onboarding-profile`                       | OnboardingStepProfile  | save the profile, then continue        |
| `input-onboarding-property-address-${index}`        | OnboardingPropertyCard | managed dwelling address               |
| `btn-remove-property-${index}`                      | OnboardingPropertyCard | remove managed property card           |
| `input-onboarding-landlord-first-name-${index}`     | OnboardingPropertyCard | landlord first name                    |
| `input-onboarding-landlord-last-name-${index}`      | OnboardingPropertyCard | landlord last name                     |
| `select-onboarding-landlord-phone-country-${index}` | OnboardingPropertyCard | landlord phone country code select     |
| `input-onboarding-landlord-phone-${index}`          | OnboardingPropertyCard | landlord phone                         |
| `input-onboarding-landlord-email-${index}`          | OnboardingPropertyCard | landlord email                         |
| `input-onboarding-landlord-address-note-${index}`   | OnboardingPropertyCard | landlord address note                  |
| `btn-add-property`                                  | OnboardingStepProperty | add a new managed property             |
| `btn-next-onboarding-property`                      | OnboardingStepProperty | validate properties and continue       |
| `select-onboarding-lease-property`                  | OnboardingStepLease    | select property associated with lease  |
| `onboarding-lease-individual`                       | OnboardingStepLease    | individual lease radio                 |
| `onboarding-lease-colocation`                       | OnboardingStepLease    | solidary colocation lease radio        |
| `input-onboarding-total-rent`                       | OnboardingStepLease    | total rent excl charges for colocation |
| `input-onboarding-total-charges`                    | OnboardingStepLease    | total charges for colocation           |
| `input-onboarding-tenant-first-${index}`            | OnboardingTenantCard   | tenant first name                      |
| `input-onboarding-tenant-last-${index}`             | OnboardingTenantCard   | tenant last name                       |
| `input-onboarding-tenant-rent-${index}`             | OnboardingTenantCard   | individual tenant rent excl charges    |
| `input-onboarding-tenant-charges-${index}`          | OnboardingTenantCard   | individual tenant charges              |
| `btn-add-tenant`                                    | OnboardingStepLease    | add tenant button                      |
| `btn-next-onboarding-lease`                         | OnboardingStepLease    | validate tenants and continue          |

Existing hooks reused by the spec: `onboarding-signature`, `btn-draw-signature`,
`signature-pad-canvas`, `btn-confirm-signature-pad`, `onboarding-finalize`.

## Registration & Dashboard hooks (tasks 91, 94, 95)

Consumed by `frontend/cypress/e2e/07-onboarding.cy.ts`.

| Hook                       | Producer      | Purpose                                         |
| -------------------------- | ------------- | ----------------------------------------------- |
| `auth-module-agency`       | AuthPage      | agency (LMNP) registration module card checkbox |
| `auth-module-company`      | AuthPage      | company registration module card checkbox       |
| `dashboard-page`           | DashboardPage | root container for Agency Dashboard page        |
| `dashboard-agency-name`    | DashboardPage | agency trade name in header profile card        |
| `dashboard-kpi-properties` | DashboardPage | total managed properties count KPI              |
| `dashboard-kpi-leases`     | DashboardPage | total active leases count KPI                   |
| `dashboard-kpi-tenants`    | DashboardPage | total unique tenants count KPI                  |
| `dashboard-kpi-rent`       | DashboardPage | total monthly rental volume KPI                 |
| `action-generate-receipt`  | DashboardPage | quick action link to rent receipt generator     |
| `action-add-property`      | DashboardPage | quick action link to add property in settings   |
| `action-manage-leases`     | DashboardPage | quick action link to manage leases in settings  |

## Personal Agency, Resume & Settings hooks (tasks 97-100)

Consumed by `frontend/cypress/e2e/07-onboarding.cy.ts`.

| Hook                               | Producer               | Purpose                                                |
| ---------------------------------- | ---------------------- | ------------------------------------------------------ |
| `input-onboarding-personal-agency` | OnboardingStepProfile  | personal agency checkbox (skip company details)        |
| `btn-skip-onboarding`              | OnboardingPage         | skip onboarding wizard to dashboard                    |
| `onboarding-progress-card`         | OnboardingProgressCard | onboarding progress card shown on dashboard when draft |
| `btn-resume-onboarding`            | OnboardingProgressCard | resume onboarding from dashboard progress card         |
| `tab-agency`                       | LmnpPage               | agency settings tab in LMNP settings                   |
| `agency-section`                   | AgencySection          | agency configuration section in settings               |
| `agency-is-personal`               | AgencySection          | toggle personal vs professional agency                 |
| `agency-name`                      | AgencySection          | agency name input in settings                          |
| `agency-manager-name`              | AgencySection          | agency manager full name input                         |
| `agency-legal-form`                | AgencySection          | agency legal form input                                |
| `agency-siren-siret`               | AgencySection          | agency SIREN/SIRET input                               |
| `agency-address`                   | AgencySection          | agency postal address input                            |
| `btn-save-agency`                  | AgencySection          | save agency profile button                             |

## Company onboarding hooks (task 104, consumed by 105)

Produced by `frontend/src/pages/onboarding/OnboardingCompanyStep*.tsx`, `OnboardingCompanyStepNav`,
`OnboardingSkipButton` and `ExpenseStatementHeader`; consumed by
`frontend/cypress/e2e/07-onboarding.cy.ts` for the company-only registration.

| Hook                                           | Producer                       | Purpose                                                 |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `company-onboarding-steps`                     | OnboardingCompanyStepNav       | five-step company wizard bar                            |
| `company-step-${key}`                          | OnboardingCompanyStepNav       | step item; the active one carries `aria-current="step"` |
| `company-identity-form`                        | OnboardingCompanyStepIdentity  | identity step form                                      |
| `input-company-onboarding-name`                | OnboardingCompanyStepIdentity  | company legal name                                      |
| `input-company-onboarding-legal-form`          | OnboardingCompanyStepIdentity  | company legal form                                      |
| `input-company-onboarding-siren`               | OnboardingCompanyStepIdentity  | 9-digit SIREN                                           |
| `input-company-onboarding-siret`               | OnboardingCompanyStepIdentity  | optional 14-digit SIRET                                 |
| `input-company-onboarding-manager`             | OnboardingCompanyStepIdentity  | manager full name                                       |
| `input-company-onboarding-address`             | OnboardingCompanyStepIdentity  | registered office address autocomplete                  |
| `input-company-onboarding-issue-place`         | OnboardingCompanyStepIdentity  | document issue place                                    |
| `btn-company-siren-lookup`                     | OnboardingCompanyStepIdentity  | SIREN lookup, prefills the identity fields              |
| `company-lookup-error`                         | OnboardingCompanyStepIdentity  | SIREN lookup failure alert                              |
| `company-lease-form`                           | OnboardingCompanyStepLease     | lease step form                                         |
| `input-company-onboarding-property-address`    | OnboardingCompanyStepLease     | dwelling address autocomplete                           |
| `input-company-onboarding-total-area`          | OnboardingCompanyStepLease     | total dwelling area (m²)                                |
| `input-company-onboarding-business-area`       | OnboardingCompanyStepLease     | business area (m²)                                      |
| `input-company-onboarding-rent`                | OnboardingCompanyStepLease     | rent excluding charges                                  |
| `input-company-onboarding-charges`             | OnboardingCompanyStepLease     | charges provision                                       |
| `input-company-onboarding-landlord-name`       | OnboardingCompanyStepLease     | natural-person landlord name                            |
| `input-company-onboarding-landlord-phone`      | OnboardingCompanyStepLease     | landlord phone                                          |
| `input-company-onboarding-landlord-address`    | OnboardingCompanyStepLease     | landlord address                                        |
| `company-expenses-form`                        | OnboardingCompanyStepExpenses  | expense categories step                                 |
| `input-company-expense-${code}`                | OnboardingCompanyStepExpenses  | category checkbox (`loyer`, `electricite`, `gaz`, …)    |
| `input-company-expense-prorata-${code}`        | OnboardingCompanyStepExpenses  | category professional share (%)                         |
| `select-company-expense-periodicity-${code}`   | OnboardingCompanyStepExpenses  | category periodicity (`MONTHLY`, `BIMONTHLY`, `ANNUAL`)  |
| `company-employees-form`                       | OnboardingCompanyStepEmployees | employees step, manager row prefilled                   |
| `input-company-employee-first-${index}`        | OnboardingCompanyStepEmployees | employee first name                                     |
| `input-company-employee-last-${index}`         | OnboardingCompanyStepEmployees | employee last name                                      |
| `input-company-employee-email-${index}`        | OnboardingCompanyStepEmployees | employee e-mail                                         |
| `input-company-employee-address-${index}`      | OnboardingCompanyStepEmployees | employee address                                        |
| `select-company-employee-title-${index}`       | OnboardingCompanyStepEmployees | employee title (`CEO`, `CFO`, `ACCOUNTANT`, `EMPLOYEE`) |
| `input-company-employee-issue-place-${index}`  | OnboardingCompanyStepEmployees | employee issue place                                    |
| `btn-add-company-employee`                     | OnboardingCompanyStepEmployees | append an employee row                                  |
| `btn-remove-company-employee-${index}`         | OnboardingCompanyStepEmployees | remove an employee row (index > 0)                      |
| `company-summary`                              | OnboardingCompanyStepSummary   | summary step with every captured value                  |
| `btn-finalize-company-onboarding`              | OnboardingCompanyStepSummary   | create landlord, company, lease, items and employees    |
| `company-finalize-error`                       | OnboardingCompanyStepSummary   | finalize failure alert                                  |
| `btn-company-next`                             | all company steps              | footer next / submit                                    |
| `btn-company-back`                             | company steps 2-5              | footer back                                             |
| `btn-skip-onboarding`                          | OnboardingSkipButton           | skip the wizard from any `.onboarding-actions` footer   |
| `onboarding-track-selector`                    | OnboardingTrackSelector        | track chooser, absent on a company-only account         |
| `btn-onboarding-track-agency` / `-company`     | OnboardingTrackSelector        | track buttons when both modules are enabled             |
| `company-expense-statement`                    | ExpenseStatementHeader         | company chip on the landing page (single company)       |
| `lease-expense-statement`                      | ExpenseStatementHeader         | active lease chip on the landing page (single lease)    |
