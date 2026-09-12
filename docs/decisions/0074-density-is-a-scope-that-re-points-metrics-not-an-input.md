# 0074 — Density is a scope that re-points metrics, not an input a component reads

**Status:** accepted
**Implements:** [`req-token-density`](../requirements/tokens.md#req-token-density),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch),
[`req-token-scoped`](../requirements/tokens.md#req-token-scoped)
**Evidence:** the axis costs **not one line** in any component — the diff of this change
touches `libs/tokens/` and the gates, and no file under `libs/components/*/src`. Measured in
a browser (`apps/sandbox-e2e/src/density.spec.ts`, chromium): the field row reads
28 / 36 / 44 px comfortable and 26 / 32 / 38 px compact, and every one of the thirteen
controls that declares a `--pct-…-target-min` still clears 24 × 24 with the page compact —
the tightest of them landing on exactly 24.00.

## The question

`req-token-density` has stood as a gap since the first requirement pass: "a separate token
dimension (`comfortable` / `compact`) switched by attribute/scope, independent of the colour
theme", with no gate and no control, and with a note attached that the plan repeats — density
will cross the touch-target threshold **sooner** than the `sm` size does, so it has to arrive
**together with** a gate rather than before one.

The size axis has settled, so the trigger has fired. What remains is one design question with
two credible answers: is density something a component **takes** (a `density` input beside
`size`), or something the page **declares** (a scope the cascade resolves)?

## Density is the theme's construction, not the size input's

**An attribute on a subtree — `data-pct-density="compact"` — re-points metric tokens the
components already read.** The build emits two blocks, exactly as it does for the theme:

```css
[data-pct-density="comfortable"] { --pct-control-height-md: 36px; … }
[data-pct-density="compact"]     { --pct-control-height-md: 32px; … }
```

Four sentences fall out of that shape, and each is a refusal recorded on purpose.

- **No component changes.** A button already says `--pct-button-height:
var(--pct-control-height-md)` and a menu row already pads itself off the space scale. Move
  the primitives inside a scope and everything below the attribute is dense, without a single
  component learning a second word. That is why the diff of this change is a token diff.
  A `density` input would have been the opposite trade: 34 entrypoints each growing a second
  variant axis, every combination of `size × density` a new state to style and to test, and
  the one thing a consumer actually wants — "make this panel dense" — still impossible,
  because an input cannot cascade.
- **It composes with the theme because the two never meet.** Density moves dimensions, the
  theme moves colours, and the emitted sets do not intersect. So the same element may carry
  both attributes, or either may sit on an ancestor, and neither has to know about the other.
  The sandbox's density view puts the density attribute _inside_ the card's theme scope for
  that reason, and the e2e reads `--pct-surface` on both stages to keep the claim honest.
- **`comfortable` is an active density, not the absence of an attribute.** It carries the
  same names with the base values, for the same mechanical reason `[data-theme="light"]`
  exists: a roomy panel inside a dense page has to have something to undo the dense values
  with. The gate's point 11 holds the two scopes to the same set of names.
- **No media query.** Reduced motion is a system preference and rides in `@media`; density is
  not. No platform reports "this user wants a dense UI", and the only honest default is the
  roomy one — a dense layout is a product decision about a particular screen, and a screen is
  what an attribute is attached to.

### The one thing the axis may not shrink

The compact scale stops where the touch floor is, and the smallest step is a **measurement
rather than a taste**. A field draws a 1px border with `box-sizing: border-box`, and its
control column carries `min-block-size: var(--pct-target-min)`. At a row of 26px the column
lands on exactly 24px — the SC 2.5.8 floor to the pixel — and at 25px the floor would push the
row back out to 26 anyway: the token would stop being the height and start being a wish, which
is the failure [0004](0004-explicit-height.md) exists to prevent. Hence 26 / 32 / 38, and hence
`sm` is where the axis ends.

`pct.target.min` is therefore **absent** from `density.compact.json`, and its absence is a
gate rather than a habit. Two rules of point 11 hold it: the floor may not be re-pointed
downwards, and no primitive the skin reads as a control's box may come out under it. They are
two rules and not one because lowering the floor makes every other check about the floor pass
by construction — including the browser measurement — and a control that clears a floor
somebody moved has not been measured, it has been excused.

### What the static gate cannot say, and who says it

Point 11 sees tokens; it cannot see a layout. So the requirement's **control** is a browser
measurement: `density.spec.ts` walks every control that declares a `target-min` token, on its
own page, with the whole page switched to compact, and reads the rendered box. The corner the
requirement named — `compact` together with size `sm` — gets a section of its own in the
sandbox, because it is the only place where the two shrinkings compose.

The numbers that came back say the floors are doing the work rather than the padding: the chip
remove, the checkbox, the radio, the date toggle, the breadcrumb link and the slider row all
read exactly 24 px under **both** densities, because they were already sitting on their floor;
the accordion heading went 40 → 36, the tab 36 → 32, the field's control column 34 → 30, and
the compact `sm` field column landed on 24.00.

## The space scale moves one step, and the smallest step does not move

Compact `4` is comfortable `3`, compact `5` is comfortable `4`, compact `6` is comfortable
`5` — a dense layout is the same rhythm played one step tighter, so a component that already
chose its step keeps the relationship it chose. Step `2` (4px) stays: it is already the
smallest gap this skin draws, and below it a gap stops reading as a gap. Step `3` takes the
midpoint (6px) rather than collapsing onto `2`, so the scale keeps five distinct values in
both densities.

**Type size is deliberately not on this axis.** Shrinking the type under compact would make
density a second size scale wearing another name, and it would move the one thing on a row a
reader cannot enlarge back. Size scales the type ([`req-api-size`](../requirements/api.md#req-api-size));
density scales the space around it.

**The axis introduces no token NAME.** `libs/tokens/tokens.snapshot.md` does not move, which
is this decision's central claim made checkable rather than argued: a scope re-points what a
name resolves to, and a name that appeared would mean an input had been added after all.

## `[pctDensity]` is not part of this change

[0059](0059-a-theme-is-an-attribute-the-skin-reads.md) gives the rule for when sugar like
this arrives, and it is worth repeating because it is the same rule: `[pctTheme]` waited
"until setting `data-theme` from a template starts to repeat", and it landed on the day the
sandbox was writing the attribute by hand in three places with a fourth writer coming.

Density has **one** writer today — the sandbox's density view — and a directive is not one
line: it is an entrypoint, which in this repository means a row in `size.snapshot.md`, a card
in the gallery, a mutation scope and a `files.policy.json` entry. Spending all of that on a
single writer would be paying the cost of the abstraction before the repetition it abstracts
exists. The trigger is written down instead: **when a second and third place write
`data-pct-density` by hand, `[pctDensity]` arrives**, shaped like `PctTheme` — one host
binding, `null` removing the attribute — and its control is the same side-by-side comparison,
a hand-written attribute and a directive reading the same computed
`--pct-control-height-md`.

## What this costs us

- **An overlay does not inherit a scoped density.** A CDK panel renders as a child of `body`,
  so a density set on a panel does not reach the menu that panel opens — exactly the caveat
  [`req-token-scoped`](../requirements/tokens.md#req-token-scoped) already records for the
  theme and the writing direction ([`lesson-35`](../lessons.md#lesson-35)). A density set on
  `<html>`, which is what an application switching wholesale does, reaches everything; the
  e2e sweep uses that scope for the same reason.
- **The compact block is 83 declarations, and every consumer downloads them.** That is the
  transitive closure [0012](0012-theme-closure.md) requires, and it is not optional: a custom
  property is substituted at the point of declaration, so re-pointing a primitive in a narrow
  scope moves nothing that was already resolved in `:root`. The theme pays 276 for the same
  reason.
- **Two more scopes for a skin author to fill.** A future skin that re-points the control axis
  has to say what it means by compact as well. Point 11 will tell them if they forget half
  of it; it cannot tell them whether their number is a good one.
- **The axis has two values and no third.** `cosy` between the two is a name somebody will
  ask for. It is deliberately absent: two values are the smallest set that makes the
  mechanism real, and a third is a line in `density.*.json` plus a scope in the build the day
  a design needs it.

## Alternatives considered

| alternative                                  | why rejected                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `density` input beside `size`              | 34 entrypoints × a second variant axis, and it still could not cascade — "make this panel dense" is a question about a subtree, and an input answers about a node |
| A fourth theme (`compact-light`, …)          | multiplies the theme axis by the density axis and makes the two impossible to set independently, which is the one thing the promise names                         |
| A media query (`@media (pointer: fine)`)     | guesses density from an input device; a desk with a mouse is not a request for a dense table, and there is no way to say no to a guess                            |
| `comfortable` as the absence of an attribute | a roomy island inside a dense page would inherit the dense values with nothing to undo them — the same defect `[data-theme="light"]` was added to fix             |
| Shrinking the type along with the box        | density would become a second size scale, and it would take the one metric a reader cannot enlarge back down with it                                              |
| Letting `compact` take `sm` to 24px          | measured: the field's control column then falls to 22px and the floor pushes the row back to 26 — the token stops being the height (0004)                         |
