# Entreprise Page Tabs + Modals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganise the "Réglages › Entreprise" page into 3 tabs (Info générale, Baux & Frais, Salariés) under the always-visible company selector, and move every company / expense-item / employee create-edit form into `FormModal` dialogs with Annuler/Valider.

**Architecture:** Approach A of the spec — a shared `useCompanyForm` hook holds the react-hook-form + Zod + mutation logic extracted from today's `CompanyForm`; thin read-only views fill the tabs and small `FormModal` front-ends edit the fields they own. `ExpenseItemForm` / `EmployeeForm` keep their save logic and are only re-wrapped in `FormModal`, the way `PersonForm` already is.

**Tech Stack:** React 19, TypeScript strict, Vite, react-hook-form + Zod, TanStack Query, Tailwind, Vitest, Cypress.

**Spec:** `docs/superpowers/specs/2026-10-25-entreprise-page-tabs-design.md`

## Global Constraints

- Frontend only: no change to `openapi/openapi.yaml`, backend DTOs, generated types, or any monetary calculation (prorata stays computed server-side on company save).
- UI strings in French, exact labels: tabs "Info générale", "Baux & Frais", "Salariés"; modal footer buttons come from `FormModal` ("Annuler" / "Valider").
- `data-cy` hook names are preserved; read-only views get new hooks; no two elements share a hook in the DOM at once.
- Reuse `@/components/ui/FormModal`; do not create a second modal primitive.
- Every production file stays under 300 lines; per-file CSS under 300 lines, following `.opencode/instructions/30-frontend.md` (colocated, prefixed, `@reference`/`@layer components`, token-only).
- Vitest global coverage ≥ 90% lines/statements/functions/branches (`cd frontend && npm run test:coverage`); `npm run lint` and `npm run format:check` clean; `npm run build` passes.
- One full E2E run (`make e2e`) with every spec green, no retry-passes, recorded in the handoff; if the gate cannot run, the task stops at `BLOCKED`, never `DONE`.
- Never commit unless the user asked for commits; in that case use conventional messages (`feat:`, `refactor:`, `test:`).

## Review Focus

Failure modes the spec implies that no single task's happy-path test covers — each is pinned by a named test in the owning task:

1. **Company without a lease** (or lease without surfaces): the "Baux & Frais" read-only block must show "Aucun bail sélectionné…" / prorata "—", and saving the lease modal with "Aucun bail" must not blank the identity fields. → Task 4, Task 5.
2. **Switching company while a modal is open, or after deleting the selected company**: modals must close and views must not render a stale company. → Task 6.
3. **Annuler / Escape / overlay click must not save**: no mutation fires, the list is unchanged. → Task 3, Task 7.
4. **Duplicate `data-cy` in the DOM** (read-only view + open modal at once) breaks Cypress single-element assertions. → Task 8 (suite run is the proof; unit tests assert the renamed read-only hooks).
5. **Cache coherence after a lease-link save**: the prorata shown in "Info générale", `ExpenseItemsManager`'s `defaultProRata` and company-dependent pages must reflect the saved value without a manual reload. → Task 5.

---

### Task 1: ViewTabs per-tab `dataCy`

**Files:**

- Modify: `frontend/src/components/ui/ViewTabs.tsx`
- Modify: `frontend/src/components/ui/ViewTabs.test.tsx`

**Interfaces:**

- Consumes: nothing.
- Produces: `ViewTab` gains optional `dataCy?: string`; `<ViewTabs ariaLabel tabs active onChange />` unchanged otherwise. Task 6 relies on `tabs: ViewTab[]` entries like `{ value: "identification", label: "Info générale", dataCy: "onglet-entreprise-identification" }`.

- [ ] **Step 1: Extend the failing test** — in `ViewTabs.test.tsx`, render `ViewTabs` with two tabs carrying `dataCy: "onglet-a"` / `"onglet-b"` and assert `cy`-free DOM queries: `screen.getByTestId` is not used in this repo; query by `document.querySelector('[data-cy="onglet-a"]')` and assert it exists, has `role="tab"`, `aria-selected` reflects `active`, and clicking it calls `onChange("a")`. Also assert a tab **without** `dataCy` renders no `data-cy` attribute.

- [ ] **Step 2: Run to verify it fails** — `cd frontend && npm run test -- src/components/ui/ViewTabs.test.tsx` → FAIL on the missing `data-cy`.

