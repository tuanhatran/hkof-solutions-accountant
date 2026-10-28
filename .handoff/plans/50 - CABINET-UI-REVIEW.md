# Cabinet UI review and direction (2026-10-27)

Read-only UI/UX review of `frontend/src`, source-level (no browser screenshots:
Electron is not installed and Cypress was not driven against a live stack).
Product context: `README.md`, `product_prompt.md`.

## Verdict

The UI is coherent but carries a recognisable "AI editorial SaaS" cluster:
warm paper, forest green, copper accents, serif display headings, large soft
shadows, `rounded-2xl`, radial background gradients, glass surfaces, uppercase
tracked eyebrows and pill badges. For an accounting service the result reads as
a generated landing page, while the real differentiator — the French document
produced — is visually diluted.

**Recommendation: "Cabinet"** — a neutral, dense, precise accounting workbench
whose only warm artifact is the PDF document. Swiss layout discipline plus
financial-dashboard density, without the dark trading aesthetic.

> The app is the instrument. The PDF is the paper.

## What already works (keep)

- Two-panel "Saisie / Aperçu" generation layout and the backend-only amount
  authority. Do not move calculations client-side.
- French domain vocabulary and DD/MM/YYYY / `1 234,56 €` formatting.
- `ConfirmDialog`, `ToastHost`, `FileDropzone` keyboard handling and `aria-live`.
- `data-cy` coverage and the existing test discipline.
- Logically deactivated templates and the "APERÇU" watermark.

## "AI-generated" tells found

| Tell | Evidence |
| --- | --- |
| Warm paper + forest + copper palette | `index.css` `--color-paper #f4f0e8`, `--color-copper #a3613a` |
| Serif display headings | `--font-display` Iowan/Palatino/Georgia on all `h1..h4` |
| Oversized soft shadows | `--shadow-soft 0 24px 60px -42px`, `--shadow-floating 0 30px 80px -30px` |
| Very large radii | `.card` `rounded-2xl`, `.field`/`.btn` `rounded-xl`, sidebar info card `rounded-2xl` |
| Decorative gradients / glass | body radial gradients; `.glass-surface` `backdrop-filter: blur(14px)`; dark 158° sidebar gradient |
| Eyebrow + pill badge pattern | `.eyebrow` 11px/0.18em uppercase; `.badge` 10.5px uppercase rounded-full |
| Copper used for AI | `.badge-ai` copper; `AiBadge` Sparkles |
| Repetition counts in `frontend/src` | ~26 `eyebrow`, 11 `font-display`, 93 rounded utilities, 9 shadow/glass utilities, 170 small-text utilities across 86 CSS files |

Contrast failures: copper on copper-soft 4.04:1; sidebar white/45 3.74-4.12:1,
white/35 3.06:1, white/30 2.60:1, white/25 2.22:1; placeholder ink-soft/45
1.93:1.

## Workflow and context gaps (P0)

1. **No generation entry in the navigation.** `AppNav.tsx` `SECTIONS` exposes
   only Historique, Société, LMNP, Admin IA. `/generer/quittance` and
   `/generer/note-frais` are reachable only by redirect, history empty state or
   cross-links. `AppNav.test.tsx` and `AppShell.test.tsx` explicitly assert the
   absence of `a[href^="/generer/"]`.
2. **The active company is invisible and not switchable.** `AppShell.tsx`
   auto-resolves it with a comment saying no UI switches it; the topbar only
   holds the language selector. `README.md` says the active company is selected
   in the UI. `CompanySection.tsx` has a local `selectedId` that never calls
   `setActiveCompany`.
3. **History has no create action when populated.** Buttons exist only in
   `HistoryEmptyState`; the populated header shows a month-count badge.
4. **Month duplicate / placement.** In `ExpenseEntryCard.tsx` the month input
   lives inside the "Nouveau frais" card, while the header also shows a month
   badge. Deferred to increment A2.
5. **Technical copy in the UI.** "Calcul backend · recalcul automatique
   (300 ms)", "Étape 1", "Calcul backend" with Sparkles. Deferred to A2.
