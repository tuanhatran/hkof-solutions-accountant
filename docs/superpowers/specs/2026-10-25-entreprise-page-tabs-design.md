# Entreprise page redesign — tabs + modals (approach A)

Date: 2026-10-25 · Status: approved shape, pending final user sign-off · Scope: frontend
only, no contract change.

## Intent and why

The "Réglages › Entreprise" page stacks the company selector, the company + lease
form, the "Types de frais" card and the "Salariés" card in one long column. The user
wants the page reorganised into tabs, and every create/edit form to become a modal
with the standard "Annuler" / "Valider" footer, like `PersonForm` and `LeaseForm`
already do.

## Goals

- 3 tabs under the always-visible company selector: **Info générale**, **Bail &
  Frais**, **Salariés** (segmented `role="tablist"` pattern of `LmnpPage`).
- Company selector unchanged: "Société à configurer" select, "Nouvelle société",
  "Rendre active", "Supprimer" — same positions, above the tabs. The tab bar stays
  visible at all times, including during creation and when no company exists yet.
- "Nouvelle société" opens the identity `FormModal` empty (no lease field); on
  "Valider" the created company becomes selected and active, and its lease is
  attached later from the "Bail & Frais" tab.
- "Info générale" is read-only company identity, edited through a "Modifier" modal.
- "Bail & Frais" shows the company's linked lease read-only, with its own "Modifier"
  modal, and the "Types de frais" table: "Ajouter un type" and "Modifier" open modals.
- "Salariés": "Ajouter un salarié" and "Modifier" open modals.
- Every tab and modal keeps its `data-cy` hooks; existing tests are migrated, not deleted.

## Non-goals

- No backend, `openapi/openapi.yaml`, DTO or calculation change. `proRataBase` keeps
  being computed server-side on company save.
- No change to the LMNP page, leases CRUD outside this page, or signature management.
- No visual redesign beyond tab/modal chrome; existing card and field styles reused.

## Anti-goals

- A tab's "Valider" silently saving another tab's data.
- Removing or renaming `data-cy` selectors used by E2E specs.
- A class crossing the 300-line rule instead of being split.

## Constraints

- UI strings in French; amounts EUR, dates DD/MM/YYYY.
- Reuse `@/components/ui/FormModal` (already renders Annuler/Valider) — no new modal primitive.
- Vitest coverage gate ≥ 90% lines/statements/functions/branches; each new component
  gets its own tests; full E2E suite must be green in one run.

## Approaches considered

- **A — shared form hook + three modal forms** (chosen): extract the RHF+Zod logic of
  `CompanyForm` into `useCompanyForm`; thin read-only views feed the tab bodies, and
  small modal forms use the hook for the fields they own.
- **B — wrap `CompanyForm` as-is** in the Info générale modal: cheapest, but mixes
  identity and lease editing in one modal and leaves Bail & Frais read-only —
  contradicts the requested split.
- **C — one mega form, tabs only hide sections**: one save commits all tabs at once —
  rejected by the anti-goal above.

## Decided shape

### SettingsPage / CompanySection

- `CompanySection.tsx` keeps selector + actions + delete dialog; below it renders the
  tab bar (`identification` | `bail-frais` | `salaries`, default `identification`) and
  one tab body at a time. Tab state is local `useState`, no routing.
- Creation and empty case: with no company selected (or none exists), the selector and
  tabs stay rendered; "Nouvelle société" opens `CompanyIdentityModal` with empty
  fields and no lease section; "Bail & Frais" and "Salariés" show their empty states.
  `CompanyForm` (identity + lease inline) is removed completely, replaced by
  `useCompanyForm` + the modals.

### Info générale tab

- Read-only display of: `name`, `legalForm`, `siren`, `address`, `managerName`,
  `issuePlace` (card/dl layout, `data-cy="info-societe"`).
- "Modifier" button (`data-cy="btn-modifier-societe"`) opens `CompanyIdentityModal` —
  a `FormModal` with the identity fields, Zod-validated via `useCompanyForm`, footer
  Annuler/Valider; same save mutation and query invalidations as today's `CompanyForm`.
- Bail/`leaseId`/prorata fields are removed from this modal (decided: they belong to
  the next tab).

### Bail & Frais tab

