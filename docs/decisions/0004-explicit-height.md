# 0004 — Height stated outright, not derived from padding

**Status:** accepted
**Implements:** [`req-api-size`](../requirements/api.md#req-api-size)
**Evidence:** [`lesson-29`](../lessons.md#lesson-29), [`lesson-34`](../lessons.md#lesson-34)

## Context

A button and a field of the same size have to be **exactly** the same height — otherwise
a form with a button next to a field looks assembled from two libraries.

The first approach drove the vertical through `padding-y` from a spacing token. Both
components used the same token (`space.3`) and still differed by **7 px**: the button measured
`padding-y` plus the label's line height (≈34.8 px), the field `padding-y` plus the guaranteed
touch target of the control column (42 px) ([`lesson-29`](../lessons.md#lesson-29)).

## Decision

**Height is a separate token stated outright** (`--pct-control-height-{sm|md|lg}`), and
vertical padding stops driving the vertical.

Four details, each with a reason:

1. **`min-height`, not `height`** — so taller content (a label wrapping onto two lines,
   a `textarea`, a button in a slot) still pushes the control out instead of being clipped.
2. **A size variant swaps the base tokens**
   (`--pct-button-height: var(--pct-button-height-lg)`) instead of repeating appearance rules.
3. **Size `md` overrides nothing** — which keeps overriding the base token in a theme working
   ([`req-token-override`](../requirements/tokens.md#req-token-override)).
4. **Size scales the text size and horizontal padding along with the height** — otherwise
   a bigger field would carry a smaller one's text.

The `28 / 36 / 44 px` scale was chosen so that **the smallest size still clears the SC 2.5.8
touch threshold with room to spare** — not for aesthetics.

### The `bare` variant does not align heights

A checkbox and a radio group without a frame have nothing to line up with a button, and
a forced height would add empty space to them. The touch target there is guarded by the
control column ([`req-api-frame`](../requirements/api.md#req-api-frame)).

## Consequences

- A new component starts by **reading a token**, not by guessing padding.
- Alignment is verifiable by measurement in a browser rather than by "looks right".
- The gate has to check **that the heights are equal and what that height is** — on equality
  alone both components could collapse to the text line height and still pass.
- Inside a wrapper, size belongs to the wrapper ([0003](0003-wrapper-and-control.md)).

## What this costs us

- **Height stops following from content.** A component with unusual content has to either fit
  the scale or deliberately leave it — and that is a departure to be justified, not a freedom.
- **Three steps are too few for decorations welded into a field.** An `inset` button has to be
  one step smaller than the field; at size `sm` there is no step below, so the button fills the
  height there and pushes the row out by the thickness of the frame. That is **a corollary of
  this decision**, not a fitting defect ([`lesson-34`](../lessons.md#lesson-34)).
- A `fill` decoration has to be given `min-height: 0`, or it contributes a minimum height of
  its own equal to the field's — and a field with a button ends up 2 px taller than one
  without.

## Alternatives considered

| alternative                          | why rejected                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A shared `padding-y` token           | measured: the same token gives a 7 px difference, because the height is composed differently ([`lesson-29`](../lessons.md#lesson-29)) |
| Tuning the paddings until they match | false alignment — dependent on `line-height`, typeface and slot content; every new component starts by guessing                       |
| `height` instead of `min-height`     | clips a label wrapping onto two lines, and a `textarea`                                                                               |