6. **Terminology drift.** Société/Entreprise, Templates/Modèle, Admin
   IA/Analyse IA, Postes/Frais/Types de frais. Deferred.

## Accessibility and responsive gaps (P2)

- `FieldGroup` renders hint/error ids but never wires `aria-describedby` on the
  input.
- `ViewTabs` uses `role=tablist/tab` but no roving tabindex / arrow keys /
  `aria-controls`.
- `ConfirmDialog` focuses Cancel and handles Escape but has no focus trap or
  focus restoration.
- `AmountConfirmButton` is a 32×32 icon-only button gating a primary action.
- `ExpenseLinesTable` `min-w-[760px]` inside a ~500-730px pane at 1024-1440px;
  the mobile tabs only activate below `lg` (1024px).
- Mobile nav links are ~30px tall (target ≥44px).
- Native `type="month"` / `type="date"` follow the OS locale, not the French
  display format.

## Cabinet design contract

| Area | Decision |
| --- | --- |
| Canvas | flat `#f6f7f5`, no gradients, no glass |
| Surfaces | pure `#ffffff`, `1px #e3e5e1` borders, 8px max radius |
| Accent | one deep green `#1b5b49` for primary action, active nav, focus ring |
| AI | neutral slate chip, label kept as "Détecté par IA"; no copper, no Sparkles |
| Text | `#1f2933` / `#5b6670`, body 14-16px, H1 24px, 600 headings |
| Fonts | system sans stack (`Segoe UI`/`Noto Sans`/system-ui); mono (`Cascadia Code`/SFMono/Consolas) for amounts and references; no serif in the app chrome |
| Numbers | `font-variant-numeric: tabular-nums`, mono for amounts |
| Shadows | `0 1px 2px` on cards at most; real elevation only for overlays |
| Labels | normal case, 11-12px, no letter-spaced uppercase eyebrows |
| Density | 8px grid, 32-36px table rows, labels above fields at 13px |
| Structure | Documents / Historique / Paramètres; persistent company context bar |
| Warmth | only the PDF preview (`react-pdf`) keeps paper, serif and margins |

Rejected alternatives: AI-Native UI (indigo/chat/sparkles) reproduces the
problem; pure Swiss minimalism is too austere for a document workflow; dark
financial dashboard is trading-terminal psychology; Legal Professional serif in
the chrome is the tell itself; Bento Grid is a marketing layout.

## Increments

- **A — workflow and context (this task, with B).** Generation links in `SECTIONS`
  and the mobile nav; a `CompanySwitcher` in the topbar wired to
  `useCompanyStore.setActiveCompany`; `CompanySection` selection/create/delete
  kept in sync; History header create actions. Deliberate updates to the two
  tests that lock the old absence of generation links and of a selector.
- **B — visual system (this task, with A).** Rewrite `index.css` tokens and
  primitives (`.card`, `.field`, `.btn`, `.badge`, `.eyebrow`, `.segmented`,
  `.expense-table`, `.glass-surface`, body background, heading font); light flat
  sidebar and mobile header; `PageHeader` 24px sans; neutral `AiBadge`.
  Token remapping restyles the rest of the app without touching 86 CSS files.
- **C — accessibility and responsive (next task).** `FieldGroup`
  `aria-describedby`; `ViewTabs` arrow keys and `aria-controls`; `ConfirmDialog`
  focus trap/restore; tap targets; table breakpoint; date/month display.

## Out of scope / follow-ups

- No global period state and no month relocation (A2).
- No generation-page copy rewrite (A2).
- No History company filter: history is already cross-company by design
  (task 37).
- No bundled webfont dependency: the system stack keeps the app offline.
  `@fontsource` (IBM Plex) is a follow-up if deterministic typography is wanted.
- No backend, `openapi/openapi.yaml`, migration, money, template or LLM change.

## Verification expectations

Frontend production code: full Vitest suite with coverage, lint, format check,
build, changed-line coverage ≥80% against the task base, and one full E2E run.
The CSS change is global: run the whole suite, not only the affected files.