- Lease block: linked lease summary read-only (address, loyer, charges, surfaces,
  prorata indicatif, `proRataBase`) reusing `SettingsLeaseSection`'s display pieces.
  "Modifier" (`data-cy="btn-modifier-bail-societe"`) opens `CompanyLeaseModal` —
  lease select + prorata display, saves through the same `api.companies.update` with
  the full identity payload (only `leaseId` is editable there).
  No-lease case keeps "Aucun bail sélectionné…" wording.
- `ExpenseItemsManager` below, unchanged table, but `ExpenseItemForm` is rendered
  inside a `FormModal` (title "Ajouter un type de frais" / "Modifier le type de frais").

### Salariés tab

- `EmployeeSection` unchanged list/confirm logic; `EmployeeForm` rendered inside a
  `FormModal` (title "Ajouter un salarié" / "Modifier le salarié").

### Shared wiring

- Tabs use the shared `ViewTabs` primitive, extended with an optional `dataCy` per tab
  (backwards-compatible; its tests updated) instead of duplicating LmnpPage markup.
- Modal open/close state stays in the owning section (`CompanySection`,
  `ExpenseItemsManager`, `EmployeeSection`), following the `PersonnesSection` pattern.
- `ExpenseItemForm` / `EmployeeForm`: replace their inline `SettingsSaveBar` footer
  with the FormModal footer; validation, mutation, toasts, invalidations unchanged.
- `data-cy` contract: names of existing field hooks (`input-raison-sociale`,
  `select-bail-societe`, `btn-ajouter-poste`, `btn-ajouter-salarie`…) are kept, and
  they live only inside their modal. Read-only tab views get new hooks
  (`info-societe`, `bail-societe-lie`); `prorata-indicatif` / `bail-selectionne` are
  renamed in the read-only view so no two DOM elements ever share a hook. Rewriting
  E2E interaction sequences (tab click → Modifier → Valider) is the required migration;
  selector renames follow it and are reported in the handoff.
- Line-count budget: new hook + modals split `CompanyForm` (137 → three files well
  under 300); `ExpenseItemForm` (287) may need its `SwitchField` extracted to stay
  under 300 once modal chrome is added — builder decides, rule is hard.

## Left to the builder

- Exact file names under `frontend/src/pages/settings/` (suggested:
  `useCompanyForm.ts`, `CompanyIdentityModal.tsx`, `CompanyLeaseModal.tsx`,
  `CompanyIdentityView.tsx`), and whether `SettingsCompanySection` /
  `SettingsLeaseSection` / `SettingsSaveBar` are reused, reshaped or retired with
  `CompanyForm`.
- How tabs/sections share `useCompanyForm` instances without re-fetching leases.
- CSS: reuse `FormModal.css`, `SettingsSection.css`, LmnpPage's `segmented` classes;
  new rules stay under 300 lines per file and follow `30-frontend.md`.

## Tests and gates

- Update: `SettingsPage.test.tsx`, `EmployeeSection.test.tsx`,
  `ExpenseItemForm.test.tsx`, `ExpenseItemsManager.test.tsx` and any test asserting the
  old stacked layout or inline forms (tab switching + modal open/close/submit).
- New: `useCompanyForm` (or modal-level) tests for read-only view, Modifier → modal →
  Valider → toast + invalidation, Annuler → no save.
- Gates: `cd frontend && npm run test:coverage`, `npm run lint`, `npm run format:check`,
  `npm run build`; then full E2E (`make e2e`) — one full-suite run, all specs green,
  no retry-passes.
- Contract impact: **none**.

## Decisions and their owner

- User: 3-tab layout, selector always visible above the tabs, read-only "Info générale"
  with a "Modifier" modal, "Bail & Frais" = lease + types de frais, "Salariés" tab;
  all add/edit forms are modals with Annuler/Valider; creation via the identity modal
  (no inline creation flow), confirmed after the builder check.
- Lead's calls, not objected to: lease-link editing lives in Bail & Frais (the identity
  modal has no lease field); tab labels exactly "Info générale", "Bail & Frais",
  "Salariés"; `ViewTabs` extended with optional per-tab `dataCy`; E2E sequence rewrites
  count as migration while hook names are preserved; if the E2E gate cannot run
  (e.g. Docker unavailable) the task stops at `BLOCKED`, never `DONE`.
