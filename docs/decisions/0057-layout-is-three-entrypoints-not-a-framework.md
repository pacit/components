# 0057 — Layout is three entrypoints, not a framework

**Status:** accepted
**Implements:** [`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-scoped`](../requirements/tokens.md#req-token-scoped),
[`req-token-logical`](../requirements/tokens.md#req-token-logical),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking)
**Evidence:** `libs/components/container/`, `libs/components/stack/`,
`libs/components/grid/`, the geometry readings in `apps/sandbox-e2e/src/layout.spec.ts`
(computed lengths and bounding boxes in three engines), the unit suites beside each source

## The question

The documentation site ([site.md](../site.md), plan 2.1) needs a skeleton: a capped reading
column, vertical rhythm, and card grids that answer every width. So does every consumer
building an application around these components — which is exactly the trap: "layout" is how
a component library swells into a CSS framework, with utility classes, a twelve-column
system and a breakpoint dictionary nobody agreed to. The question is what the smallest
honest layout offer is, and where its edges are.

## Three components, and the names decided the count

The design sketch said "the `layout` entrypoint" — one entrypoint, three components. The
token gate said otherwise, and the gate is right. A component token is
`--pct-{component}-{property}`, and the component word **must be a real package
entrypoint** (`check-tokens` point 3, [`req-token-names`](../requirements/tokens.md#req-token-names)):
`--pct-container-max-width` demands `@pacit/components/container` to exist. The
alternatives were worse on inspection, not just on taste — `--pct-layout-grid-min-width`
puts `grid` into the shared **parts** dictionary, where every other component would inherit
a "part" that is really a sibling component's name.

So: **three entrypoints** — `container`, `stack`, `grid`. The breadcrumb bundles three
classes into one entrypoint because a crumb without a trail is a fragment of a pattern;
these three are not a pattern. A page with a grid and no container is whole, and each
primitive earns its own import, its own bundle row, its own card. Tree-shaking follows for
free: an application using only `pct-stack` carries neither grid CSS nor container CSS.

## No ARIA, no probe — and that is a statement, not an omission

Every component so far opened with a three-engine probe of its ARIA geometry (0050's law).
These three carry **no ARIA at all**: no role, no label, not one `aria-*` attribute.
Layout is presentational; a `div` that arranges other elements has nothing to announce, and
any role would be a claim the content does not make. With no accessible geometry there is
nothing for a probe to measure — the probe is waived for the reason it usually runs. The
unit suites pin the absence itself (`carries no ARIA at all`), so a future "helpful"
attribute is a red test, not a quiet regression.

What replaces the probe is a ruler: the e2e suite reads computed lengths and bounding boxes
in three engines — the cap, the centring, the clamp at both ends, the gap at all three
steps, the column counts at two widths.

## Responsive without a media query

The grid is one declaration:
`repeat(auto-fit, minmax(min(100%, var(--pct-grid-min-width)), 1fr))`. The consumer states
the one thing only they know — how narrow a card may get — and the engine derives every
"breakpoint" from it. The inner `min(100%, …)` is the overflow guard for viewports narrower
than the minimum itself. The container's gutter is a `clamp()` between the spacing scale's
16px and a measured 40px. Between the two, **the stylesheet of all three components
contains not a single media query**, and `layout.spec.ts` proves the behaviour anyway: the
column count changes with the viewport while nothing in the source names a width.

The container also declares `container-type: inline-size` — inline-size containment only,
so its height stays the content's own. It costs nothing today and makes the column the
ruler its content can measure against tomorrow, which is the honest version of "supports
responsive nicely": the primitive provides the query context, the consumer writes the query
if and when they have one.

## Inputs only where the scale is the point

`pct-stack` takes `gap: sm | md | lg` — rhythm is a system decision, so the step is picked
from the shared size axis, not typed as a length. It is deliberately **not**
`PCT_CONFIG.defaultSize` (that default names how big _controls_ are, and a compact form is
no reason for page sections to touch) and it reflects as `data-pct-gap`, not
`data-pct-size`, because the size axis of [`req-api-size`](../requirements/api.md#req-api-size)
promises equal _heights_ and a stack has none to promise.

The container and the grid take **no inputs at all**. Both of their lengths are tokens, and
a token scoped on the element is already a per-instance API the library measures elsewhere
([`req-token-scoped`](../requirements/tokens.md#req-token-scoped)):
`<pct-grid style="--pct-grid-min-width: 8rem">` is the input. An `@Input()` mirroring a
custom property would be a second name for the same knob, and the sandbox's fourth demo
measures the scoped form packing more columns than the default one.

## The edge of the offer

What this decision deliberately does **not** build: no utility classes, no column-count
grid, no responsive prop system (`cols="1 md:2 lg:4"` is the media-query dictionary wearing
camelCase), no `pct-cluster` until something in the repository needs a wrapping row twice
(the extraction law of [`lesson-21`](../lessons.md#lesson-21) applies to primitives too).
The site's shell composes these three; what the site needs beyond them is site chrome and
stays in the site.

## Costs

- Three entrypoints instead of one is three rows of everything — bundle snapshot, cards,
  README tables. Accepted: the rows are the honest unit of what shipped.
- `clamp(16px, 4vw, 40px)` in a token means the gutter cannot be re-derived from the
  spacing scale alone; a theme overriding `--pct-container-padding-x` owns the whole clamp.
  Accepted: the alternative was three tokens for one gutter.
- `container-type` on the container means a consumer positioning `absolute` children
  against an ancestor above the container will find the container is now the containing
  block for size queries only — not for positioning, which `inline-size` containment does
  not change. Recorded because "containment" reads scarier than what it does.
