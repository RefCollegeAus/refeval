# RefEval Modernisation Plan

**RefEval Evolution — Phase 1: Referee College Design System**

Status: **Planning only — no code changed.** This document is the audit and roadmap requested
before any implementation begins.

Scope note: this is a *visual evolution*, not a redesign. Every finding and recommendation below
is scoped to preserve RefEval's existing workflows, screens, and information architecture exactly
as they are today. Nothing here proposes removing or restructuring a feature.

---

## Implementation status (updated as each phase ships)

The phase numbering below is the actual delivery sequence used during implementation — it does
not map 1:1 onto the "Phase 4–7" *proposed* roadmap in §9 below, which was written before any
code was touched and has since been superseded by how the work was actually sequenced.

| Phase | Scope | Status | Commit |
|---|---|---|---|
| 1 | Referee College Design System foundation — Tailwind token layer, `components/ui/*` primitives, `/style-guide` | Complete | `e53bb51` |
| 2 | App shell alignment — persistent `Sidebar`, `BrandBlock`, `Header` rebuild | Complete | `310e2c7` |
| 3 | Core dashboards — Educator Dashboard, Referee Home, Organisation Dashboard | Complete | `229c853` |
| 4 | Referee development experience — My Learning, review history/summary, My Goals, Development Timeline, My Comments | Complete | `3ef9451` |
| 5 | Review workspace (video/tagging chrome, sidebar, coded-clips table, modals) | **Code Complete — Authenticated QA Pending** (see below) | `8ae919a` |
| 6 | Educator and admin experience | In progress | — |

### Phase 5 status detail

- Implementation is complete: every planned surface (evaluation header, review setup bar, video
  area chrome, timeline label, sidebar analytics/breakdowns, Development Goals panel, coded clips
  table, `ReviewComments`, `ReviewDevelopmentPanel`, and the four review-workspace modals plus
  `ConfirmModal`) was migrated onto the shared design system.
- `npm run build` and `npx tsc --noEmit` both pass cleanly.
- Static/code-level verification is complete: an automated diff of every function-call identifier
  in the reviewer JSX before and after the change confirmed zero handler calls were dropped, and
  manual construction preserved every prop/handler reference exactly.
- **Live educator QA remains blocked.** No educator Supabase credentials are available in this
  environment (confirmed against `docs/BETA_QA_REGISTER.md`, which documents the same blocker
  from an earlier session, and against `.env.local`/`.env.dev`, which hold only project
  URL/anon-key config, no user passwords). Per standing policy, credentials are not rotated or
  reset to work around this.
- **The following still require authenticated, in-browser verification before release sign-off:**
  video playback (play/pause, seeking, ±5s), tagged-clip playback (start/end timestamp seeking,
  Rewatch, switching between clips from different source videos), the timeline scrubber and
  drag handles, the 8-step tagging wizard end-to-end (including edit/delete of an existing tag),
  comment load/reply/unread-state behaviour, development-goal linking/creation from a review,
  autosave and review-resume behaviour, and the final-summary/completion flow.
- **Phase 5 must not be treated as fully verified until that authenticated pass has run.** The
  review workspace will not be revisited or modified again until working educator credentials are
  available to complete it.

---

## How this audit was done

Both codebases were read directly, not sampled from memory:

- **RefOps** (`/Users/bilby/Developer/RefOps`) — Next.js 16.2, React 19, Tailwind CSS v4. Design
  tokens in `app/globals.css`, component library in `components/ui/*` (14 primitives) and
  `components/shell/*` (masthead, sidebar, brand).
- **RefEval** (`/Users/bilby/Downloads/referee_coder_web_tool_v5-2-8/refeval`) — Next.js 14.2,
  React 18, no CSS framework. All styling lives in one 589-line `app/globals.css` of hand-written
  CSS classes, applied directly in JSX (much of it inside one 2,300+ line `app/page.tsx`).

The headline finding up front, because it shapes everything else in this plan: **RefOps and
RefEval already share the same base colour palette and the same font family** — RefOps's tokens
were ported from RefEval's during an earlier phase (`--bg:#111112`, `--panel:#1c1c1e`,
`--accent:#a56a1b`, Inter, are byte-for-byte identical in both `globals.css` files). The gap
between the two products is not colour. It is **systemisation**: RefOps expresses that palette
through a typed, reusable component library with consistent spacing/radius/shadow scales; RefEval
expresses the same palette through hundreds of independently hand-coded, one-off CSS classes with
no shared scale, so near-identical UI (four separate "stat card" styles, three separate badge
systems, a dozen "sidebar"-like layouts) drifts slightly every time it's rebuilt from scratch.

---

## 1. Design philosophy

