# The site — `apps/docs`, designed before it is built

> Written 2026-09-02, the day after the thirteenth component was built. This file is the
> site's design: what each screen is for, what it shows, and why it is shaped that way. The
> building itself went in eight steps, each committable and gate-green on its own, and the
> checkboxes for them lived in a working file that is temporary by design. This one is not —
> a step that lands writes its own decision record, and the drawing they are all built from
> is here, updated whenever a step teaches it something.

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

| route             | what it renders                                                                                | source (all generated or tracked)                                 |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/`               | the landing: hero, evidence strip, live components, gallery                                    | snapshots + registry, read at build                               |
| `/start`          | install, `ng add`, provide texts/theme, first form, SSR note                                   | hand-written page (site-local)                                    |
| `/components`     | the gallery: every component as a live card                                                    | the cards' front matter + demo registry                           |
| `/components/:id` | one component: live demos, code tabs, parts table, token table, a11y and keyboard sections     | `docs/components/*.md` + parts snapshot + `libs/tokens/dist`      |
| `/theming`        | the three token tiers, the full token inventory, dark/light, the override cookbook             | `libs/tokens/dist` names and values                               |
| `/trust`          | the axis worn outward: the registry rendered, the gates, mutation, lessons                     | `registry.md`, `mutation.snapshot.md`, [`00-axis.md`](00-axis.md) |
| `/support`        | versions, notice, codemods                                                                     | [`support.md`](support.md)                                        |
| `/acr`            | the Accessibility Conformance Report: WCAG 2.2 A and AA, one row per criterion, from the gates | [`acr.md`](acr.md), held by `check-acr`                           |

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
2. **The evidence strip — accessibility-led** (recalibrated 2026-09-02, on the
   maintainer's review of the first sketch: mutation scores and lesson counts are the
   builder's diary, not the buyer's question — and WCAG conformance is a procurement
   gate since the EAA, not an ornament). The tiles speak to the visitor's own stakes:
   **built and machine-audited to WCAG 2.2 AA** (never "conformant" — our gates end
   where axe ends, and the certification language waits for 2.2's ACR with a recorded
   assistive-technology pass); the colour pairs contrast-measured at build, both themes;
   axe across every component view in three engines, every commit; the 24 px touch
   floor measured per control; forced colors and reduced motion as first-class modes.
   Still **read from tracked files at build time — a number nothing generates does not
   appear.** The build machinery itself — mutants, the promise registry, decisions,
   lessons — moves wholesale to `/trust` for the auditor, with one teaser link here.
   And one tile the maintainer added on the same review: **AI-ready** — `llms.txt` and
   the machine catalogue (`components.json`: every component's selectors, parts and token
   names) sit at known addresses, generated by the same pass that feeds these pages — an
   agent reads the inventory the site renders and can verify what it suggests. That is
   2.5's axis worn on the front page, and the pipeline already emits both files.

   **Laid out as a stagger, not a row** (2026-09-04, chosen off a sketch of four): the five
   facts step down alternate sides and arrive one at a time as the section is scrolled to.
   Five equal cards in a row compete with each other; a fact that gets its own turn is read.
   There is deliberately **no rail and no dots** between them — a spine is a claim about
   order, and nothing here comes after anything else. The order itself is the argument's:
   the accessibility claim leads because it is what the library is for, **AI-ready** stands
   second because it is what nobody else offers, and the three numbers behind them are the
   evidence for the first.

   It costs height, measured at 1100px wide: the section goes from **229px to 649px**. That
   was the trade put in front of the maintainer in the sketch and taken with the number in
   view; the sketch's fuller variant, a full-width band per fact, was turned down for
   spending most of the first screens on proof before a visitor has decided to care. The
   arrival is armed by script and never by the stylesheet — this page is prerendered, so a
   fact that starts at `opacity: 0` in the static HTML is a fact nobody sees without
   JavaScript. No script, no JS, or `prefers-reduced-motion` and the five are simply there;
   the e2e case holds every one of them visible once the section is.

3. **Live, not screenshots.** A `pct-grid` of working components — a select open over its
   listbox, a date field, chips being dismissed, a stepper mid-journey — real instances,
   because the site runs the package it sells.
4. **The gallery teaser.** Component cards (again `pct-grid`, the `min` token doing the
   responsive work) linking into `/components/:id`.
5. **Three tiles of identity** linking `/trust`: probes before code · nothing breaks
   silently · tokens all the way down.

## The gallery, drawn in words

One card per component, and the claim each card makes is that **the component itself is on
it** — not a screenshot of it, not an icon standing for it. Sketch variant A, transferred
literally: **caption above, stage below**, so DOM order, visual order and focus order are one
sequence and there is nothing to defend.

The stage is `inert` and `aria-hidden`, which settles the arithmetic a keyboard reader meets:
one tab stop per card, whatever the scenes inside them hold. A live component that took focus
would make that count a function of whichever demos were on the page that day.

Two things about a card are measured rather than chosen.

- **It has to fit.** A scene authored for the component page's 675px stage overflows a card
  silently: the stage crops it, and the reader sees four of the button's six faces without
  being told that one was cut. Seven cards did exactly that before the scenes got a registry
  of their own, and it is a defect a green suite that counts tiles cannot see.
- **The hover gesture is the landing's**, worn by every card rather than by the three the
  landing shows. It is not decoration anybody re-types — three of its rules are measurements
  that each cost a silent defect to find — so both pages take it from
  `apps/docs/src/app/hero-edge.scss` and there is no second copy.

Above the cards stand the finder and the band bar, `docs-finder` and `docs-bar` — the same
two `/theming` and `/trust` use, so three long pages answer typing and name their bands the
same way; what this page keeps for itself is only how far each stands from the lead. The
match rule and the scroll spy are `find.ts` and `spy.ts` rather than a third copy. The six
`<h2>` bands exist so that a card can be **arrived at**: of twenty-four objections raised
against the first gallery, two stood, and both were that the page could not be.

## The component page, drawn in words

Redrawn on 2026-09-03 from two static sketches the maintainer chose between before a line
of code moved (plan 2.7): the second sketch's character with the first one's tables.

- **Three columns, one long page.** A component index on the left (every card under the
  category its own header files it in, a filter on top), the page in the middle, a pinned
  table of contents on the right with a scroll spy. The columns answer the container's
  width, never the viewport's; below the thresholds the index moves into the shell's drawer
  and the table of contents folds above the page.
- **The head is for choosing, not for auditing.** Name, status, category, and one short
  lead — the card's `**Summary:**` field, held by the content pass to a plain sentence with
  no link and no requirement number in it. What the component costs to import and what it
  is called are the spec line under it; the mutation counts that used to stand there moved
  to Evidence, and the card's reasoning with them. A reader deciding whether to use a
  component has not yet asked how it is proved (review, 2026-09-04).
- **The conformance claim is a sentence, not a field.** Under the spec line, one line saying
  which of three things is true: a W3C ARIA APG pattern is implemented (with its name and a
  link to the pattern), the platform's own element carries the semantics, or no pattern
  applies and none was invented — that one pointing down at Accessibility, where the card's
  argument is. It is the only claim in the head, so it is the only line there with a mark in
  front of it. The card's `**ARIA APG pattern:**` field is read as a small grammar to build
  it, and a card the reader cannot classify is refused rather than rendered badly.
- **Preview first.** The running component on a stage with the landing's glow, `pct-tabs`
  for Preview / Code, the code being **the demo's own source file** highlighted at build
  time — one source for the pixels and the snippet, so they cannot drift apart. The stage
  flips its theme and its writing direction on the reader's request. It centres its demo
  by shrink-wrapping it, so a demo of a layout — a column, a grid, a stack — states its
  own width; the stage would otherwise hand it none ([`lesson-146`](lessons.md#lesson-146)).
- **Usage**: install, import, the entry point's exports read from the source, and the
  card's shortest possible use.
- **Examples**: several running instances per card, each a demo file whose JSDoc carries
  the title and the prose beside the stage, the code under both.
- **API**: inputs, models and outputs read from the source with the JSDoc line each
  carries; what the directive writes on the element, from the decorator's own `host`.
- **Styling**: parts as selectors with a line each, tokens with a `$description` and both
  themes' defaults resolved, a theming fence applied live to a second instance.
- **Accessibility**: the keyboard map, and the card's Checks table read as a scorecard —
  the gaps shown in public beside the measurements, each naming its requirement.
- **Evidence**: the component's own mutation score, e2e cases, colour pairs, baselines and
  what its preview costs to render (elements, listeners, renders, and a dated clock — plan
  2.3) from the tracked snapshots; the card's design note — why it is built this way, with every
  link it needs; the decisions and lessons the card cites; the limitations.
- Copy is `pct-button`, the status is `pct-badge`, the filter is `pct-field`. Syntax
  highlighting is **shiki at build time**: zero highlighter shipped, both themes once.

## The pipeline

A build step owned by the app reads what the repository already generates — the component
cards, the parts snapshot, the token dist, the registry, the mutation snapshot — and emits
typed page data plus highlighted HTML. Nothing is written twice; the site cannot disagree
with the repository because it has no hand-typed copy of anything the repository measures.

The same pass emits **`llms.txt` and the machine-readable catalogue** — plan item 2.5,
which was always ordered "built with 2.1, not after it". Being the first component library
an agent can verify claims about is the axis worn outward, and it costs one extra emitter
on a generator that exists anyway. Since 2026-09-05 the catalogue is one object: every
component's canonical usage and examples as text, its API, parts, tokens, keyboard map, the
texts it prints and its evidence (the cost record included), and the `PctTexts` channel
with a meaning per key, the English defaults and a template typed against the interface —
a dictionary for another language is the consumer's file, because the package is measured
for one language with no register (`req-api-catalogue`).

## The bar the site itself meets

The library's own standards, applied to its shop window — anything less and `/trust` reads
as satire:

- **Static output.** Every route prerendered; hydration clean under the sandbox's idiom.
- **axe across every route in three engines**, the sandbox's a11y gate transplanted.
- **Visual baselines** for the landing and one component page, light and dark.
- **Performance read before written:** fonts self-hosted (Inter var, the face the e2e
  suite already pinned, and JetBrains Mono for code since 2.7.5), no runtime highlighter,
  no `@angular/animations` (the package gate's ban extends by construction — motion is
  CSS), and Lighthouse numbers **measured and recorded in the plan before any number is
  published on the page**.
- SEO plumbing: titles, descriptions, Open Graph, `sitemap.xml`, `robots.txt`.

**Mono does not become a second face.** It carries the strings — selectors, entry points,
tokens, the landing's index — and a mono heading makes it decoration, spending the distinction
the pages depend on to read. Decided 2026-09-08, and it reaches the gallery and the component
card, not one page.

## Deploy — decided later, built for now

The repository is private until the premiere, so there is nowhere public to deploy to and
no urgency to choose. The app builds to static files from day one, which keeps every host
equally cheap; the actual target (GitHub Pages against a custom domain, or a static host in
front of it) is a 3.1-day decision and is listed there, not here.

## The steps

The executable order was one step at a time, each committable and gate-green on its own:
layout entrypoint → button faces → theme directive → app scaffold → content pipeline →
landing → pages → the measured bar. All eight landed on 2026-09-02.

**The method of a pass over what is already built**, stated as a rule because the first one
found it by doing it: read the screen first, draw second, and transfer the accepted sketch
literally — so a no costs a sketch and never a stylesheet. Two of the six screens read in the
2026-09-08 pass were kept after being held beside their drawings, which is the process
working rather than failing ([`lesson-203`](lessons.md#lesson-203)).
