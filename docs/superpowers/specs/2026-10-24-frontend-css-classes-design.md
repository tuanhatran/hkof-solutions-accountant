# Frontend CSS classes — design

2026-10-24 · HomeOfficeExpenses frontend · Size L · zero visual change

## Intent

Today the styling of a component lives as a wall of Tailwind utilities inside its
`className`, and there is a single global stylesheet (`src/index.css`, 269 lines). Reading a
component means parsing 6–12 utility tokens per element (778 `className=` across 106 `.tsx`
files; `LlmConnectionSection.tsx` alone has 35).

We want two things:

1. the JSX to read as markup again — a short, meaningful class name per element;
2. the CSS specific to a component to live in a file named after that component
   (`AppShell.tsx` → `AppShell.css`).

## Goals

- Every styled component/page has a colocated `<Component>.css`, imported by the component.
- Class names are semantic and prefixed with the component name in kebab-case.
- Utility strings in the TSX shrink to true one-offs (a stack gap, a grid template, a
  fixed width) — everything reused or conditional becomes a named class.
- The shared design system keeps living in `index.css` as the single source of tokens.
- Zero visual change: same computed styles, same DOM, same `data-cy` attributes, same
  French copy.

## Non-goals

- No restyle, no new palette, no spacing redesign, no dark mode.
- No removal of Tailwind; no CSS Modules; no styled-components.
- No backend, contract, route, `data-cy` or copy change.
- No test rewrite beyond the class assertions pinned by the refactor (see Constraints).

## Anti-goals (would make this a failure even if it builds)

- A second source of truth for colors: hardcoded hex values reappearing in component CSS.
- Deleting a class a test or Cypress selector depends on.
- A component CSS file over 300 lines.
- "Better view" achieved by adding an abstraction layer that makes the DOM unguessable
  (e.g. `className={styles.box17}`).

## Constraints

- Tailwind v4, CSS-first (no `tailwind.config`). `@apply` in a separate CSS file requires
  `@reference "../../index.css";` at the top of that file — otherwise the theme and the
  utilities are unknown to it. The path is relative to the CSS file's own depth.
- **Cascade (settled after a real build check).** Every rule in a component CSS sits inside
  `@layer components`, and `main.tsx` imports `./index.css` **first**, before `./router`.
  Two reasons: unlayered component rules would beat every inline utility, and CSS is emitted
  in module-import order — with today's `main.tsx` order (router before index.css) the
  primitives would win over the component classes instead of the reverse.
