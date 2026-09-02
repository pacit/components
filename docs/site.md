# The site — `apps/docs`, designed before it is built

> Written 2026-09-02, the day after the thirteenth component closed 1.1. This file is the
> design that plan item **2.1** executes step by step: the plan holds the checkboxes
> (2.1.1–2.1.8), this file holds the reasons and the shape. Each step still writes its own
> decision record when it lands — the plan dies, an ADR does not, and this file is neither:
> it is the drawing the steps build from, updated when a step teaches it something.

## What the site is for

A component library is judged in the first ten seconds of its site, before a single API is
read. The bar is named: **angular.dev** (identity, motion, the animated gradient that makes
a framework feel alive) and **primeng.dev** (every component live on the page, its code one
click away). A site below that bar says "hobby project" regardless of what the gates prove.

But matching the bar is table stakes, not the pitch. The one thing no other library can put
on a landing page is this repository's own axis: **every number on the page is measured by
the machinery it advertises.** The mutation score comes from
[`mutation.snapshot.md`](../libs/components/mutation.snapshot.md), the promise counts from
[`registry.md`](registry.md), the parts inventory from the parts snapshot — read at build
time, never typed into a template. Where angular.dev sells motion and primeng sells volume,
this site sells **proof**, wearing the other two's craft so the proof gets looked at.

Working headline, gradient on the last two words: **"Components that prove themselves."**

## The law: built from the library it documents

The site is the deepest demo the library will ever have, so it is built from
`@pacit/components` — the real package surface, not a private fork of it. Two consequences:

- **Anything the site needs and the library lacks becomes library work first**, at the full
  1.1 definition of done (decision, tokens, unit, e2e in three engines, mutation, card).
  The gaps are named below, and they are consumer features in their own right, not site
  props.
