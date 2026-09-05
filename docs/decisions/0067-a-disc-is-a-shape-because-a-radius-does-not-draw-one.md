# 0067 — A disc is a shape, because a radius does not draw one

**Status:** accepted
**Implements:** [`req-api-attributes`](../requirements/api.md#req-api-attributes),
[`req-token-override`](../requirements/tokens.md#req-token-override),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** one probe per arrangement in chromium before anything was written (the table
below); `apps/sandbox-e2e/src/skeleton.spec.ts`, where the view writes ONE axis of the disc and
the width is read as the component's own transfer, in chromium, firefox and webkit; three unit
cases over the two that stood (`libs/components/skeleton/src/skeleton.spec.ts`); the
`skeleton-shapes` baselines re-recorded with a disc that is one. Supersedes the section "Two
shapes, and a disc is neither of them" of [0050](0050-a-skeleton-is-a-picture-of-a-wait.md)
and nothing else in it.

## The question

0050 refused a `circle` shape with an argument this repository likes: a disc is a `block` with
`--pct-skeleton-track-radius: 50%`, a token the consumer sets on an element they already own,
so a third drawing would have bought nothing a line of their CSS could not. The sandbox drew
its avatar that way and the argument held for exactly as long as nobody wrote a disc anywhere
else.

It failed on the component page, where the reviewer asked for the shapes the component was
missing, "a circle, for one". The answer was supposed to be "set the token". It is not, and
the reason is geometry rather than taste: **a radius rounds whatever box it is given, and a
`block` is as wide as its container.** Half of a 448 × 112 box is not a circle. The sandbox's
disc was round only because its stylesheet had ALSO written `inline-size: 3rem` and
`block-size: 3rem` — a square, by hand, beside the token — and a square is a width tied to a
height, which no token of the skin can say and which is the entire content of the shape.

So the line of CSS 0050 counted was three lines, two of them a number the consumer has to keep
equal by hand, and the drawing it replaced is a drawing.

## Decision

`shape` takes `circle` beside `text` and `block`. A disc is one track, as a box is — `lines`
reaches neither — and the sheet ties its two axes together:

```scss
:host([data-pct-shape='circle']) {
  display: inline-block;
  vertical-align: top;
  min-inline-size: 1lh;
  aspect-ratio: 1;
  justify-self: start;
  align-self: start;
}
```

**Sized on either axis, with the other following.** No value is written on `inline-size` or
`block-size` — the floor is a `min-`, for the reason the block's height is a `min-block-size`
in 0050: a floor is a different property from the size the consumer writes, so theirs wins
outright and no specificity fight is possible. A `block-size: var(--pct-avatar-size)` of theirs
transfers to the width through the ratio; an `inline-size` of theirs is taken as written and
the height follows. With nothing written it is one line of the surrounding text across, the
same floor as every other drawing in the component.

**Inline-level, as the avatar it stands in for.** `pct-avatar` is `inline-flex`; a name sits
beside it with no layout of the consumer's, and a placeholder for it has to sit the same way.
`vertical-align: top` takes the descender gap an inline box would otherwise stand on.

**Half the box, as a literal.** `border-radius: 50%` is not the skin's corner and is not the
token, because a circle is the one shape whose radius is its definition — any other value on a
square is not a circle, and a skin that wanted a rounded square wants `block`. The two literal
`50%` already in the library, the radio's dot and the button's icon-only face, are the same
statement.

## What was measured

A probe page in chromium, one box per arrangement, `font: 16px/1.5` so `1lh` is 24px. The
consumer's size, where written, is 48px on ONE axis:

| arrangement         | nothing set | `inline-size` set | `block-size` set |
| ------------------- | ----------- | ----------------- | ---------------- |
| block flow          | 24 × 24     | 48 × 48           | 48 × 48          |
| flex row            | 24 × 24     | —                 | 48 × 48          |
| flex row, `stretch` | 24 × 24     | —                 | 48 × 48          |
| flex column         | 24 × 24     | —                 | 48 × 48          |
| grid                | 24 × 24     | —                 | 48 × 48          |
| inline, beside text | 24 × 24     | —                 | —                |

Two of those rows are what the last two declarations cost. Without `justify-self: start` and
`align-self: start` the same box measured **1217 × 1217** in a grid and **24 × 80** in a
stretched flex row: a grid item and a flex item are stretched across their free axis by
default, the ratio then follows the stretched axis, and a disc the width of the page is what
`aspect-ratio` does when nothing tells it which axis is the consumer's. `display: block` fails
the same way from the other side — a block-level box takes the whole line — and `display:
table` (shrink-to-fit without an inline box) measured **24 × 0**: a table has no aspect ratio.

The transfer from `block-size` to width is then read in three engines by the sandbox: the
shapes card writes `block-size: 3rem` and nothing else on its disc, and the case asserts the
width against the height and the track's radius against `50%`.

## The sheen is a shadow, and stays an element

The same review found the sheen sharp — a block of the page's colour sliding across a grey
bar, which reads as a second placeholder passing behind the first rather than as a light —
and the second look asked for less still: very soft, slower, at an angle, "only a shadow".
Four numbers do that, and each was tried against the page before it was written down:

- **two thirds of the bar wide** (`--pct-skeleton-fill-size`, 33% → 66%): the shade is a
  gradient from nothing to its middle and back, so its width is the length of the ramp — a
  third of the bar on each side. A third-wide band ramps in a sixth and shows an edge;
- **the fill token at sixty per cent** over the placeholder, through `color-mix` as the
  dialog's backdrop and not through `opacity` (`req-token-no-opacity`): at full strength
  the middle of the shade is a stripe, and a shadow has no stripe;
- **ten degrees off the vertical** (`100deg`): a line of text is too thin to show a lean,
  but a box or a disc is where the shade reads as a light crossing at an angle;
- **three loops of the motion axis** (`calc(var(--pct-motion-loop-duration) * 3)`): the
  loop is 0.6s, a band's tempo, and a shadow at that tempo flickers. Three is 1.8s — and
  the axis's reduced answer, 1.5s, scales to 4.5s with it rather than being replaced, so
  `prefers-reduced-motion` is still answered once for the whole library
  (`req-a11y-motion`). The sandbox reads both against the token, not as literals.

```scss
background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--pct-skeleton-fill-bg) 60%, transparent), transparent);
```

This is inside 0050, not against it. 0050 refused a gradient as the CARRIER of the motion,
because `forced-colors: active` drops every `background-image` that is not a `url()` — and
the carrier is still an element travelling by `inset-inline-start`, painted in a solid
palette colour by the forced-colours block, which is what `apps/sandbox-e2e/src/forced-colors.spec.ts`
measures. What the gradient changes is the drawing in every other mode. `100deg` is a
physical angle, deliberately: the shade itself travels by a logical property and mirrors
with the writing direction, and the lean is decoration on the shade, not a fact about where
anything starts (`req-token-logical` is about the second, and the RTL screenshot holds it).
What 0050 wrote as the reduced duration, 1500 ms, is now three times that, for the reason
above.

## Consequences

**`./skeleton` grows by 426 B, 2997 → 3423**, which is two rules, one selector list and a
shaded gradient — a 14.2% step on the smallest component entrypoint in the
library, recorded in the size snapshot. It still carries no `./core`, no text and no icon:
the shape is an attribute the sheet reads, and nothing was injected to draw it.

**0050's shapes section is superseded and the rest of 0050 stands**: what the skeleton
announces, how it is measured, why the sheen is an element, what is refused. A decision is
immutable once accepted, and the honest record here is one section overturned by a measurement
it did not have, not a new decision about the whole component.

**The sandbox's "a disc is a radius" card is gone**, and with it the one place the token was
demonstrated at `50%`. The token is still the block's and the text's corner, and
`req-token-override` is still exercised by the theming stage; what is no longer shown is a
use of it that drew the wrong shape.

**`lines` now means nothing in two shapes instead of one.** The limitation is the same one
0050 wrote down, for the same reason, and the card lists both.

## What was rejected

**Keeping the token and documenting the square.** "Set the radius to 50% and give it equal
sides" is a recipe with three numbers to keep in step, and the sandbox's own view already
shows what happens to a recipe: it was followed once, correctly, and nowhere else.

**A `size` input for the disc.** The avatar has sizes, and a disc standing in for one could
have taken the same axis. 0050's reason against a size input holds here unchanged — the size
is the consumer's, and `block-size: var(--pct-avatar-size)` is the avatar's own token in the
consumer's own hand. An input would be a second way to write the same number.

**A fourth shape.** The libraries that have four — text, rectangular, rounded, circular — have
them because their rectangle is square-cornered by default and the rounded one is a second
drawing. Here `block` wears the skin's corner already, and a square-cornered box is the token
at `0`, which IS one line of CSS that draws what it says.