- `@apply card`, `@apply field`, `@apply btn` do **not** resolve in v4 ("unknown utility
  class"). A design-system primitive therefore stays on the element and a component class
  adds what is specific to it (`className="card expense-result-card"`), never a copy of the
  primitive's utilities.
- Eleven override sites depend on utilities beating the primitives and must keep working
  (they are a review checklist, not a refactor target): `States.tsx:47`,
  `ExpenseStatementHeader.tsx:44`, `ActiveRentReceiptBanner.tsx:12`,
  `ExpenseResultCard.tsx:18`, `RentReceiptResultCard.tsx:14`, `ProRataInput.tsx:37`,
  `ExpenseEntryCard.tsx:35`, and the ghost delete buttons at `SignatureCard.tsx:55`,
  `LandlordSection.tsx:81`, `LeaseSection.tsx:97`, `TenantSection.tsx:81`,
  `ExpenseItemsManager.tsx:184`.
- Values come from tokens: `var(--color-*)`, `var(--shadow-*)`, `var(--font-*)`, or
  `@apply <utility>`. A hex already equal to a token **reuses that token**
  (`#f4f0e8` → `--color-paper`, `#1b5b49` → `--color-accent`, `#123f33` →
  `--color-accent-strong`); minting an alias would be the second source of truth the
  anti-goals forbid. `#e7b98f` (×5) and the sidebar gradient stops `#164a3c`, `#113d31`,
  `#0c2f27` become new named tokens with their exact value. `#1d5b49`
  (`ExpensePreviewPane.tsx:60`) is normalised to `--color-accent`: my call, the only
  intentional pixel-level change in the task, recorded as such.
- Shadows: promote to a `--shadow-*` token when used twice or more; a single-use decorative
  `rgba()` shadow may stay a literal inside the component CSS.
- Every component CSS is imported by its component — never by `main.tsx`, never a barrel.
- Prefix = component file name in kebab-case (`AppShell.css` → `.app-shell*`,
  `LlmConnectionSection.css` → `.llm-connection-section*`).
- Conditional variants use a second class plus `cn()`; no long conditional utility strings.
- `hidden` stays a Tailwind utility: `GenerateRentReceiptPage.test.tsx:879-890` asserts it.
- `segmented-item-active` stays a global design-system class.
- Test edits are an explicit allowlist — class assertions only, no behaviour change:
  `AppShell.test.tsx:61,62,68,69,116`, `LlmBadge.test.tsx:57,77,119,131,143`,
  `AnalysisPanel.test.tsx:108`, `ViewTabs.test.tsx:30`. Every other test file stays
  untouched; `templates/*.test.tsx` and `PdfViewer.test.tsx:220` contain no affected
  assertion.
- Inline `style={{}}` with computed values stays inline (`PdfViewer.tsx:160` transform).
  `AppShell.tsx:166` gradient moves to a class once its stops are tokenized.
- TypeScript strict, no `any`. UI French. No commit, no push.

## Approaches considered

1. **Colocated global CSS per component, `@apply` behind `@reference`** — chosen. Plain CSS,
   visible in the diff, no new build machinery, tokens preserved, one file per component
   exactly as requested. Cost: class names are global, so the prefix convention is enforced
   by review (a duplicate `.card` outside `index.css` is a blocker).
2. **CSS Modules** (`AppShell.module.css`, `styles.navLink`) — real scoping, dead names
   caught by TypeScript. Rejected: `styles.*` in every attribute adds more noise than it
   removes for 78 files, `@reference` is still needed, and the diff becomes unreadable
   without the corresponding CSS open next to it.
3. **One larger semantic layer in `index.css`** — no per-component files, everything global.
   Rejected: it answers "shorter className" but not "CSS named after the component", grows
   past 1 500 lines with no ownership boundary.

## Decisions

- File: `Component.tsx` / `Component.css`, same directory, `import "./Component.css";` as
  the first import group of the component.
- Naming: block `.app-shell`, elements `.app-shell-nav`, `.app-shell-nav-link`, variants
  `.app-shell-nav-link-active`. No nesting deeper than three hyphens without a new block.
- New shared primitive goes into `index.css` only when 3+ components need it, and only in
  the foundation step; later work items report the need instead of editing `index.css`.
- The foundation proves the pipeline on one real component, `Button.tsx` (59 lines, 2
  classNames): `@reference` path, `@layer components`, `@apply` of a primitive failing, and
  the cascade against an inline utility. B–F start only once that pilot builds and renders.
- Size cap: every component `.css` stays under 300 lines (split by block if it grows). The
  300-line rule is about code files; `index.css` may reach 300, and if it would exceed it,
  tokens and base move to `src/styles/theme.css` imported by `index.css`, so the
  `@reference` target never changes.
- Order of work: foundation (tokens, any new primitive, convention, pilot) → five parallel
  work items by directory → merge → gates → one reviewer pass on the combined diff.
- Coverage: CSS is outside Vitest coverage (`include: ["src/**/*.{ts,tsx}"]`); the 90%
  thresholds must stay green with the same numbers, not drift down.
- E2E: mandatory gate, same 5 specs / 24 tests baseline.

## Work items (by file)

- **A · foundation** — `frontend/src/index.css` (new tokens, primitives),
  `frontend/src/main.tsx` (index.css imported first), `frontend/src/components/ui/Button.tsx`
  + `Button.css` (pilot), `.opencode/instructions/30-frontend.md` (CSS convention section).
  Serial, blocks B–F.
- **B · components/ui + layout + llm** — `States`, `ConfirmDialog`, `ViewTabs`,
  `ToastHost`, `FieldGroup`, `ProRataInput`, `AmountConfirmButton`, `AiBadge`, `AppShell`,
  `PageHeader`, `LlmBadge`, `AnalysisPanel` (+ the allowlisted class assertions).
- **C · components/pdf + forms + signatures + settings** — `PdfViewer`, `FileDropzone`,
  `SignatureForm`, `SignatureCard`, `SignaturesManager`, `LandlordForm`, `TenantForm`,
  `LeaseForm`, `SettingsSection`, `RentReceiptSettings`, `LandlordSection`,
  `TenantSection`, `LeaseSection`.
- **D · pages/admin-llm + pages/templates** — `LlmConnectionSection`, `LlmAdvancedSection`,
  `LlmApiKeyField`, `LlmStatusCard`, `LlmTestFeedback`, `LlmToggle`, `LlmRemoteWarning`,
  `LlmSaveBar`, `AdminLlmPage`, `ReferenceVariables`, `TemplateVersionsList`,
  `TemplatesCard`, `TemplateImportForm`, `ValidationReport`, `TemplateActiveModel`,
  `ModelPreview`, `TemplatesPage`.
- **E · pages/settings + pages/history** — `ExpenseItemForm`, `ExpenseItemsManager`,
  `SettingsPage`, `SettingsHomeSection`, `SettingsCompanySection`, `SettingsCardSection`,
  `SettingsSaveBar`, `HistoryPage`, `HistoryMonthSection`, `HistoryActions`,
  `HistoryEmptyState`, `RentReceiptMonthPanel`, `StatementMonthPanel`.
- **F · pages/rent-receipt + pages/expense-statement + router** — `RentReceiptForm`,
  `RentReceiptPartyFields`, `RentReceiptAmountFields`, `RentReceiptSignatureField`,
  `RentReceiptResultCard`, `RentReceiptPreviewPane`, `ActiveRentReceiptBanner`,
  `GenerateRentReceiptPage`, `ExpenseEntryCard`, `ExpenseLinesTable`, `ExpenseLinesCard`,
  `ExpenseAmountFields`, `ExpenseTypeAndProRata`, `ExpenseGenerationFooter`,
  `ExpenseStatementHeader`, `ExpenseResultCard`, `ExpensePreviewPane`, `ExpenseInputPane`,
  `RentReceiptNotice`, `ReceiptAttachment`, `GenerateExpenseStatementPage`, `router.tsx`.

Work items B–F touch disjoint files and run in parallel; none edits `index.css`.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`,
  `npm run test:coverage` (≥90% ×4).
- Full docker E2E (`--abort-on-container-exit`), 5 specs / 24 tests green, no retry-only pass.
- No component `.css` over 300 lines; no production `.tsx` over 300 lines.
- Grep proof: no hex literal left in `src/**/*.tsx` or component CSS; every `className`
  string over ~8 utilities has a named class instead.
- The eleven cascade override sites (Constraints) render unchanged: the reviewer reads each
  one in the diff, since Vitest stubs CSS and Cypress only uses `data-cy`.
- Rendering equivalence: each rule in a component CSS traces 1:1 to the utilities it
  replaced; reviewer samples the heaviest five files.
- Test edits stay inside the allowlist (Constraints); a diff touching any other test file is
  a blocker.
- `git diff` leaves no behavioural change: no route, `data-cy`, copy or hook touched.

## Left to the builder

- The exact class name per element, and which one-off utilities stay inline.
- Grouping and ordering inside each CSS file.
- Whether an element needs a class at all (an unstyled wrapper needs none).
- The final token names in `index.css`.