RefOps's design philosophy, as built, is: **one component, many call sites.** A card is `<Card>`.
A button is `<Button variant="..." size="...">`. A badge is `<Badge tone="...">`. Every screen
composes from the same ~14 primitives, so a visual change to "what a card looks like" is a
one-file edit that propagates everywhere, and every new screen inherits consistency by
construction rather than by discipline.

RefEval's philosophy, as built, is: **ship the screen.** Each phase of RefEval's development
(the CSS is literally commented by phase number — `/* Phase 14D */`, `/* Phase 17D */`, `/* Phase
6 */`) added new page-scoped classes (`ed-*` for the educator dashboard, `lh-*` for Learning Hub,
`sh-*` for the Stats Hub, `rv-*` for the review screen, `cl-*` for the Clip Library) rather than
reaching for a shared primitive. This is a completely reasonable way to move fast on a product
with RefEval's feature surface — but it means the visual system was never designed, only
accumulated. There are five different "sidebar" layouts, four different "stat card" recipes, and
three parallel badge systems, and none of them are more than 80% identical to any of the others.

**The philosophy for this modernisation is not "replace RefEval's approach with RefOps's."** It
is: **extract the small number of primitives RefEval's own screens already agree on**, express
them as typed components the way RefOps does, and retire the duplicated one-off CSS as each
screen is touched. RefEval keeps its own identity — dense data tables, timeline scrubbers, tagging
wizards, analytics dashboards are not RefOps concerns and shouldn't start looking like RefOps
screens — but the *chrome* around that content (cards, buttons, badges, empty states, the
header/nav) should feel like the same product family as RefOps, because it already uses the same
colours and the same typeface. Closing the systemisation gap is what makes that family
resemblance actually show up on screen.

---

## 2. Design principles

These are the rules the phased plan below is built to satisfy. They're written so any future
screen work — not just this modernisation — can be checked against them.

1. **One primitive per UI concept.** One Card, one Button (with variants), one Badge (with
   tones), one Table, one Modal, one EmptyState, one Toast. If a new screen needs something a
   primitive doesn't do, extend the primitive — don't fork a new CSS class family.
2. **Tokens, not literals.** Every colour, radius, shadow, and spacing value used in a component
   traces to a named token (a CSS variable or a Tailwind scale value), never a hand-typed hex or
   pixel number repeated at the call site. If `rgba(165,106,27,.18)` needs to exist, it exists
   once, not in 40 places.
3. **Preserve every workflow exactly.** No screen's information architecture, permission logic,
   keyboard shortcuts, or data flow changes. This is a skin and a component substrate, not a
   rebuild. (RefEval's timeline scrubber, tagging wizard, and hotkey system in particular are
   product differentiators, not visual debt — they are explicitly out of scope for restyling
   beyond token alignment.)
4. **Progressive, not big-bang.** RefEval ships continuously (the phase-numbered CSS comments are
   evidence of that cadence). The migration has to be screen-by-screen and shippable at every
   step, never a long-lived branch that blocks other work.
5. **Accessibility is a floor, not a nice-to-have.** Anywhere this plan touches a component that
   RefOps has already solved more rigorously than RefEval (focus trapping in modals, in
   particular — see §3), the RefOps behaviour is the target, not optional polish.
6. **RefEval keeps its own identity.** Video review surfaces, the tagging wizard, the analytics
   dashboards, and the timeline/marker UI are RefEval's actual product. This plan systemises their
   *chrome* (cards, buttons, spacing, badges) — it does not propose replacing them with RefOps
   equivalents, because RefOps has no equivalent screens to draw from.

---

## 3. Component audit

### Design tokens (spacing, radius, shadow) — the foundation everything else sits on

| Token | RefOps | RefEval | Finding |
|---|---|---|---|
| Border radius | Tailwind scale: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-full` (pill). 4 values, used consistently by concept (inputs/buttons = xl, cards/panels = 2xl, badges = full). | Hand-typed per class: 6, 7, 8, 9, 10, 12, 13, 14, 16, 18, 20, 22, 24px all appear, plus `999px` for pills. No mapping from "this is a card" to "this radius". | **High-impact.** This is the single biggest visible "these are different products" signal — RefOps cards read as more deliberate simply because every card shares one radius. |
| Shadow | Tailwind: `shadow-sm`, `shadow-lg`, `shadow-xl` — 3 values. | Hand-written per class, e.g. `0 2px 8px rgba(0,0,0,.30)`, `0 1px 4px rgba(0,0,0,.25)`, `0 1px 4px rgba(0,0,0,.28)`, `0 8px 32px rgba(0,0,0,.45)` — at least 6 distinct recipes with drifting alpha values that all appear to be reaching for "subtle card elevation" or "modal elevation" but never converge on the same numbers. | **Medium-impact, low-risk to fix** — a shadow token swap is invisible to workflow and low-risk to ship. |
| Spacing | Tailwind's 4px-based scale (`gap-1.5`, `gap-3`, `p-4`, `p-5`, `p-6`…) used consistently. | Hand-typed px values per class (6, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28px), not on a shared rhythm. | **Medium-impact.** Less visually obvious than radius/shadow but compounds — it's why some of RefEval's cards feel slightly cramped and others slightly loose. |
| Font family | Inter (via `next/font`, `--font-inter`). | Inter, declared directly in the CSS font stack. | **Already aligned** — no change needed. |
| Base colour palette | `--bg #111112`, `--panel #1c1c1e`, `--accent #a56a1b`, `--good #22c55e`, `--danger #ef4444`. | Identical values, same variable names, same file structure. | **Already aligned** — see §4. |