- **What stays site-local is chrome, and it is listed**, so the boundary is a decision and
  not a drift: the page shell composition, the markdown/code rendering pipeline, the
  gradient headline style (until a second consumer repeats it — the extraction law of
  [`lesson-21`](lessons.md#lesson-21) applies to flourishes too), SEO plumbing.

The sandbox keeps its job untouched: it is the e2e rig, deliberately plain. The site is the
shop window. Two apps, two jobs — exactly the split
[`req-project-apps`](requirements/project.md#req-project-apps) promises.

## What the library is missing, named

**The layout entrypoints — `container`, `stack`, `grid`** — the site's skeleton, and the
first thing a consumer building an app around these components asks for. Three small
components, no ARIA at all (layout is presentational; the platform's `div` is enough).
_Built as three entrypoints, not the one `layout` this file first said: a component token's
first word must be a real entrypoint (`check-tokens` point 3), so `--pct-container-*`
demands `@pacit/components/container` — the reasoning is 0057's._

- `pct-container` — centres a reading column: `max-inline-size` from a token, an inline
  padding ramp from `clamp()`, and `container-type: inline-size` so children can respond to
  **it** rather than to the viewport.
- `pct-stack` — vertical rhythm: flex column with a `gap` chosen from the spacing scale by
  input, instead of every consumer hand-rolling margins.
- `pct-grid` — the responsive workhorse:
  `repeat(auto-fit, minmax(min(100%, var(--pct-grid-min)), 1fr))`. Cards find their own
  column count from one "minimum card width" token. **Responsive without a single media
  query in consumer code** — the pitch is the mechanism itself.

Logical properties by construction (the styles gate already enforces it), forced-colors
neutral, nothing to announce. The e2e proof is geometric: column counts measured at three
widths, in three engines.

**The button's new faces** — today `PctButtonVariant` is `solid | outline`. It grows:

- `ghost` — no surface until hover; toolbars and top bars.
- `soft` — a tinted resting surface; secondary actions. Real colours from new primitive
  stops, because [`req-token-no-opacity`](requirements/tokens.md#req-token-no-opacity)
  forbids faking a state with opacity.
- `hero` — the showpiece the maintainer asked for by name: an animated gradient surface
  (blue → violet → cyan; the violet and cyan ramps are new primitives), a soft glow, white
  text. **The gradient is three contrast checks, not one** — the text must clear the
  contrast policy against every stop it can sit on, which is the kind of sentence only this
  library gets to write. Reduced motion freezes the drift
  ([`req-a11y-motion`](requirements/a11y.md#req-a11y-motion)); forced colors collapses it
  to the solid face.

One directive, five faces, three sizes — the "many buttons that look nothing alike" the
maintainer wants, without a second button component.

**The theme directive** — [`req-token-directive`](requirements/tokens.md#req-token-directive)
has been a gap "until setting `data-theme` from a template starts to repeat". The docs app
is that repetition: the sandbox sets the attribute by hand today, the site would be the
second place. The gap's own trigger has fired, so the directive gets built and the gap
closes — the site's first measurable effect on the registry before it renders a page.

## Information architecture

| route             | what it renders                                                                            | source (all generated or tracked)                                 |
| ----------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `/`               | the landing: hero, evidence strip, live components, gallery                                | snapshots + registry, read at build                               |
| `/start`          | install, `ng add`, provide texts/theme, first form, SSR note                               | hand-written page (site-local)                                    |
| `/components`     | the gallery: every component as a live card                                                | the cards' front matter + demo registry                           |
| `/components/:id` | one component: live demos, code tabs, parts table, token table, a11y and keyboard sections | `docs/components/*.md` + parts snapshot + `libs/tokens/dist`      |
| `/theming`        | the three token tiers, the full token inventory, dark/light, the override cookbook         | `libs/tokens/dist` names and values                               |
| `/trust`          | the axis worn outward: the registry rendered, the gates, mutation, lessons                 | `registry.md`, `mutation.snapshot.md`, [`00-axis.md`](00-axis.md) |
| `/support`        | versions, notice, codemods                                                                 | [`support.md`](support.md)                                        |

English, LTR, `lang="en"` — the site is prose and falls under
[`req-project-language`](requirements/project.md#req-project-language) like everything
else. (The components under demo stay RTL-proof; the page around them does not pretend to
be localised.)

## The landing, drawn in words

Dark-first — near-black slate under a soft blue radial glow — with the light theme one
toggle away and honest in both (the token system already keeps the pairs measured either
side). Top to bottom:

1. **Hero.** The headline in Inter at display size, the gradient animating across its last
   two words — background-clip text, an eight-second drift, frozen under reduced motion.
   Under it one sentence of pitch, then two buttons from the library: `variant="hero"`
   ("Get started") beside `variant="outline"` ("Components"), then the install line
   `npm install @pacit/components` with a copy button that answers through `pct-toast`.
2. **The evidence strip.** Four to six numbers with their units of proof: mutants killed
   and the score, promises enforced out of promises made, engines, decision records,
   lessons. **Read from tracked files at build time — a number nothing generates does not
   appear.** Each tile links to `/trust`.
3. **Live, not screenshots.** A `pct-grid` of working components — a select open over its
   listbox, a date field, chips being dismissed, a stepper mid-journey — real instances,
   because the site runs the package it sells.
4. **The gallery teaser.** Component cards (again `pct-grid`, the `min` token doing the
   responsive work) linking into `/components/:id`.
5. **Three tiles of identity** linking `/trust`: probes before code · nothing breaks
   silently · tokens all the way down.

## The component page, drawn in words

The primeng lesson, sharpened: **demo first, code beside it, inventory below it.**

- Live demos at the top, each one a small standalone component in the app; the code tab
  shows **the demo's own source file**, highlighted at build time — one source for the
  pixels and the snippet, so they cannot drift apart.
- Code tabs are `pct-tabs`. Copy is `pct-button`. The panel chrome is `pct-container` and
  `pct-stack`. The page is the library using itself in front of the reader.
- Below: the card's own sections rendered (what it is, the state machine, a11y, keyboard),
  then the parts table and the token table — generated inventories, names copyable.
- Syntax highlighting is **shiki at build time**: zero highlighter shipped to the client,
  both themes emitted once.

## The pipeline

A build step owned by the app reads what the repository already generates — the component
cards, the parts snapshot, the token dist, the registry, the mutation snapshot — and emits
typed page data plus highlighted HTML. Nothing is written twice; the site cannot disagree
with the repository because it has no hand-typed copy of anything the repository measures.

The same pass emits **`llms.txt` and the machine-readable catalogue** — plan item 2.5,
which was always ordered "built with 2.1, not after it". Being the first component library
an agent can verify claims about is the axis worn outward, and it costs one extra emitter
on a generator that exists anyway.

## The bar the site itself meets

The library's own standards, applied to its shop window — anything less and `/trust` reads
as satire:

- **Static output.** Every route prerendered; hydration clean under the sandbox's idiom.
- **axe across every route in three engines**, the sandbox's a11y gate transplanted.
- **Visual baselines** for the landing and one component page, light and dark.
- **Performance read before written:** fonts self-hosted (Inter var, the face the e2e
  suite already pinned), no runtime highlighter, no `@angular/animations` (the package
  gate's ban extends by construction — motion is CSS), and Lighthouse numbers **measured
  and recorded in the plan before any number is published on the page**.
- SEO plumbing: titles, descriptions, Open Graph, `sitemap.xml`, `robots.txt`.

## Deploy — decided later, built for now

The repository is private until the premiere, so there is nowhere public to deploy to and
no urgency to choose. The app builds to static files from day one, which keeps every host
equally cheap; the actual target (GitHub Pages against a custom domain, or a static host in
front of it) is a 3.1-day decision and is listed there, not here.

## The steps

The executable order lives in [`plan.md`](plan.md) as **2.1.1–2.1.8**, one checkbox per
step, each one committable and gate-green on its own: layout entrypoint → button faces →
theme directive → app scaffold → content pipeline → landing → pages → the measured bar.
"Do the next step" means: open the plan, take the first unchecked box of 2.1.