- [ ] **Step 3: Implement** — add `dataCy?: string` to `ViewTab`, spread it on the button (`data-cy={tab.dataCy}`). No other behaviour change; `updated` dot and `className` handling stay.

- [ ] **Step 4: Run to verify it passes** — same command → PASS, plus existing ViewTabs tests untouched and green.

- [ ] **Step 5: Commit** (only if commits were requested) — `feat: ViewTabs supports per-tab data-cy hooks`.

### Task 2: `useCompanyForm` hook

**Files:**

- Create: `frontend/src/pages/settings/useCompanyForm.ts`
- Test: `frontend/src/pages/settings/useCompanyForm.test.tsx`

**Interfaces:**

- Consumes: `companySchema` / `CompanyFormValues` (`@/lib/validation`), `valuesFromCompany` (`./settingsValues`), `api.companies.create/update`, `queryKeys` (`@/api/queries`).
- Produces:

```ts
export function useCompanyForm(company: CompanyDto | null): {
  form: UseFormReturn<CompanyFormValues>;
  save: UseMutationResult<CompanyDto, Error, CompanyRequest>;
  saveCompany: (values: CompanyFormValues) => void; // builds CompanyRequest (trim, "" leaseId → null) and mutates
  notifyCreated: (payload: CompanyDto) => void;     // seed companiesAll cache with the created company
};
```

