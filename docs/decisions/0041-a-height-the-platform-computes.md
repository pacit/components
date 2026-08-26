# 0041 — A height the platform computes, and a measurement only where it does not

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-native-input`](../requirements/api.md#req-api-native-input),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** four probes over three engines, on a bare page and on a real one —
`field-sizing: content` is in chromium 149 and webkit 26.5 and **absent from firefox 151**,
where the absence is silent and total; a `<textarea>` renders **no `::after`** in any of the
three; `field-sizing: content` **discards `rows`** (an empty `rows="2"` box is 34 px against
58); `scrollHeight` under `box-sizing: border-box` leaves a box short by its border in all
three (2 px, scrollable); and without a reset to `auto` a measured box never shrinks (294 px
kept after the value went back to one line). `libs/components/field/src/autosize.spec.ts` and
`apps/sandbox-e2e/src/textarea.spec.ts` hold the promise afterwards
([`lesson-114`](../lessons.md#lesson-114), [`lesson-115`](../lessons.md#lesson-115))

## Context

`PctText`'s selector has read `input[pctText], textarea[pctText]` since v0, so a textarea in a
field already works. What E5 names is the thing it does not do: **be as tall as what is
written in it.** The card had recorded the gap as "autosize is a separate component, not built
yet", which is a note about packaging and not one of the questions the feature asks.

There are three of those, and every one of them was settled by a browser.

## The road: the platform's, and a measurement only where the platform has none

Three ways to make a textarea follow its text, measured before anything was written:

| road                              | works in         | costs                                                      |
| --------------------------------- | ---------------- | ---------------------------------------------------------- |
| `field-sizing: content`           | chromium, webkit | nothing — it is layout                                     |
| `scrollHeight` measured in script | all three        | a read per keystroke, and three listeners it must not miss |
| a replicated `::after` in a grid  | all three        | **an element the control does not own**                    |

The third is the one most libraries ship and it was refused by a measurement rather than by
taste: **a `<textarea>` carries no generated content in any engine** — `textarea::after` with
`display: block` leaves the box at 58 px, exactly where a plain one is, in chromium, firefox
and webkit alike. The replicated text therefore needs a wrapper, and a wrapper means the
control stops being the native element, which is the whole of
[`req-api-platform`](../requirements/api.md#req-api-platform) and of
[0003](0003-wrapper-and-control.md): `type`, autofill, the mobile keyboard mode and every
attribute a consumer knows how to write.

So the first road where it exists and the second where it does not, and the `@supports` that
divides them is the implementation. What makes that honest rather than merely convenient is
that **the two are made to produce the same geometry**, which took one correction each:

- **the CSS road gets `rows` back.** `field-sizing: content` ignores the attribute — an empty
  `rows="2"` box under it is one line — so the sheet writes
  `min-block-size: calc(var(--_pct-text-rows, 2) * 1lh)`. The control draws no frame of its
  own, so N lines are exactly N line boxes.
- **the measured road gets the border back.** `scrollHeight` is the padding box and `height`
  under `box-sizing: border-box` is the border box, so `height = scrollHeight` leaves the box
  short by exactly the border — measured at 2 px of scroll, in all three engines.

Measured on the real page afterwards, the two agree: the floor equals a plain
`<textarea rows="2">` beside it, three lines are three lines and six are six, a four-line value
already in the page is drawn at four, and the cap holds at four with the rest scrolling.

## What the measured road has to be told, and the CSS road hears for free

This is the part that decides how much the fallback is worth, and none of it is guesswork:

| event                                    | CSS road      | measured road, before it was told |
| ---------------------------------------- | ------------- | --------------------------------- |
| typing                                   | 39 px → 59 px | 39 px → 59 px (`input`)           |
| a value written with **no event at all** | 39 px → 59 px | **39 px**, two lines out of sight |
| a **width** that rewrapped the text      | 39 px → 59 px | **39 px**, a line out of sight    |
| the first paint, before any script ran   | right         | the floor, until hydration        |

The second row is `patchValue` on a classic form: `DefaultValueAccessor.writeValue` assigns
`element.value` and dispatches nothing. The subscription that fixes it has to be made after
the forms directive has bound its control, which is a lesson of its own
([`lesson-114`](../lessons.md#lesson-114)). The third is a `ResizeObserver` whose callback
reads a **width**, because our own writes wake it on every height it sets — the loop of
[`lesson-110`](../lessons.md#lesson-110) waiting to happen. The fourth is a cost and not a
defect, and it is stated rather than hidden: on an engine with no `field-sizing` a
server-rendered textarea is the floor until hydration measures it.

Its price, over 300 keystrokes: chromium 34.2 → 39.6 ms, webkit 83 → 88, **firefox 41 → 66**.
The engine that needs the fallback pays the most for it, which is an argument for the road
being a fallback rather than the implementation.

## The shape: a directive, and the selector says what the type cannot

`autosize` written as an input on `PctText` would exist on `input[pctText]` too, where a
height that follows the content means nothing — an API in a shape where it does nothing, which
is what [0034](0034-multiplicity-is-a-tag.md) refused for `multiple`. The same rule read the
same way puts it in the **selector**: `textarea[pctText][pctAutosize]`.

It cannot be a component, because `PctText` already is one on that element and Angular matches
one component to a node. A directive carries no stylesheet, so the rules live in the control's
own sheet behind `[data-pct-autosize]` — which is not a workaround but the accurate division:
**in two of three engines the stylesheet IS the feature, and the directive only publishes the
floor and the ceiling into it.**

The floor is the platform's `rows`, kept as the platform spells it and written back to the
element because a directive input of that name swallows a bound `[rows]`. The ceiling has no
native spelling, so it is an input, and it travels as `lh` — the arithmetic stays in the
engine's own line box on both roads.

## Consequences

- A textarea keeps every native attribute, because it is still the native element.
- The measured road has one consumer today and a case written to **expire**: the e2e asserts
  that firefox is the engine without `field-sizing`, so the day it ships one, the run goes red
  and says the fallback has lost its last consumer.
- A skin can still move the floor and the ceiling: both arrive as lengths, and neither is an
  inline style the sheet cannot outrank.
- Two roads mean two things to keep in step. The e2e file is deliberately **one set of
  assertions over both**, run in three engines, so a change to either road that moves the
  geometry fails on the engines that use the other one.

## What this costs us

- **`resize: none`.** A drag handle is a second author of the height, and this feature is the
  first. Autosize and a handle contradict each other; the handle is what goes.
- **The two roads round differently.** `scrollHeight` is an integer, so the measured road
  writes 59 px where chromium lays out 58.78. The gate compares within a pixel and the reason
  is written down rather than absorbed ([`lesson-111`](../lessons.md#lesson-111)).
- **A `<textarea pctAutosize>` without `pctText` does nothing**, because the sheet that carries
  the feature belongs to `PctText`. The selector says so, so it is a compile-time silence
  rather than a runtime one.

## Alternatives considered

| alternative                                        | why rejected                                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field-sizing: content` alone                      | measured: firefox 151 does not have it and does not degrade — a `rows="2"` box stays two lines whatever is typed. A promise broken in one engine of three |
| the measured road alone                            | pays a layout read per keystroke in all three engines, has no height at the first paint, and needs three listeners where the platform needs none          |
| a replicated `::after` in a grid                   | measured: a `<textarea>` renders no generated content in any engine, so it needs a wrapper — and the wrapper costs the native element                     |
| an `autosize` input on `PctText`                   | the input would exist on `input[pctText]` as well, where it means nothing — [0034](0034-multiplicity-is-a-tag.md)'s rule, read the same way               |
| a second component on the same element             | Angular matches one component to a node; this is not a preference                                                                                         |
| no fallback, a plain textarea where CSS is missing | a component whose whole content is "it grows" has to grow in the three engines this repository runs                                                       |