### Buttons

- **RefOps**: `Button`/`LinkButton` components, 5 semantic variants (primary/secondary/danger/good/ghost) × 2 sizes (sm/md), consistent `font-semibold`, one shared `focus-visible:outline-2 outline-accent` treatment defined once in `buttonClasses()`.
- **RefEval**: a single global `button` tag style plus modifier classes (`.primary`, `.danger`, `.good`, `.warn`, `.selected`) applied ad hoc at each call site — no size scale (font-size and padding are overridden inline per-screen with `style={{fontSize:12,padding:"4px 10px"}}`-style one-offs rather than a `sm` variant), font-weight is 800 (vs RefOps's 600/`font-semibold`), and there is no `ghost` equivalent.
- **Finding**: RefEval's buttons are functionally solid (focus-visible states already exist, hover/disabled states already exist) — this is a **componentisation** task, not a redesign. Wrapping the existing CSS behaviour in a typed `<Button variant size>` component and replacing the ~15 inline `style={{fontSize:...,padding:...}}` overrides scattered through `app/page.tsx` and the admin screens is mechanical, low-risk, and immediately removes the worst inconsistency (every "small button" currently reinvents its own padding/font-size).

### Cards

- **RefOps**: one `<Card>` primitive (`rounded-2xl border border-border bg-panel p-5 shadow-sm`), composed into `FeatureCard`, `TrustCard`, etc. for specific content shapes.
- **RefEval**: at least **six independently coded card families** that are all, structurally, "a bordered panel with a number/label" or "a bordered panel with an icon/title/description": `.ed-summary-card`, `.ed-kpi-card`, `.ed-hero-card`, `.lh-stat-card`, `.sh-snap-card`, `.groups-card`, `.rv-clip-card`. Each has its own radius (12–18px), its own shadow recipe, its own hover treatment (some translate on hover, some just change border colour, some do both).
- **Finding**: **highest-leverage single change in this plan.** These six families cover the large majority of RefEval's dashboard and summary screens (Educator Dashboard, Learning Hub, Stats Hub, Groups, Clip review). A base `Card` primitive plus 2–3 typed variants (a "stat card" with number+label, matching `sh-snap-card`'s existing hover-lift, and a "nav card" with icon+title+description, matching `lh-nav-card`) would let most of these six families collapse into one component with a `variant` prop, while keeping every existing visual affordance (colour-coded borders for good/warn/danger stat cards already exist and are worth keeping as a `tone` prop, mirroring RefOps's `Badge` tone pattern).

### Forms & Inputs

- **RefOps**: `FormField` wraps label + hint/error + input consistently; `Input`/`Select`/`Textarea` share one `rounded-xl border border-border bg-bg` treatment and one focus style (`focus:border-accent`).
- **RefEval**: global `input,select,textarea` styling is already reasonably consistent (one shared 14px-radius rule, one shared focus ring added in the "Phase 12.1 — UX polish" section of the CSS: `box-shadow: inset ... 0 0 0 3px rgba(165,106,27,.12)`). What's missing is the **wrapper**: RefEval's `label` is a bare CSS class with no structural link to hint/error text, so error and hint styling is done ad hoc per screen (inline `style={{color:"#fecaca"}}`-style overrides) rather than through one consistent pattern.
- **Finding**: **quick win.** The inputs themselves barely need to change visually — RefOps's `Input`/`Select`/`Textarea` radius (`rounded-xl` = 12px) is close enough to RefEval's existing 14px that a token unification (not a redesign) closes the gap. The real value is introducing a `FormField`-equivalent wrapper so error/hint text stops being reinvented per screen.

### Tables

- **RefOps**: `Table`/`TableHead`/`TableRow`/`TableHeaderCell`/`TableCell` — consistent `rounded-2xl` container, uppercase tracked headers, `bg-panel-2` header background, `text-muted` header text.
- **RefEval**: raw `<table>` elements styled entirely through global CSS (`.table-panel`, `.table-head`, plus the browser default `th,td` rule). One table (the referee's "My Reviews" table) has a dedicated responsive card-collapse pattern for mobile (`@media(max-width:720px)` turning rows into stacked cards) — genuinely good, accessible work — but it is **not applied to any other table** in the product (Members, Assignments, Clip Library, Playlist tables all stay in fixed-width `min-width:1000px` layout on mobile, meaning they horizontally scroll rather than reflow).
- **Finding**: **high-impact for mobile, currently inconsistent.** The responsive pattern already exists and already works — it just needs to be the *shared* Table component's behaviour, not a one-off built for a single screen. This is exactly the kind of change that should ship as "extract what already works into a shared component," per the design philosophy in §1.

### Empty states

- **RefOps**: `EmptyState` component — icon slot, title, description, optional action button, dashed border, `rounded-2xl`.
- **RefEval**: a single `.empty-state` CSS class — centered text in a solid (not dashed) `panel2` box, no icon slot, no action slot.
- **Finding**: **quick win.** Low risk, high visual payoff — empty states are one of the first things a new pilot association sees (Groups, Playlists, Clip Library before any data exists), and RefOps's icon+action pattern reads as noticeably more finished for near-zero implementation cost.

### Badges

- **RefEval currently runs three parallel badge systems**: `.status`/`.status.review`/`.status.done`/`.status.incorrect` (review workflow), `.status-badge`/`.status-pending`/`.status-active` (membership), `.role-badge`/`.role-super_admin`/`.role-admin`/`.role-educator`/`.role-referee`/`.role-viewer` (role display). Each independently hardcodes its own rgba colour pairs — several of which (the "good"/green family in particular) duplicate the same `rgba(34,197,94,...)` values already used in `AppToast.tsx`'s inline success styling, `.ed-summary-done`, `.lh-stat-card--good`, and `.sh-snap-card--good`, none of which reference each other.
- **RefOps**: one `Badge` component, one `tone` prop (`neutral`/`accent`/`good`/`warn`/`danger`), with a code comment explaining *why* `text-text/70` was chosen over `text-muted` for contrast reasons (a WCAG AA finding from real QA) — a level of accessibility rigour RefEval's ad hoc badges haven't had applied to them.
- **Finding**: **high-impact, moderate effort.** Three systems collapsing into one `Badge` component with a `tone` prop is mechanical once the tone→colour mapping is decided, and it's the single change most likely to make every list/table screen in RefEval feel visually consistent with itself, before RefOps enters the picture at all.

### Modals

- **RefOps**: `Modal` component — focus trap (Tab/Shift+Tab cycling), Escape-to-close, background scroll lock, unique per-instance ARIA ids, focus restored to the trigger element on close.
- **RefEval**: `ConfirmModal` and the wizard/setup modals are built directly on `.modal-backdrop`/`.modal` CSS with no evidence of focus trapping or Escape handling in the component code read for this audit.
- **Finding**: **the one place this plan recommends more than a visual change.** This isn't a styling gap, it's an accessibility gap RefOps has already solved. Recommend porting the *behaviour* (focus trap, Escape, scroll lock, restore-focus) alongside the visual token alignment, using RefOps's `Modal` as the reference implementation — not because it needs to look identical, but because keyboard-only and screen-reader users currently have a materially worse experience in RefEval's modals.

### Toasts

- **RefOps** and **RefEval** are architecturally almost identical already (portal-rendered, single-instance, 4500ms auto-dismiss, `role="alert" aria-live="assertive"`) — this was clearly built by the same hand. The only real difference: RefOps expresses tone via Tailwind classes referencing shared tokens (`border-good/40 bg-good/15`); RefEval hardcodes the same colours as local `rgba()` literals inside the component, and has 3 tones (success/error/info) where RefOps has 4 (adds `warning`).
- **Finding**: **quick win, very low risk.** Swap the inline style object for token references and add the `warning` tone. No behaviour change at all.

### Motion

- Both products use lightweight CSS transitions (`border-color .12s`, `background .1s`, `transform .15s`) and both already have decent hover feedback (RefEval's `.sh-snap-card:hover{transform:translateY(-2px)}` is functionally the same idea as RefOps's `motion-safe:hover:-translate-y-1` on `FeatureCard`).
- **Gap**: RefOps has a `Reveal` component (scroll-triggered fade/slide-in via `IntersectionObserver`) used on marketing and dashboard sections, and — importantly — it explicitly checks `prefers-reduced-motion` and skips all animation for users who've requested it. **RefEval's `globals.css` has no `prefers-reduced-motion` handling anywhere.** This is the one motion-related accessibility gap worth calling out directly.
- **Finding**: **low-impact visually, worth doing anyway** — a scroll-reveal on dashboard sections is optional polish; the `prefers-reduced-motion` handling is not optional, it's a real accessibility gap that costs almost nothing to close (a single global media query).

### Icons

- Both products use `lucide-react`. **Already aligned — no change needed.** This is one dimension where "bring RefEval into RefOps's design language" is already true.

---

## 4. Colour audit

**The palettes are already the same.** Side-by-side, both `globals.css` files declare:

```
--bg:#111112  --panel:#1c1c1e  --panel-2/panel2:#242426  --panel-3/panel3:#2c2c2e
--text:#f5f5f5  --muted:#8e8e93  --border:#38383b
--accent:#a56a1b  --accent-2:#bf7c21 (RefOps only, gradient end)
--good:#22c55e  --danger:#ef4444
```

The difference is entirely in **how the palette is consumed**:

- **RefOps** maps every one of these into Tailwind's `@theme` layer (`--color-accent: var(--accent)`, etc.), so components reference them as class names — `bg-accent/15`, `text-good`, `border-warn/40`. A colour change is a one-line edit to `globals.css` that propagates everywhere automatically. Semantic opacity variants (`/15`, `/40`) are expressed consistently through Tailwind's opacity modifier syntax.
- **RefEval** references the CSS variables directly in some places (`background:var(--panel2)`) but far more often **hardcodes the equivalent `rgba()` literal instead** — `rgba(165,106,27,.18)` (an accent tint) appears as a raw literal at least 15 separate times across the CSS file, in addition to the ~10 places it's expressed via `var(--accent)` with an inline opacity. Nothing enforces that these stay in sync if the accent colour ever changes.
- **Status colours** (good/warn/danger) are consistently used *semantically* in both products (green = success/active, amber = pending/warning, red = danger/incorrect) — this is good news, it means no remapping decision is needed, only tokenisation of values that are already conceptually correct.

**Recommendation**: this is the lowest-risk, highest-leverage first move in the entire plan.
Introducing Tailwind CSS v4 (see §9, Phase 1) and mapping RefEval's existing `:root` variables
into its `@theme` layer — exactly as RefOps already does — makes every hardcoded `rgba(165,106,27,…)`
literal replaceable with `bg-accent/18` in a mechanical, screen-by-screen pass, with **zero
colour decisions to make**, because the colours were never wrong.

---

## 5. Typography audit

| | RefOps | RefEval |
|---|---|---|
| Typeface | Inter | Inter (identical) |
| Scale | Tailwind's default type scale used consistently (`text-xs`/`sm`/`base`/`lg`/`xl`/`2xl`/`3xl`), applied by semantic role (card title = `text-base font-semibold`, section heading = `text-2xl font-bold`, eyebrow = `text-xs font-bold uppercase tracking-wide`) | No defined scale. Font sizes are hand-typed per element: 10, 11, 12, 13, 14, 15, 17, 18, 20, 22, 24, 28, 30, 32px all appear somewhere in `globals.css` alone (before counting inline `style={{fontSize:...}}` overrides in the components, of which there are many). |
| Weight | Two weights used by role: `font-semibold` (600) for emphasis, `font-bold` (700) for headings. | Weight jumps between 700/800/900/950 with no apparent rule — numbers (`.ed-summary-number`, `.lh-stat-number`) are consistently 950, but labels/eyebrows/buttons oscillate between 700 and 900 without an obvious pattern tied to their role. |
| Letter-spacing | `tracking-wide`/`tracking-wider` used only on uppercase eyebrow/label text. | Same *intent* (`.06em`–`.13em` letter-spacing on uppercase labels) but the exact value varies per class (`.06em`, `.07em`, `.08em`, `.13em`) rather than one shared "eyebrow" treatment. |
| Numeric tables (stats/timers) | Not heavily used outside a few metrics. | `font-variant-numeric: tabular-nums` is already used correctly on the timer and clip-time displays — a nice detail RefOps doesn't currently need but RefEval got right independently. |

**Finding**: typography is the dimension where RefEval has drifted furthest from a system, purely
through organic growth (each phase's CSS added new one-off sizes rather than reusing an existing
one). The fix is **not** changing the typeface or the overall feel — Inter at roughly these sizes
already reads as "the same font family" as RefOps. It's collapsing ~14 ad hoc font-sizes down to a
6–7 step scale (mirroring Tailwind's `xs`/`sm`/`base`/`lg`/`xl`/`2xl`/`3xl`) and tying weight to
semantic role instead of per-class habit. This is mechanical, screen-by-screen, and — done through
Tailwind utility classes once introduced — nearly impossible to get inconsistent again by accident.

---

## 6. Navigation audit

This is the largest *structural* (not just visual) gap between the two products.

**RefOps** has a dedicated app shell: a persistent `Sidebar` (grouped nav items with section
labels, active-state highlighting, per-item attention badges, off-canvas drawer on mobile) below a
sticky `ApplicationHeader` masthead (brand crest + product name, organisation identity chip,
notifications, user menu). Navigation and branding are deliberately separated — the header owns
brand, the sidebar owns wayfinding.

**RefEval** has no persistent sidebar for its main navigation. `Header.tsx` combines brand
(crest + "RefCoach" + eyebrow) with a single row of horizontal nav pills (`Home`, `Learning`,
`Organisation`, `Dashboard`) plus a utility cluster (search, notifications with a count badge,
profile, logout) — all in one flat row, ungrouped. A left sidebar (`.org-sidebar`) exists, but
only inside Organisation Settings; it is not the product's primary navigation pattern. Several
individual screens (Educator Dashboard, Learning Hub, Stats Hub, the review screen) each build
their *own* local two-column layout with a sticky right-hand "sidebar" of contextual widgets
(`.ed-sidebar`, `.lh-sidebar`, `.rv-sidebar`, `.sh-filter-col`) — these are content sidebars, not
navigation, and are a different (reasonable) pattern from RefOps's nav sidebar, not a duplicate of
it.

**A naming inconsistency worth flagging factually, not resolving here**: the product is branded
"RefCoach" in the header, the login screen, and the browser tab title, but "RefEval" in one
transactional email/auth screen (`set-password`) and throughout the TypeScript types
(`RefEvalSession`) and the repository/folder name itself. This is outside a design-system audit's
scope to resolve (it's a product-naming decision), but it will surface again the moment any shared
`BrandBlock`-equivalent component is introduced, since that component needs one canonical product
name to render.

**Finding**: RefOps's Sidebar/Header split is a genuinely better navigation pattern than RefEval's
flat pill row once RefEval's nav grows past its current 4 destinations (RefEval already has more
top-level areas than the header currently exposes — e.g. Groups, Clip Library, and Assignments are
reached by navigating *through* Learning rather than being top-level) — but this is the one
audit area where "bring RefEval into RefOps's design language" genuinely means a structural
change, not a token swap, and it should be sequenced *after* the component-library foundation
(§9, Phase 2+), not attempted first.

---

## 7. Quick wins

Ordered by (visual impact ÷ effort), independent of each other, each shippable in isolation
without touching workflow logic:

1. **Empty states** — swap `.empty-state` for an `EmptyState`-equivalent component with an icon
   slot and optional action. Every screen with zero data (new pilot associations will see several
   of these on day one) looks immediately more finished.
2. **Toast tone tokens** — replace `AppToast.tsx`'s inline hex colour object with token references
   and add the missing `warning` tone. Zero behaviour change, pure cleanup.
3. **`prefers-reduced-motion` support** — one global media query added to `globals.css`, closes a
   real accessibility gap that currently has zero coverage.
4. **Shadow token consolidation** — collapse the ~6 hand-written `box-shadow` recipes down to 2–3
   consistent elevation levels. Invisible to workflow, immediately makes stacked cards/panels feel
   more coherent.
5. **Badge tone unification** — merge `.status`, `.status-badge`, `.role-badge` into one tone
   system. High visual payoff (every table/list screen uses at least one of these) for mechanical
   effort once the tone→colour mapping is written down.
6. **Responsive table pattern, applied everywhere** — the card-collapse mobile pattern already
   built for the referee's reviews table gets applied to Members, Assignments, and Clip Library
   tables. The hard part (writing the pattern) is already done; this is rollout.

## 8. High-impact redesigns

These require more coordination (a shared component to design, multiple call sites to migrate)
but are where the "premium, same family as RefOps" feeling actually gets established:

1. **Introduce Tailwind CSS v4 and a token layer** — the prerequisite for everything else in this
   list. Map RefEval's existing `:root` variables into Tailwind's `@theme`, exactly as RefOps does.
   This alone doesn't change how anything looks (the values are identical) — it's what makes every
   subsequent step mechanical instead of manual.
2. **Card primitive + 2–3 variants**, replacing the six independent card families (`ed-summary-card`,
   `ed-kpi-card`, `ed-hero-card`, `lh-stat-card`, `sh-snap-card`, `groups-card`). This is the
   single highest-leverage visual change — it touches the Educator Dashboard, Learning Hub, Stats
   Hub, and Groups screens simultaneously, which together are most of what an educator or admin
   sees day-to-day.
3. **Button and Badge components**, replacing the inline style overrides and the three parallel
   badge systems. High call-site count (every table, every status display) but mechanical once the
   component exists.
4. **Table primitive with built-in responsive collapse**, replacing raw `<table>` + `.table-panel`.
5. **Modal component with focus trap / Escape / scroll-lock**, ported from RefOps's implementation.
   The only item on this list that's an accessibility fix as much as a visual one.
6. **Navigation restructure** (persistent grouped sidebar, RefOps-style masthead) — the largest
   single change in scope, deliberately sequenced last because every other item on this list makes
   it lower-risk (by the time nav is touched, the screens behind it are already using shared
   components, so the nav change doesn't also have to fight one-off CSS).

---

## 9. Implementation phases

Each phase should ship and be used in production before the next begins — this mirrors RefEval's
existing phase-numbered CSS history and keeps the migration reversible at every step.

### Phase 1 — Foundation (tokens, no visible change)
Introduce Tailwind CSS v4. Map existing `:root` colour variables into `@theme`. Define the radius,
shadow, and spacing scales (mirroring RefOps's). **Goal: ship a build where nothing looks
different**, proving the token layer is correct before anything is migrated onto it. This phase is
almost entirely infrastructure risk, not design risk (see §11).

### Phase 2 — Primitives
Build the component library: `Card` (+ variants), `Button`, `Badge`, `EmptyState`, `Table`
(+ responsive collapse), `Modal` (+ focus trap), `Toast` token cleanup, `FormField`. None of these
are wired into existing screens yet — they're built and unit-tested against the design principles
in §2, using RefEval's *existing* visual behaviour as the spec (same colours, same hover
treatments, same radius decisions where RefEval already agreed with itself, e.g. `sh-snap-card`'s
hover-lift becomes the `Card` variant's default hover).

### Phase 3 — Quick wins rollout
Ship every item in §7 across the whole product. These are independent, low-risk, and immediately
visible — good for building confidence (and stakeholder buy-in) before the higher-effort phases.

### Phase 4 — High-traffic screens
Migrate the Educator Dashboard, Learning Hub, and Stats Hub onto the new `Card`/`Button`/`Badge`
primitives — these three screens account for the six duplicated card families identified in §3,
so migrating them collapses the most duplication for the least additional work. Typography scale
cleanup (§5) happens screen-by-screen as part of this pass, not as a separate phase — it's
mechanical once a screen is already being touched for its cards/buttons.

### Phase 5 — Remaining screens
Migrate Groups, Clip Library, Assignments, Members, Organisation Settings, and the referee-facing
screens (My Learning, Referee Stats Hub, Referee Review) onto the same primitives. Apply the
responsive table pattern to every remaining table.

### Phase 6 — Review screen & tagging wizard (highest workflow risk, done last deliberately)
The video review screen (`ReviewComments`, the timeline/marker UI, the tagging wizard) is
RefEval's core differentiating workflow and its most complex screen (the reviewer fragment sampled
during this audit is ~2,000 lines of tightly-coupled inline JSX). Token/component alignment here
(cards, buttons, badges) ships in this phase; the timeline scrubber and hotkey system are **out of
scope** for restyling — they work well today and the risk of touching them for a purely visual
change isn't justified.

### Phase 7 — Navigation restructure
The persistent grouped sidebar and RefOps-style masthead (§6, §8.6). Sequenced last because it's
the largest single change and benefits most from every screen behind it already being consistent.

---

## 10. Estimated effort

Effort is given in relative terms (small/medium/large), not calendar time, since RefEval's actual
development velocity and team size weren't part of what was audited here — these are sizing
inputs for whoever schedules the work, not a committed timeline.

| Phase | Effort | Why |
|---|---|---|
| 1 — Foundation | **Small–Medium** | Mechanical token mapping, but requires care (a wrong token value would be invisible until a component starts using it). No JSX changes. |
| 2 — Primitives | **Medium** | ~9 components, most with a direct RefEval CSS class to draw behaviour from (not designed from scratch) — closer to "extract and generalise" than "invent." Modal's focus-trap port is the one piece of genuinely new logic. |
| 3 — Quick wins | **Small** | Explicitly scoped in §7 to be small; several are single-file changes. |
| 4 — High-traffic screens | **Large** | Three of the most complex screens in the product, each with several hundred lines of markup to migrate off page-specific CSS classes onto shared components, while re-verifying every existing interactive state (hover/active/selected/badge counts) still renders correctly. |
| 5 — Remaining screens | **Large** | More screens than Phase 4, but each individually simpler (less bespoke layout than the dashboards). |
| 6 — Review screen | **Medium–Large** | Narrow scope (chrome only, not the timeline/wizard logic) but high care required given the screen's complexity and centrality to the product. |
| 7 — Navigation | **Medium** | Well-defined target (RefOps's existing Sidebar/ApplicationHeader), but touches every screen's shell simultaneously, so regression surface is the whole product at once — recommend a feature flag or parallel route during rollout. |

**Overall**: this is a multi-phase programme of work, not a sprint — proportionate to auditing 17
dimensions across ~59 components and one 589-line global stylesheet with no existing component
abstraction. Phases 1–3 are low-risk and could reasonably run back-to-back; Phases 4–7 each
warrant their own scheduling and QA pass given their screen count and workflow sensitivity.

---

## 11. Risk assessment

| Risk | Phase(s) | Severity | Mitigation |
|---|---|---|---|
| Introducing Tailwind CSS v4 alongside 589 lines of existing hand-written global CSS creates a period where both systems coexist and can conflict (specificity fights, duplicate rules). | 1–5 | **Medium** | Phase 1 explicitly ships with zero visible change before anything migrates onto the new tokens — if a conflict exists, it surfaces immediately in an empty diff, not buried under real content changes. Migrate screen-by-screen, never both systems styling the same element. |
| RefEval's framework versions (Next 14.2 / React 18) trail RefOps's (Next 16.2 / React 19) — Tailwind CSS v4 works fine on Next 14, but this plan should not be read as also proposing a framework upgrade. | 1 | **Low, but worth stating explicitly** | Framework upgrade is a separate decision with its own risk profile and is out of scope for this design-system plan. Flag it as a distinct future initiative, not a dependency. |
| The video review screen (Phase 6) is RefEval's most complex and most workflow-critical surface, built as ~2,000+ lines of tightly-coupled inline JSX with no existing component boundaries. | 6 | **High** | Deliberately sequenced last, after the team has practice migrating simpler screens onto the same primitives. Scope is explicitly limited to chrome (cards/buttons/badges) — the timeline, marker, and hotkey logic are not touched. |
| Navigation restructure (Phase 7) changes the shell every single screen renders inside. A regression here is product-wide, not screen-local. | 7 | **High** | Sequenced last for exactly this reason. Recommend shipping behind a flag or on a small subset of accounts first, given the blast radius. |
| Badge/status colour remapping could unintentionally change the *meaning* users have learned to associate with a colour (e.g. if "pending" shifts from amber to a different tone during consolidation). | 3, 5 | **Medium** | §3's finding is explicit: RefEval's existing semantic mapping (green=good, amber=pending/warning, red=danger) is already correct and should be preserved as-is, not redecided. Consolidation is about removing duplicate *implementations* of the same mapping, not changing the mapping. |
| Modal focus-trap port (Phase 2) is genuinely new logic for RefEval, not extracted from existing behaviour — higher chance of a subtle bug (e.g. focus trap breaking a modal that dynamically adds/removes fields, like the tagging wizard's multi-step modal). | 2, 6 | **Medium** | Use RefOps's `Modal` implementation as a direct reference (it already handles the dynamic-focusable-elements case via a live `querySelectorAll` on each Tab press, not a cached list) rather than reimplementing from scratch. Test explicitly against RefEval's multi-step wizard modal, since that's the one modal shape RefOps doesn't have an equivalent of. |
| Product naming inconsistency ("RefCoach" vs "RefEval" vs `RefEvalSession` types) will surface as soon as a shared `BrandBlock`-equivalent is built, since RefOps's version takes one `productName` string. | 7 (or earlier, incidentally) | **Low technically, needs a decision** | Not a design-system risk to *solve*, but flagging it now means it doesn't become a surprise mid-implementation. Needs one product-naming decision from the business before the masthead component is built. |
| Team bandwidth / scope creep — each phase touches enough surface area that "just fix this one other thing while I'm in here" is a constant temptation, especially in Phases 4–6. | All | **Medium** | Design principle #4 (progressive, not big-bang) and #3 (preserve every workflow exactly) exist specifically to hold this line. Recommend each phase's PR/commit scope be reviewed against "did this change how anything *works*, or only how it *looks*" before merge. |

---

## Summary

RefOps and RefEval are closer than they look. The colours are identical, the font is identical,
the icon library is identical, and RefEval's own hand-built CSS already contains correct instincts
— consistent semantic colour use, a working responsive table pattern, working focus-visible
states, working (if under-used) hover motion. What's missing is systemisation: RefEval never had a
component library to consolidate five years of phase-by-phase feature work into. This plan's
central move is to extract the primitives RefEval's own screens already agree on, express them the
way RefOps does (typed components over a token layer), and roll them out screen-by-screen — most
visibly first (Quick Wins, then the three highest-traffic dashboards), most workflow-sensitive
last (the review screen, then navigation). Nothing in this plan asks RefEval to look like RefOps's
*screens* — a video review tool and a rostering platform are different products — only to be built
from the same kind of disciplined, reusable parts, so the two products read as members of the same
Referee College family.
