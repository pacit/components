# 0042 — A slider is the platform's range, and only the value it cannot pronounce is ours

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-token-logical`](../requirements/tokens.md#req-token-logical),
[`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** thirteen probes over three engines (chromium 149, firefox 151, webkit 26.5),
each on a page the engine really parsed — the "Measurement" section below, and **four more
taken while building it, one of which overturned C1** ("What the build measured", at the
end). In short:
`<div role="slider">` with no `aria-valuenow` is a **critical** `aria-required-attr` in all
three, a bare `<input type="range">` needs only a label; the whole keyboard model
(Arrow ±step, PageUp/PageDown ±10 steps, `Home`/`End`) is byte-identical across the three and
`disabled` drops the control from the Tab order in all three; RTL mirrors the horizontal range
for free and `writing-mode` gives a working vertical one where `appearance: slider-vertical`
is already gone from firefox; `aria-valuetext` on the native range reaches the accessibility
tree (chromium AX node, via CDP); two overlaid ranges cannot both be reached by a pointer in
any engine; and a `<datalist>` neither snaps nor renders a tick in firefox

## Context

E5's third control is the slider. The card has carried it since v0 as one line — "a slider,
later" — and that line settles nothing. Five questions do the work, and this repository has
already answered four of their shapes elsewhere:

1. **What element carries the slider?** `<input type="range">`, or a `<div role="slider">` the
   author wires up — the same fork as the switch's element ([0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md)).
