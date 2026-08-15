# 0003 — Wrapper and control

**Status:** accepted
**Implements:** [`req-api-wrapper`](../requirements/api.md#req-api-wrapper),
[`req-api-frame`](../requirements/api.md#req-api-frame),
[`req-api-no-wrapper`](../requirements/api.md#req-api-no-wrapper),
[`req-api-parts-unique`](../requirements/api.md#req-api-parts-unique)
**Evidence:** [`lesson-21`](../lessons.md#lesson-21), [`lesson-22`](../lessons.md#lesson-22),
[`lesson-24`](../lessons.md#lesson-24), [`lesson-25`](../lessons.md#lesson-25),
[`lesson-27`](../lessons.md#lesson-27), [`lesson-28`](../lessons.md#lesson-28),
[`lesson-34`](../lessons.md#lesson-34)

## Context

A form field is at least six things at once: a label, a control, a hint, an error message,
a required marker and decorations on either side. The question is **who owns what** — because
that decides where the value's typing lives, who draws the frame and who receives the click.

The first version (`PctInput`) kept everything in one component. It fell apart on two things:
the shared message logic was **copied into four controls**
([`lesson-21`](../lessons.md#lesson-21)), and the checkbox and the radio group did not fit
a "control with a frame" model.

## Decision

**The wrapper (`pct-field`) and the control are separate components, talking through the
`PCT_FIELD` token.**

- **The form contract is implemented not by the wrapper but by the control.** That keeps the
  typing with the kind of field (`string`, `number`, `Date`, `string[]`) instead of leaking
  into the wrapper as `unknown`.
- **The wrapper draws the frame**, not the control — otherwise the `prefix`/`suffix`
  decorations would end up outside the field. The control inside is transparent and
  borderless, and the focus ring covers the whole row (`:has(:focus-visible)`), including when
  focus lands on a button in a slot.
- **The control declares whether it wants a frame** (`fieldAppearance`: `boxed` / `bare`) and
  **which cursor** the frame should show (`PctFieldControl.fieldCursor`).
- **The shared message logic lives in `core`** — the error text, gating on `touched`,
  assembling `aria-describedby`.

### Every part of the frame's surface has an owner

This is the most expensive part of the decision, and it came out of two failed attempts.

The row **has no `padding` and no `gap` of its own** — the spacing is carried by the three
columns inside it (`field-prefix`, `field-control`, `field-suffix`), stretched to its full
height. An empty decoration slot does not disappear, it collapses to the edge padding alone.
A click on the row's background is forwarded to the control: `focus()` on `mousedown` and
`activate()` on `click`.

The reason is in [`lesson-27`](../lessons.md#lesson-27): after the first fix the padding and
`gap` stayed on the row and the columns were centred within it — **about 60% of the frame's
surface belonged to no inner element**. Clicking worked (patched by
[`lesson-22`](../lessons.md#lesson-22)), but the cursor lied: a disabled field invited you to
type with a text cursor across all of its padding.

### The author declares how a decoration fits, not the stylesheet

`pctPrefix` / `pctSuffix` take `inset` (the default) or `fill`.

- `inset` lies **on the field's surface**: it is written into the frame's padding, inherits its
  cursor, and clicking it focuses the control.
- `fill` takes **the whole** slot and is **a surface of its own**: it has its own background,
  its own cursor and receives clicks itself, so the wrapper does not reach into it.

The previous version inferred the intent from the slot's content (`:has(button, a, [tabindex])`
⇒ "fills the slot"). [`lesson-34`](../lessons.md#lesson-34) showed that this couples two
independent things: a clear button **could not** be smaller than the slot, and a tile with
a background **could not** be bigger, because it is not interactive.

## Consequences

- A new control gets the label, the messages and `aria-describedby` **just by implementing the
  contract** — not by copying code.
- A fix in the message logic is one change, not four.
- Size belongs to the wrapper: a control with a `size` of its own hands it over to the field,
  just as it hands over the frame. Otherwise two `size` values in one field would give a frame
  of one size and text of another.
- Container part names must carry a prefix (`field-label`, `field-row`, …), or they collide
  with the parts of the control inside ([`lesson-24`](../lessons.md#lesson-24)).
- The wrapper guarantees the minimum touch target of the control column — after handing over
  its frame, the select's trigger lost its own padding and dropped to 19.6 px
  ([`lesson-25`](../lessons.md#lesson-25)).

## What this costs us

- **Two components instead of one** in every complete field — more DOM and one more DI token
  to understand on first contact with the library.
- **The control has to work in two modes** (wrapped and not), which doubles the number of test
  cases for every control.
- **A symmetric constraint on the author's side, and an unremovable one:** an `inset` button
  has to be one step smaller than the field, because the heights of the two at the same size
  are equal by design ([0004](0004-explicit-height.md)). At the smallest size there is no step
  below.

## Alternatives considered

| alternative                                          | why rejected                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| One component per field (`PctInput`)                 | forces the message logic to be copied into every control ([`lesson-21`](../lessons.md#lesson-21))                                           |
| The wrapper implements `FormValueControl`            | the value's typing leaks into the wrapper as `unknown`; the field loses its connection to the kind of data                                  |
| The control draws the frame, the wrapper only labels | the `prefix`/`suffix` decorations land outside the frame, and the focus ring does not cover a button in a slot                              |
| The stylesheet infers whether a slot is filled       | a CSS rule inferring intent from content is **hidden API** — cheap only while there is one example ([`lesson-34`](../lessons.md#lesson-34)) |