Task 3 and Task 5 build their payloads with `saveCompany`; toast/invalidation behaviour is the current `CompanyForm.onSuccess` block, verbatim (invalidate `companiesAll` + `leases`, `setQueryData(company(id))`, success toasts "Société enregistrée. Les prochains documents utiliseront ces valeurs." / "Société créée."). `useCompanyForm` does **not** call `setActiveCompany` (Task 3 owns that, on the modal's `onSaved`).

- [ ] **Step 1: Write the failing test** — `renderHook` with a `QueryClientProvider` wrapper and mocked `api.companies` (pattern from `CompanySection`/`ExpenseItemForm` tests). Assert: `saveCompany` on values with `leaseId: ""` sends `{ leaseId: null, … }` with all strings trimmed; create path calls `api.companies.create`, `notifyCreated` then `save` success seeds `queryKeys.companiesAll` so the new company is immediately selectable, and shows toast "Société créée."; update path calls `api.companies.update(id, …)` and sets `queryKeys.company(id)`; API error surfaces via `save.isError`.

- [ ] **Step 2: Run to verify it fails** — `cd frontend && npm run test -- src/pages/settings/useCompanyForm.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement** — lift lines 29–102 of `CompanyForm.tsx` (useForm + save mutation + payload build) into the hook signature above; `form = useForm({ resolver: zodResolver(companySchema), mode: "onChange", defaultValues: valuesFromCompany(company ?? undefined) })`.

- [ ] **Step 4: Run to verify it passes** — same command → PASS.

- [ ] **Step 5: Commit** — `refactor: extract useCompanyForm from CompanyForm`.

### Task 3: `CompanyIdentityModal` (create + edit)

**Files:**

- Create: `frontend/src/pages/settings/CompanyIdentityModal.tsx` (+ `CompanyIdentityModal.css` if needed)
- Test: `frontend/src/pages/settings/CompanyIdentityModal.test.tsx`

**Interfaces:**

- Consumes: Task 2 `useCompanyForm`; `FormModal` props `formDataCy`, `submitDataCy`, `pending`, `error`, `onSubmit`, `onClose`.
- Produces:

```tsx
<CompanyIdentityModal
  open
  company={CompanyDto | null}   // null ⇒ création
  onClose={() => …}
  onSaved={(company: CompanyDto) => …} // appelé après succès (create et update)
/>
```

Form hooks kept verbatim from `SettingsCompanySection`: `formDataCy="formulaire-societe"`, `submitDataCy="btn-enregistrer-configuration-bas"`, inputs `input-raison-sociale`, `input-siren`, `input-managerName`, `input-societe-adresse`, `input-lieu-emission` (+ legal form hook as today). Titles: "Nouvelle société" / "Modifier la société". **No lease field** in this modal.

- [ ] **Step 1: Write the failing tests** — render with `company={null}`: fields empty, submit disabled/absent error until name typed; type name+SIREN → Valider → `api.companies.create` called with trimmed payload, `onSaved` receives the created DTO, modal stays controlled by `open`. Render with a company: fields prefilled, Valider calls `api.companies.update`. "Annuler" click and Escape call `onClose` and **no** api call (Review Focus 3). Invalid SIREN shows "Le SIREN doit comporter 9 chiffres." and blocks submit.

- [ ] **Step 2: Verify fail** — `cd frontend && npm run test -- src/pages/settings/CompanyIdentityModal.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — `FormModal` wrapper rendering `<SettingsCompanySection register={…} errors={…} />` inside (already lease-free and ~110 lines, so reuse it as-is; pass `formDataCy`/`submitDataCy` per the Interfaces block). `useCompanyForm` owns register/errors/save. On success: `onSaved(payload)`; error text passed to `FormModal error` prop.

- [ ] **Step 4: Verify pass** — same command → PASS.

- [ ] **Step 5: Commit** — `feat: company identity modal`.

### Task 4: Read-only "Info générale" and lease views

**Files:**

- Create: `frontend/src/pages/settings/CompanyIdentityView.tsx` (+ CSS)
- Create: `frontend/src/pages/settings/CompanyLeaseView.tsx` (+ CSS)
- Test: `frontend/src/pages/settings/CompanyIdentityView.test.tsx`, `CompanyLeaseView.test.tsx`

**Interfaces:**

- Consumes: `CompanyDto`, `LeaseDto` (`@/api/types`), `formatEUR` / `formatPercentage`, `employeeTitleLabel`-style label helpers, `decimalFormatter` (`@/components/settings/settingsMoney`).
- Produces:

```tsx
<CompanyIdentityView company={CompanyDto} onEdit={() => …} />
// data-cy="company-information", one row per field, "—" for empty values
// bouton "Modifier" data-cy="btn-modifier-societe"

<CompanyLeaseView lease={LeaseDto | null} proRataBase={string | null} onEdit={() => …} />
// data-cy="company-lease-lie"; prorata read-only hook prorata-bail-societe (renamed from prorata-indicatif)
// lease null ⇒ "Aucun bail sélectionné : la société n’a pas de quote-part professionnelle."
// data-cy="aucun-bail-societe" kept on this empty message
// bouton "Modifier" data-cy="btn-modifier-bail-societe"
```

- [ ] **Step 1: Write the failing tests** — `CompanyIdentityView`: renders name, legalForm, siren, address, managerName, issuePlace under `company-information`; empty `siren` renders "—"; onEdit fires on `btn-modifier-societe`. `CompanyLeaseView`: with a lease renders propertyAddress, "Loyer … € · Charges … €", surfaces and `proRataBase` via `prorata-bail-societe`; with `lease={null}` renders the French no-lease sentence (Review Focus 1); lease with `businessArea`/`totalArea` null shows "—" and never NaN.

- [ ] **Step 2: Verify fail** — `cd frontend && npm run test -- src/pages/settings/CompanyIdentityView.test.tsx src/pages/settings/CompanyLeaseView.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — plain presentational components; reuse card/`SectionHeader` classes from `SettingsSection.css` and the details block wording of `SettingsLeaseSection.tsx:70-96`; no state, no queries.

- [ ] **Step 4: Verify pass** — same command → PASS.

- [ ] **Step 5: Commit** — `feat: read-only company identity and lease views`.

### Task 5: `CompanyLeaseModal`

**Files:**

- Create: `frontend/src/pages/settings/CompanyLeaseModal.tsx`
- Test: `frontend/src/pages/settings/CompanyLeaseModal.test.tsx`

**Interfaces:**

- Consumes: Task 2 `useCompanyForm` (update path), `useLeases()` for the option list, prorata preview computation from `CompanyForm.tsx:49-56` (`parseAmount(businessArea)/parseAmount(totalArea)*100`), `api.companies.update`.
- Produces:

```tsx
<CompanyLeaseModal open company={CompanyDto} leases={LeaseDto[]} onClose onSaved />
// formDataCy="formulaire-bail-societe", submitDataCy="btn-modifier-bail-societe"
// select keeps data-cy="select-bail-societe"; in-modal preview keeps data-cy="prorata-indicatif"
// (only ever mounted while open — Task 8 asserts single-element on the default view)
```

Save builds the full `CompanyRequest` from the **current `company` DTO** (name/legalForm/siren/address/managerName/issuePlace trimmed, `proRataBase` untouched) and only replaces `leaseId`; then `api.companies.update`.

- [ ] **Step 1: Write the failing tests** — preselects the company's current `leaseId`; choosing another lease updates the "Prorata indicatif" preview; Valider calls `api.companies.update` with the untouched identity fields and the new `leaseId`, invalidates `queryKeys.companiesAll` and `queryKeys.leases` (Review Focus 5); "Aucun bail" ⇒ `leaseId: null` and identity preserved (Review Focus 1); Annuler ⇒ no call.

- [ ] **Step 2: Verify fail** — `cd frontend && npm run test -- src/pages/settings/CompanyLeaseModal.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — `FormModal` + the select/preview JSX lifted from `SettingsLeaseSection.tsx`; success toast "Bail de la société enregistré." then `onSaved`.

- [ ] **Step 4: Verify pass** — same command → PASS.

- [ ] **Step 5: Commit** — `feat: company lease modal with prorata preview`.

### Task 6: `CompanySection` tabs rewire

**Files:**

- Modify: `frontend/src/pages/settings/CompanySection.tsx`
- Modify: `frontend/src/pages/settings/SettingsPage.tsx` (page description line only, if wording changes)
- Modify: `frontend/src/pages/settings/SettingsPage.test.tsx`

**Interfaces:**

- Consumes: Task 1 `ViewTabs` with `dataCy`; Task 3 `CompanyIdentityModal`; Task 4 views; Task 5 `CompanyLeaseModal`; existing `ExpenseItemsManager`, `EmployeeSection`.
- Produces: tab values `"identification" | "bail-frais" | "salaries"`, hooks `onglet-entreprise-identification`, `onglet-entreprise-bail-frais`, `onglet-entreprise-salaries`; default tab `identification`; selector block (`select-societe`, `btn-nouvelle-societe`, `btn-rendre-active`, `btn-supprimer-societe`, `dialogue-supprimer-societe`) unchanged and always rendered.

- [ ] **Step 1: Rewrite the failing tests** — in `SettingsPage.test.tsx`: selector visible with tabs below; default tab shows `company-information` (not the old form inputs); clicking `onglet-entreprise-bail-frais` shows `company-lease-lie` + `Types de frais` table; clicking `onglet-entreprise-salaries` shows the employees list; `btn-nouvelle-societe` opens the identity modal prefilled-empty, and its save (mocked) reproduces today's post-create behaviour exactly (`CompanySection.tsx:164-179`: select the created company and `setActiveCompany(created.id)`) — no new active-company behaviour; `btn-modifier-societe` opens `formulaire-societe`; deleting the selected company while a modal is open closes modals and shows empty states (Review Focus 2).

- [ ] **Step 2: Verify fail** — `cd frontend && npm run test -- src/pages/settings/SettingsPage.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — restructure `CompanySection`: keep lines 23–65 (queries, selection effect, remove mutation) intact; replace the body with `ViewTabs` + a single tab region (`role="tabpanel"`), mount `ExpenseItemsManager` / `EmployeeSection` inside their tab, and the three modals with local `useState` flags. Reset tab to `identification` when `selectedId` changes (Review Focus 2). Delete `frontend/src/pages/settings/CompanyForm.tsx` and its CSS; its lease select/preview now live in `CompanyLeaseModal`, so delete `SettingsLeaseSection.tsx`/`.css` and `SettingsSaveBar.tsx`/`.css` too once nothing else references them (`grep -rn "SettingsSaveBar\|SettingsLeaseSection\|CompanyForm" frontend/src` returns only tests, which you update in the same step). `SettingsCompanySection` stays — Task 3 reuses it.

- [ ] **Step 4: Verify pass** — same command → PASS; then `npm run test -- src/pages/settings` → whole settings folder green.

- [ ] **Step 5: Commit** — `feat: entreprise page tabs`.

### Task 7: Expense-item and employee forms into `FormModal`

**Files:**

- Modify: `frontend/src/pages/settings/ExpenseItemForm.tsx` (287 lines — extract `SwitchField` to `ExpenseItemSwitchField.tsx` if the modal chrome pushes it past 300)
- Modify: `frontend/src/pages/settings/EmployeeForm.tsx`
- Modify: `frontend/src/pages/settings/ExpenseItemForm.test.tsx`, `ExpenseItemsManager.test.tsx`, `EmployeeSection.test.tsx`

**Interfaces:**

- Consumes: `FormModal`; both forms keep their current props (`item/companyId/defaultProRata/defaultOrder/onClose`, `companyId/employee/onClose`) so `ExpenseItemsManager` and `EmployeeSection` only change how the form is positioned.
- Produces: `ExpenseItemForm` renders `<FormModal formDataCy="formulaire-poste" submitDataCy="btn-enregistrer-poste" title="Ajouter un frais de frais"|"Modifier le type de frais">`; `EmployeeForm` renders `<FormModal formDataCy="formulaire-salarie" submitDataCy="btn-enregistrer-salarie" title="Ajouter un salarié"|"Modifier le salarié">`. Hooks `btn-ajouter-poste`, `btn-ajouter-salarie`, `btn-modifier-poste-*`, row hooks unchanged.

- [ ] **Step 1: Update the failing tests** — existing assertions mostly survive (`formulaire-poste` etc. still exist); add: form appears inside `[role="dialog"]` (`dialogue-formulaire-poste` / `dialogue-formulaire-salarie`), "Annuler" click → `onClose` and no `api.expenseItems.*` / `api.employees.*` call (Review Focus 3), Escape → closed, save flow keeps current invalidations/toasts ("Poste ajouté." wording unchanged, employee toast unchanged).

- [ ] **Step 2: Verify fail** — `cd frontend && npm run test -- src/pages/settings/ExpenseItemForm.test.tsx src/pages/settings/ExpenseItemsManager.test.tsx src/pages/settings/EmployeeSection.test.tsx` → FAIL on dialog assertions.

- [ ] **Step 3: Implement** — wrap the existing `<form>` body in `FormModal` (form fields as `children`; FormModal supplies its own `<form>` element, so convert the inner `<form>` to a fragment and move `onSubmit`/`data-cy` onto FormModal props, exactly as `PersonForm.tsx` does). Remove `SettingsSaveBar` from both; pass mutation error into `FormModal error`. In `ExpenseItemsManager`/`EmployeeSection` delete the "form rendered above list" branches' inline placement (the components themselves need no structural change since they already conditionally render the form).

- [ ] **Step 4: Verify pass** — same commands → PASS.

- [ ] **Step 5: Commit** — `feat: item and employee forms use form modals`.

### Task 8: E2E migration and full gates

**Files:**

- Modify: `frontend/cypress/e2e/00-settings.cy.ts`
- Modify: `frontend/cypress/e2e/05-multi-company.cy.ts`

**Interfaces:**

- Consumes: everything above.
- Produces: no new production code.

- [ ] **Step 1: Migrate the specs** — keep every interaction sequence as close to current as possible, adding only the unavoidable steps: where a test reads/writes `prorata-indicatif` on the default view, switch to `prorata-bail-societe` (read-only) or open `btn-modifier-bail-societe` for the modal preview; identity edits become `btn-modifier-societe` → `formulaire-societe` → `btn-enregistrer-configuration-bas`; creation is `btn-nouvelle-societe` → modal fill → Valider (the `select-societe`/`btn-supprimer-societe` "not.exist during creation" assertions in `05-multi-company.cy.ts:165-166` are obsolete — the selector now always exists; replace them with the modal-visible + selector-still-visible assertions); expense-item and employee adds need a tab click (`onglet-entreprise-bail-frais` / `onglet-entreprise-salaries`) before `btn-ajouter-poste` / `btn-ajouter-salarie`.

- [ ] **Step 2: Static gates** — `cd frontend && npm run lint && npm run format:check && npm run build` → all clean/pass.

- [ ] **Step 3: Unit + coverage gate** — `npm run test:coverage` → all green, ≥ 90% lines/statements/functions/branches; record the real numbers.

- [ ] **Step 4: Full E2E once** — `make e2e` → exit 0, every spec and test green in a single run, no retry-passes; record spec/test counts in the handoff. If Docker is unavailable, stop at `BLOCKED` naming the gate; never claim `DONE`.

- [ ] **Step 5: Commit** — `test: entreprise tab and modal e2e flows`.
