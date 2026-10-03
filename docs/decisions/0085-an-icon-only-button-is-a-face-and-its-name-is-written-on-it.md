# 0085 — An icon-only button is a face, and its name is written on it

**Status:** accepted
**Implements:** [`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-icons`](../requirements/api.md#req-api-icons),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking)
**Evidence:** `libs/components/button/src/button.scss` (the icon-only face) and the
`icon only` cases in `libs/components/button/src/button.spec.ts`; the `PctButton — icon only`
cases in `apps/sandbox-e2e/src/button.spec.ts` and the `icon-only button` row of
`apps/sandbox-e2e/src/target-min.spec.ts`, read in three engines; the `Icon only` cards in
`apps/sandbox/src/app/views/button/` and their two baselines in `visual.spec.ts`

## The question

The button's card carried one limitation with a trigger on it: no icon variant, because an
icon-only button "would need square geometry and a touch-target guarantee of its own", and
the icons were not there yet. Since [0083](0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)
they are — `<pct-icon icon="trash" />` draws whatever set the application registered — and
until today the only way to put one on a button was a labelled button with nothing to label:
padding sized for words around a single glyph, a rectangle where every toolbar wants a
square, and a name that came from wherever the author remembered to put one.

Two things have to be settled, and they are not the same kind of thing. The **shape** is
paint: how wide, how tall, how big the glyph. The **name** is the one thing a glyph cannot
carry, and an unnamed button is the finding axe calls critical
([`lesson-92`](../lessons.md#lesson-92)).

## Decision

**A face of `pctButton`, not a component of its own.** `iconOnly` is a boolean on the button
that writes `data-pct-icon-only`, and the stylesheet answers it with geometry alone:

```html
<button pctButton iconOnly variant="ghost" pctTooltip="Delete" pctTooltipAs="name">
  <pct-icon icon="trash" />
</button>
```

Every face, tone, size and state is the button's, unchanged and unrepeated — the five faces
of [0058](0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md), the tones
of [0082](0082-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md), `disabled`,
`loading`, and the link of [0071](0071-a-link-in-button-s-clothes-is-a-link.md). The glyph is
the consumer's `pct-icon`, so the button imports nothing it did not import yesterday.

**The name is written on the button.** `aria-label`, or a tooltip with `pctTooltipAs="name"`,
which writes the same attribute permanently and shows it as well
([0030](0030-a-name-is-an-attribute-a-description-is-a-reference.md)). Dev mode reports, once
after the first render, an icon-only button with no name at all. What counts as a name is a
heuristic, as the tooltip's is, and it is held to the same rule: **free of false alarms** —
everything it counts really does name a button, because a sentence that fires on a valid page
teaches people to ignore the sentence. It counts the button's own `aria-label` and `title`, an
`aria-labelledby` whose target has words in it, a `<label for>` (the platform's `labels`), and
words, an image's `alt` or an element's `aria-label` in the content — but nothing under
`hidden` or `aria-hidden`. A visually hidden span is a common, valid way to name a button, and
it counts. Where the heuristic is unsure it stays silent; the real computation is the
browser's, and the axe audit measures that one.

## What the shape is

- **A square as tall as the size**, `max(height, --pct-button-target-min)` held on both axes
  outright — `inline-size` and `block-size`, not minimums — because a row that stretches its
  items (the default of a flex row, a grid cell) would otherwise hand it its tallest
  neighbour's height, and `flex-shrink: 0`, because a row that squeezes would hand it less
  width. The heights clear the floor at every size and density today; the floor is what a skin
  that goes further runs into, and a square is only as wide as the height it was given
  ([`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)).
- **The floor under the labelled face too.** Reviewing this face found that the labelled one
  had none: its height was `var(--pct-button-height)` and nothing else, and a skin setting the
  small height to 20 px would have drawn a 20 px target with no gate red. It now stands on the
  same token, `min-height: max(height, floor)` and `min-inline-size: floor`, and
  `target-min.spec.ts` reads it with every height and padding zeroed.
- **The glyph on the icon's own step for the size** — 16 / 20 / 24 inside 28 / 36 / 44, 57, 56
  and 55 per cent of the square — reached through the host's `font-size`, because
  `pct-icon` is `1em`. A consumer writes no size; one who writes `size` on the icon still
  wins. The steps are the button's own tokens (`--pct-button-icon-size-{sm,md,lg}`) holding
  the icon's numbers as literals: pointing at `--pct-icon-size` would be the sideways
  reference `check-tokens` point 6 rejects, and rightly — resizing the icon box must not
  resize a button. A reading holds the two equal in this skin instead: the e2e resolves both
  sets on the page and requires them to agree.
- **The spinner in the glyph's place.** One grid cell holds both; while the button works the
  glyph is `opacity: 0` — a switch, never a fade — and not `display: none`, which would take
  a content-named button's name away for exactly as long as it works. The ring is drawn
  `border-box`: around its `1em` it was 24 px where a 20 px glyph stood, measured before the
  rule.

Measured in chromium, firefox and webkit: the three squares read 28, 36 and 44 on both axes,
each as tall as the labelled button beside it, and stay 36 × 36 in a row that squeezes them to
60 px and stretches them to 60 px tall; the glyphs read 16, 20 and 24 with their centres on the
square's to the pixel; the spinner reads 20 × 20 on the same centre, and the loading square —
named by words in its content and by nothing on the button — keeps that name. The negative
controls, each run against the case it is for: deleting `flex-shrink`, the ring's `box-sizing`
and the glyph's `font-size` together turned the narrow-row, spinner and glyph cases red (the
`font-size` alone reddens the spinner too, which is `1em` of it); `min-block-size` in place of
`block-size` reddened the stretched row; `display: none` in place of `opacity: 0` took the
loading square's name from "Search" to nothing.

## Consequences

- The limitation leaves the button's card, and its touch-target row stops resting on "the
  smallest size is 28 px" — which compact density had already made 26: both faces stand on a
  floor of their own, and `target-min.spec.ts` reads each with every height zeroed.
- The tooltip's WCAG 2.5.3 check read every character of the control, including a ligature
  font's glyph name under `aria-hidden` — so `pctTooltipAs="name"` over `materialIcons()`'s
  `delete` was told its name did not contain "delete". It now reads the words the control shows
  as words, outside `aria-hidden`, which is the recommended pattern here working as written.
- 0067 said the button's icon-only face was one of the library's literal `50%`. There was no
  such face then, and this one draws the skin's own corner: the literal is the spinner's ring,
  beside the radio's two. Its sentence is corrected to say so.
- A skin that wants round icon buttons sets `--pct-button-radius: 999px` on them, the same
  lever every button already has; the library does not decide that a square should be a
  circle.
- **No pressed face.** An icon-only button is the most common toggle there is — mute,
  favourite, bold — and `aria-pressed` on the native element is the platform's and is
  announced, but no face here paints it. A pressed state belongs to every button, labelled or
  not, and is its own decision.
- **Two glyph scales in one toolbar.** A glyph beside words stays `1em` of the words — the icon
  box's own rule — so a `pct-icon` in a labelled button draws at 13 / 14 / 16 px while the
  square's draws at 16 / 20 / 24. A leading-icon button is the question that settles it, and
  it is not this one.

## What this costs us

Four tokens (`icon-size` ×3, `target-min`), one input and a dev-mode sentence on the most used
component, and the bytes are recorded rather than estimated: the `./button` probe in
`libs/components/size.snapshot.md` went from 13391 B to 15333 B — **992 for the geometry**
(the square, the input, the host binding, and the floor the labelled face now stands on) and
**950 for the sentence**, measured by building the probe once without it. The second number
is the library's convention and not this face's: every developer warning here stands behind
`isDevMode()`, which `check-texts` point 6 requires and a production build cannot fold,
so the button's two older sentences ship the same way.

The other cost is a name the compiler cannot demand. An attribute on an element is not
something a type can require, and the input that could have been required collides with the
tooltip (below). What stands between a consumer and an unnamed square is the sentence in dev
mode and the axe audit in their own suite.

## Alternatives considered

- **A component of its own, `button[pctIconButton]`, with `icon` and a required `label`.**
  The name would be a compile error when missing, and that is the one thing it buys. It costs
  the faces: either the stylesheet is shared — and every component carries its styles
  compiled into its own definition, so an application using both pays for the faces twice —
  or the new component imports the button's and the button grows an icon it never had. And
  `label` would write `aria-label` beside a tooltip writing the same attribute, two owners of
  one value where 0030 settled one.
- **An `icon` input on `pctButton`.** The template would render `pct-icon` itself, so `./button`
  would import `./icon`, and every labelled button in every application would carry the icon
  box and its sources' machinery — the cost [`lesson-248`](../lessons.md#lesson-248) measured
  a renderer adding to fourteen entrypoints.
- **The face detected from the content** — no words, so a square. A face that changes when a
  label arrives late is a layout shift nobody asked for, and the server would render one
  shape and the browser another. Which face this is is the consumer's to say.
- **`size="icon"`.** The size axis is shared with the field row
  ([`req-api-size`](../requirements/api.md#req-api-size)); an icon-only button has three sizes
  of its own, and taking one value of that axis for a shape would leave it with none.