2. **Can it be skinned without a wrapper?** A wrapper costs the native element, which is the
   whole of [`req-api-platform`](../requirements/api.md#req-api-platform) and of
   [0003](0003-wrapper-and-control.md) — the argument the textarea lost
   ([0041](0041-a-height-the-platform-computes.md)).
3. **How is the value said?** A slider's `aria-valuenow` is a bare number; a currency, a unit
   or a set of named steps is not — and `[pctNumber]` already formats a number per locale
   ([0009](0009-number-field.md)).
4. **Vertical?** [`req-token-logical`](../requirements/tokens.md#req-token-logical) forbids a
   rule that reads the direction.
5. **Two thumbs — a range?** The value stops being a `number`, which by
   [0034](0034-multiplicity-is-a-tag.md) is a question about the tag, not an input.

Every one of the five was settled by a browser before a line of the component was written.

## The measurement

Thirteen probes, `page.setContent` on each of the three engines, `axe-core` 4.12 with the
`wcag2a wcag2aa wcag21a wcag21aa wcag22aa` tags, the accessibility tree read through the
Chrome DevTools Protocol where a value had to be confirmed:

| #   | probe                                                       | chromium                                                      | firefox                                                     | webkit                      |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- |
| A1  | bare `<input type=range>`, no label → axe                   | `label` (critical), nothing else                              | same                                                        | same                        |
| A2  | `<div role=slider tabindex=0>` → axe                        | **`aria-required-attr` (critical)** + `aria-input-field-name` | same                                                        | same                        |
| A3  | `<div role=slider>` + `aria-valuenow/min/max` + label → axe | clean                                                         | clean                                                       | clean                       |
| B2  | `aria-valuetext="40 percent"` on the range → AX node        | `valuetext: "40 percent"`                                     | — (no AX read)                                              | — (no AX read)              |
| C1  | `input[type=range]::before { content }`                     | **renders** (measured by pixel)                               | **does not render** (see J1)                                | **does not render** (J1)    |
| C2  | `appearance: none` + engine pseudo-elements                 | `::-webkit-slider-*` honoured                                 | `::-moz-range-thumb` 44px, `::-moz-range-progress` honoured | `appearance: none` honoured |
| D1  | LTR horizontal, click far left / far right                  | `0` / `100`                                                   | `0` / `100`                                                 | `0` / `100`                 |
| D2  | `dir="rtl"` horizontal, click left / right                  | `100` / `0`                                                   | `100` / `0`                                                 | `100` / `0`                 |
| D3  | `writing-mode: vertical-lr`, click top / bottom             | `0` / `100`                                                   | `0` / `100`                                                 | `0` / `100`                 |
| D3′ | `+ direction: rtl`, click top / bottom                      | `100` / `0`                                                   | `100` / `0`                                                 | `100` / `0`                 |
| D4  | `appearance: slider-vertical` still parsed                  | yes                                                           | **no (`auto`)**                                             | yes                         |
| E1  | two overlaid ranges, click at the lower thumb               | upper input moves                                             | upper input moves                                           | upper input moves           |
| F1  | `<datalist>` linked, click at 33%                           | `32` (no snap)                                                | `32` (no snap)                                              | `32` (no snap)              |
| G   | Arrow / PageUp / Home / End, `step` 1 and 0.1               | `±1` / `±10` / min / max                                      | identical                                                   | identical                   |

## Decision

### The element is the native range, because the alternative obliges what it should merely allow

`<div role="slider">` is a legitimate way to build this and it fails on a measurement that has
nothing to do with looks: `aria-valuenow` is a **required** state of the role, and a `<div>`
has no value for anyone to derive it from, so an unwritten one is a critical
`aria-required-attr` in all three engines (A2). The div road therefore _obliges_ the component
to publish `aria-valuenow`, `aria-valuemin` and `aria-valuemax` on every render, for ever — and
it obliges us to write the keyboard, because a `<div>` has none.

`<input type="range">` is handed the slider role for free, needs only a label (A1), and reads
`valuemin` / `valuemax` / `valuenow` off its own `min` / `max` / `value` with no ARIA at all.
The keyboard is the platform's and it is **the same in all three engines** (G): `ArrowUp` /
`ArrowRight` step up, `ArrowDown` / `ArrowLeft` step down, `PageUp` / `PageDown` move ten
steps, `Home` / `End` jump to the bounds, and `step` — integer or `0.1` — is honoured without
float drift. `disabled` removes the control from the Tab order in all three. This is
[`req-api-platform`](../requirements/api.md#req-api-platform) read exactly as the radio group
reads it: we add handling only where the platform has none, and here it has all of it.

`PctSlider` implements `FormValueControl<number>` from signal forms. The value is a `number`
and never `T`: a slider is a position on a numeric continuum, and a control with named steps
("Small / Medium / Large") is still numeric underneath with a `format` for display — so
[`req-api-generic`](../requirements/api.md#req-api-generic) is satisfied by _not_ being
generic, the value type the option list would otherwise decide being fixed by the geometry.

### It is skinned by drawing beside the control, not on it — and C1 is why

**This section was rewritten while the component was built. The road it first described does
not work, and the probe that said it did had measured the wrong thing.** What is kept is the
finding, because a decision that quietly swaps its mechanism is worth less than one that says
where it was wrong.

C1 asked whether a range carries generated content and read
`getComputedStyle(el, '::before').content`. That reads the DECLARATION, not the rendering, and
an `<input>` is a replaced element on which the box is never generated. Sampled by pixel
instead (J1 below), `input[type=range]::before` renders in **chromium and in neither of the
other two** — and where it does render, an absolutely positioned one paints ABOVE the UA
shadow content, so a fill drawn that way covers half the thumb it ends at
([`lesson-118`](../lessons.md#lesson-118)).

The gradient half of C2 held: `linear-gradient` on `::-webkit-slider-runnable-track` /
`::-moz-range-track` renders identically in all three (J2). It is refused for a different
reason, and it is this repository's own: **a gradient's direction is physical**. There is no
`to inline-end`, so an RTL slider under that road needs a rule that reads the direction —
the one thing [`req-token-logical`](../requirements/tokens.md#req-token-logical) forbids, and
the very promise this decision opened by claiming it kept.

So the drawing is **boxes of the component's own**, with the native range laid over them at
`opacity: 0` — the same technique `PctSwitch` uses, for an argument the switch never had to
make. The track, the travelled fill, the ticks and the thumb are elements with
`inset-inline-start` and `inline-size`, which mirror under `dir="rtl"` and rotate under the
vertical writing mode with no second rule anywhere. The input stays the native element: it
keeps the role, the value, both bounds, the keyboard, the form participation and — because
the drawn parts are `pointer-events: none` — every press and every drag (J3).

The engine pseudo-elements survive for **geometry alone**. The platform maps a pointer
position to a value through the native thumb's width, so `::-webkit-slider-thumb` and
`::-moz-range-thumb` are given the size of the thumb we draw and nothing else; measured, the
drawn thumb's centre then lands within **1 px** of the pointer that set it, in all three
engines (J4). Nothing there paints.

The wrapper argument [0041](0041-a-height-the-platform-computes.md) lost is not lost again
here, and the difference is worth naming: `PctAutosize` is a directive ON the consumer's
`<textarea>`, so a wrapper would have had to appear in the consumer's markup. `PctSlider` is a
component with a template of its own, and the native input is already inside it — the boxes
cost a consumer nothing they can see.

### The value the platform cannot pronounce is ours, and it is written only when it exists

The native range announces `aria-valuenow` as a bare number, which a screen reader speaks in
the user's own language with no help from us. A **formatted** value — `1 234,5 €`, `20 %`,
`Medium`, a date — is not self-explanatory, and that is the only case the component acts on:

- a visible **value bubble**, formatted with `Intl.NumberFormat` and the same `locale` input +
  `LOCALE_ID` fallback as `[pctNumber]` ([0009](0009-number-field.md)), shown when a `format`
  or `labels` is given;
- `aria-valuetext` set to that same string, and **only then**. It reaches the accessibility
  tree — measured on the range's AX node in chromium (B2). An unconditional `aria-valuetext`
  mirroring the bare number is the inert-attribute trap of
  [0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md) worn a second time: a
  string the component writes to itself, that no reader needs and no gate can catch drifting.

### Vertical is `writing-mode`, and it is an input

`orientation="vertical"` changes no type — the value is a `number` either way — so by
[0034](0034-multiplicity-is-a-tag.md)'s rule read the other way it is an **input**, not a tag
(the same reading that made filtering an input in [0035](0035-a-filter-is-a-question-not-a-value.md)).

The mechanism is `writing-mode`, not `appearance: slider-vertical` — firefox has already
dropped the latter (D4). A vertical range under `writing-mode: vertical-lr` runs top-to-bottom
in all three engines (D3); "up increases", which every APG example and every design here
wants, is `writing-mode: vertical-lr` with `direction: rtl` layered on, and that combination
is identical across the three (D3′). RTL for the _horizontal_ slider needs nothing at all —
the platform mirrors it (D2). No rule reads the direction;
[`req-token-logical`](../requirements/tokens.md#req-token-logical) holds.

### The range (two-thumb) slider is deferred, and when it arrives it is a tag

Two overlaid `<input type="range">` is the composition every "just use two natives" answer
proposes, and it does not work: a pointer press at the lower thumb's position moves the
**upper** input in all three engines (E1), because the top element captures the event. A
native range-slider needs per-pointer `pointer-events` / `z-index` coordination — it is a real
widget, not a free composition.

And the value forks: a single slider is `number`, a range is `[number, number]`. The compiler
relates no input to another's type, so one component serving both declares
`number | [number, number]` and breaks the single consumer's `(valueChange)` handler — this is
[0034](0034-multiplicity-is-a-tag.md) exactly, arriving from the numeric side. So
`<pct-range-slider>` is a **second tag over shared internals**, built when a consumer asks for
it. Recorded as a finding, not built now.

### Ticks are our drawing, not `<datalist>`

`<datalist>` linked to a range renders a visible tick in chromium and webkit and **none in
firefox**, and it does not snap — a click at 33 % of a 0–100 track lands on 32, not on the 25
or 50 the list declares, in all three engines (F1). So marks are `::before` / `::after` we
draw from the `step` and an optional `marks` input, and snapping is `step` alone.

### The chrome, as on the switch

`fieldAppearance: 'bare'` — a field frame around a slider looks foreign, the same call the
switch made ([0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md)).
`labelStrategy: 'for'`, one message line with the error taking it and announced from
`role="alert"` ([0022](0022-one-message-line.md),
[0026](0026-one-channel-per-politeness.md)).

## Consequences

- A slider keeps every native attribute and the entire platform keyboard, because it _is_ the
  native element.
- The per-engine rules are two, they set a SIZE, and they paint nothing — so a regression in
  one of them shows up as the drawn thumb drifting away from the finger dragging it, which is
  what the e2e measures (within 1 px, three engines) rather than reading the sheet.
- The ticks stand behind the fill. That is a contrast pair and not a drawing preference: a
  mark has one colour and no colour clears 3:1 against both the rail and the travelled part.
- `orientation` and `marks` are inputs; there is no `range` input and no `multiple` — a second
  thumb is `<pct-range-slider>`, a tag that does not exist yet.
- The forced-colors block has to repaint the thumb, the track and the fill explicitly
  (`appearance: none` removes the platform's own high-contrast rendering) — a `check-styles`
  point 7 concern for the implementation, the same one the switch's first draft tripped
  ([`lesson-70`](../lessons.md#lesson-70)).

## What this costs us

- **`aria-valuetext` is measured in one engine.** Playwright 1.61 removed `page.accessibility`
  and its `ariaSnapshot` reports `valuenow`, not `valuetext`, so B2 is confirmed on chromium's
  CDP AX tree and rests on HTML-AAM plus the visible bubble being the primary channel in the
  other two. If a consumer reports a reader that ignores it, the bubble still carries the
  value on screen.
- **The control is invisible.** `opacity: 0` over drawn boxes is the switch's technique and
  it carries the switch's price: a consumer overriding `.pct-slider__control` with a paint
  rule of their own will see nothing happen, because what they can see is never that element.
- **The untravelled rail is below SC 1.4.11.** 1.23:1 against the page, recorded as a `warn`
  with the reason in the policy's own name: the thumb and the fill are what identify the
  control, and no single rail colour clears 3:1 against both the page and the fill.
- **`appearance: slider-vertical` is not a fallback.** It still works in chromium and webkit,
  but writing it would be a rule that means nothing in firefox — the shape
  [0041](0041-a-height-the-platform-computes.md) refused for `field-sizing`. Vertical is
  `writing-mode` in all three or it is not shipped.
- **Two thumbs are a promise deferred.** A consumer who wants a min–max range today has to
  compose two `PctSlider`s themselves, and the composition has the pointer-capture defect E1
  measured. The finding names it.

## What the build measured

Four probes taken while the component was written, after the thirteen above. The first
overturned C1; the rest settled the road that replaced it.

| #   | probe                                                                 | chromium                      | firefox        | webkit         |
| --- | --------------------------------------------------------------------- | ----------------------------- | -------------- | -------------- |
| J1  | `input[type=range]::before` sampled **by pixel**                      | renders                       | **nothing**    | **nothing**    |
| J1′ | `getComputedStyle(el, '::before').content` beside it                  | `""`                          | `""`           | `""`           |
| J2  | `linear-gradient` on the engine track pseudo-element                  | renders                       | renders        | renders        |
| J3  | press at 25 % of an `opacity: 0` range over drawn boxes, drag to 75 % | `23` → `77`                   | `23` → `77`    | `23` → `77`    |
| J4  | the drawn thumb's centre against the pointer that set it              | **1 px**                      | **1 px**       | **1 px**       |
| J5  | `outline` on `::-webkit-slider-thumb` / `::-moz-range-thumb`          | not applied                   | **applied**    | not readable   |
| K1  | `aria-orientation="vertical"` on a HORIZONTAL range → AX node         | `horizontal`                  | — (no AX read) | — (no AX read) |
| K2  | a vertical range with NO `aria-orientation` → AX node                 | **`vertical`**                | —              | —              |
| K3  | `aria-required="true"` → AX node, range vs textbox                    | **absent** / `required: true` | —              | —              |
| K4  | `aria-readonly="true"` → AX node                                      | drops `settable`              | —              | —              |

J1′ beside J1 is the whole of [`lesson-118`](../lessons.md#lesson-118): the two disagree,
and the one that looks like the standard way to ask is the one measuring the parser.

K1–K4 are [0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md) read twice
more, and they are why the template writes neither `aria-orientation` nor `aria-required`.
The engine works the orientation out **from the writing mode** and ignores an attribute that
disagrees with it — which turns the `writing-mode` decision above from a drawing choice into
the mechanism that tells the accessibility tree. And `aria-required` reaches a range's node
not at all, where the very same attribute on a textbox reports `required: true` in the same
run: that control is what makes it a measurement rather than a missing CDP field.
`aria-readonly` is the one of the four that IS read — it takes `settable` off the node — so
it is the one of the four the component writes.

J5 is why the focus ring is drawn on a box of ours: a ring on the platform's own thumb
pseudo-element is a promise one engine of three keeps.

## Alternatives considered

| alternative                                           | why rejected                                                                                                                                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<div role="slider">` with authored ARIA and keyboard | A2: an unwritten `aria-valuenow` is a critical violation in three engines, so the role _obliges_ the component to publish three attributes every render and to reimplement a keyboard the platform already ships identically (G) |
| ~~a wrapper element around the range for skinning~~   | **This is the road taken.** C1 was wrong (J1) and the gradient that replaced it is directionally physical, so the drawing is boxes inside the component's OWN template — which costs no consumer markup, unlike the textarea's   |
| `aria-valuetext` always, mirroring `aria-valuenow`    | [0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md): an attribute the component writes to itself that no reader needs and no gate can catch drifting                                                             |
| value typed `T` like the choice controls              | a slider is a numeric position; named steps are a `format` over a number, not a `T` the option list decides                                                                                                                      |
| `orientation` as a tag (`<pct-vertical-slider>`)      | [0034](0034-multiplicity-is-a-tag.md): the value type does not change, so it is an input                                                                                                                                         |
| `appearance: slider-vertical` for the vertical case   | D4: firefox has dropped it; `writing-mode` works in all three                                                                                                                                                                    |
| `<datalist>` for tick marks                           | F1: no tick in firefox, and no snapping in any engine — an inconsistent visual and a broken promise                                                                                                                              |
| one component with a `range` input for two thumbs     | [0034](0034-multiplicity-is-a-tag.md) + E1: the value forks to `number \| [number, number]` and native composition does not survive a pointer press                                                                              |
