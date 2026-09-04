# 0064 — A face the consumer cannot reach without undoing ours is a variant

**Status:** accepted
**Implements:** [`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast),
[`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** `libs/components/tabs/src/tabs.scss`, the three new entries in
`libs/tokens/src/contrast.policy.json` printed by every `tokens:build`,
`apps/sandbox-e2e/src/tabs.spec.ts` and `visual.spec.ts` — the face, the side layout and
RTL read computed in three engines

## The question

This library's own documentation site wanted a segmented Preview / Code control, and built
it the way [0013](0013-no-headless-split.md) leaves open: the component's tokens on the host,
and the two values with no token reached through `data-pct-part`. It worked, and it cost 72
lines in the site's global stylesheet, of which about a dozen were spent **undoing** the
component's default face before painting the wanted one.

Then it broke twice, in ways that were not the site's carelessness:

- the token overrides sat on a host whose subtree also held a projected `pct-tabs` (the demo
  on the page's own stage), and custom properties inherit across component boundaries, so
  the demo rendered as the switch — no chosen edge, no hover
  ([`lesson-148`](../lessons.md#lesson-148));
- the part selectors were descendant selectors, and a part name is a shared vocabulary, so
  they also matched the breadcrumb and the tabs demo the same stage projected
  ([`lesson-147`](../lessons.md#lesson-147)).

Both are avoidable with sharper selectors. Neither would have existed at all. The question
this raises is not "how do we scope CSS" but: **when the shortest honest way to a look is to
neutralise ours first, whose look is missing?**

## A face is paint, and paint goes in the component

`PctTabsVariant` is `underline | segmented`, and that union plus one host binding is the whole
code change — the same shape [0058](0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md)
took for the button's five faces, for the same reason: paint is paint. There is no new branch
and no new state, and the mutation run says how much "nothing that runs" is worth: the gate's
denominator went from 4616 mutants to **4617**, the one being the default value's string
literal, and the score from 82.82% to 82.80%. 0058 recorded zero for the button's five faces
and this is the same claim measured one mutant sharper — a face is paint, and paint has almost
nothing for a mutation testing tool to break.

The test we now hold for "variant or consumer CSS" is the one this case failed:

> A look is a **variant** when reaching it from outside requires overriding the component's
> own defaults to nothing first, or requires a value the component names no token for.
> A look is the **consumer's** when it is reached by setting tokens that already exist.

The site's remaining six declarations are the control: a margin and a smaller type scale, all
of them values the component already names. That is a skin. The track and the raised segment
were not.

## The two values that had no token, and the pair rule they brought

`--pct-tabs-list-bg` is the track the segmented strip is held in, and
`--pct-tabs-tab-bg-selected` is the chosen segment's fill. Both are real surface roles rather
than the page under an opacity ([`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity)) —
which is also the only reason they can be measured at all. Three entries follow, and they are
the interesting part of this decision:

| pair                                 | level | severity | light   | dark    |
| ------------------------------------ | ----- | -------- | ------- | ------- |
| unchosen label on the track          | AA    | error    | 9.45:1  | 11.87:1 |
| chosen label on its segment          | AA    | error    | 17.85:1 | 17.85:1 |
| the raised segment against its track | UI    | warn     | 1.10:1  | 1.22:1  |

The third is deliberately a `warn`, and the reasoning is the one the rail already stands on:
the fill is not what identifies the state. The **label pair** is, and it is an error in both
themes. A segmented control whose track and segment differ by 1.10:1 is a control whose state
is carried by type weight and colour, which is what the two errors above measure — and in
forced colours the fill is dropped by the platform anyway, so that mode gets an outline on the
chosen segment and a border on the track, written back at the base rules' specificity
([`lesson-70`](../lessons.md#lesson-70)).

The track's corner is **derived, not named**: `calc(tab-radius + list-inset)`. A track whose
radius is the segment's plus the inset holding it nests the two curves exactly, and keeps doing
it after a theme moves either number. The library's radius scale has one step, so the
alternative was a raw length in a stylesheet.

## The vertical face was half-built, and this is where it got finished

`orientation="vertical"` turned the strip into a column and left the panel stacked underneath
it — a column of labels introducing a section nowhere near them. The strip and the projected
panels are siblings under the host, and a rule in this component's stylesheet cannot select a
`pct-tab`: projected content keeps the **consumer's** encapsulation attribute. So the panels
got a wrapper of their own in the template, and the vertical host became a flex row.

The wrapper carries **no** `data-pct-part`, on purpose. It is layout, and a consumer already
reaches a section through the `panel` part on the tab itself; a part is a promise to keep
([`req-api-parts`](../requirements/api.md#req-api-parts)) and this box is not one worth making.
Nor a role: a plain box between a tablist and its panels names nothing, and `aria-controls`
already ties the two together.

Every distance in that layout is logical — `border-inline-end` on the strip,
`padding-inline-start` on the panels through `--pct-tabs-panel-gap` — so a right-to-left
document moves the strip to the right and the panel to the left with no rule of its own. That
is measured rather than assumed: the RTL case reads the flipped rail and the flipped inset
computed, in three engines.

## What it costs

- **A visual change to a released layout.** A consumer using `orientation="vertical"` today
  gets the panel beside the strip instead of below it. It is the layout the input's name and
  its `aria-orientation` always claimed, and the old rendering had no argument for itself, so
  this ships as a feature with the change named rather than as a silent fix. The sandbox's
  `tabs-vertical` and `tabs-vertical-rtl` baselines were regenerated against it.
- **One more element in the DOM** for every strip, vertical or not.
- **A second face to keep measured.** Every future colour move in this component now answers
  to nine contrast entries instead of six.
- **A law on the selectors, because paint keyed on an attribute is reachable by descent.** A
  panel may hold another strip, and both instances are the same component, so they share one
  encapsulation attribute: `:host([data-pct-variant='segmented']) .pct-tabs__list` dressed the
  inner strip as well, and outranked the inner instance's own base rules while doing it. The
  first page to nest one strip in another was this library's own documentation, which rendered
  a default strip segmented ([`lesson-151`](../lessons.md#lesson-151)). Every rule keyed on a
  host attribute in this component now reaches its target with child combinators, and the
  regression case is a strip inside a strip. The cost is that the next face has to be written
  the same way; the alternative was a face that leaks into whatever a consumer puts in a
  panel.

## What was rejected

- **A second component.** A `PctSegmentedTabs` would fork the roving tabindex, the walk, the
  `beforematch` answer and the disabled skip for the sake of two backgrounds — 0058's argument
  about a `HeroButton`, one component over.
- **Leaving it to the consumer with better documentation.** The site is the most careful
  consumer this library will ever have, it wrote the sharp selectors, and it still shipped both
  leaks. A recipe that a careful consumer gets wrong twice is a missing feature.
- **A `size` axis for tabs.** Tempting, because the site also wanted a smaller switch. But the
  card's answer stands: a tab is not a control with a height, and the type and padding tokens
  already move it. The site sets three of them on the strip's own list, which is a skin.
