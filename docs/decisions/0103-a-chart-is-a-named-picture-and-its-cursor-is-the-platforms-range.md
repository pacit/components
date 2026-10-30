# 0103 — A chart is a named picture, and its cursor is the platform's range

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-axe`](../requirements/a11y.md#req-a11y-axe),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)
**Evidence:** the probe P8 on `probe/chart-0` (commit `863185d6`, never merged), axe 4.13 with
every tag including `best-practice` and `experimental`, in three engines

## Context

A chart is a picture, and the WAI tutorial on complex images asks for a name, a short
description and the data in a form a reader can walk. It is also a control: the reader moves
a cursor along it and reads the values under it, which the first consumer asks for from the
keyboard. No APG pattern covers a chart. Where the libraries compared give keyboard access,
it is a stop of their own with a key map of their own, which a screen reader in browse mode
does not pass keys to until the user switches modes.

## Decision

**The picture and the control are two elements.** A scene renders a `<figure>` named by the
consumer's `label`, holding:

- the picture, `role="img"` with the label as its name and a description by reference — the
  consumer's or, later, one generated from the data — and the drawing hidden inside it;
- the cursor, an `<input type="range">` over the horizontal axis
  ([0042](0042-a-slider-is-the-platforms-range.md): a slider is the platform's range), its
  value the cursor's position and its `aria-valuetext` the reading under it — the time and
  every series' value with its unit. It takes the chart's tab stop, and the pointer never
  lands on it: the plot's own gestures place the cursor;
- the caption, the consumer's.

**The range is a view of the cursor model.** Its `step` is `any`, so a value between the
window's fractional ends is not rounded to a step of one; the scene writes its `min` and `max`
from the window and then its value from the model, on every change of either, so the
browser's clamping never decides where the cursor is. The cursor model can be `null` and a range always
has a value: with no cursor the value stands in the middle and the value text says no reading
is selected; the first move places the cursor on the first or last reading of the window.

**Two roads move it, and both snap.** A key and a change of the value that comes without a
key — a mobile reader's swipe, an assistive technology setting the value — both move the
cursor to the next position that shows a different reading in the direction asked: the next
reading when readings are more than a pixel apart, the next column of pixels with a reading
when they are denser. Page Up and Page Down move a tenth of the window, Home and End go to the
first and last reading in it, as a range's keys do. The chart adds `+` and `-` to zoom about
the cursor, Shift with an arrow to pan, `0` to return to the default window, and Escape and
Delete to clear the cursor. One sentence of the keys stands as the range's description.

**The data are a table.** `pct-chart-table` renders the series as `table[pctTable]`
([0096](0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md)), its caption the
chart's label, a column per series with its unit, gaps written as a dash, an export to CSV
with the locale's separator. It is a component beside the chart, so the application decides
where it stands and whether it is open.

**Readers are measured with the component.** The phase that brings the cursor walks it in
the three readers before the card promises anything about them: whether each announces the
value text on a change, what each makes of the uneven steps, and whether Escape reaches the
page or switches the reader's mode — Delete is there for the reader that keeps Escape.

## The measurement

| shape (P8)                                               | axe                     |
| -------------------------------------------------------- | ----------------------- |
| a focusable `<div role="img">`                           | `focus-order-semantics` |
| a focusable `<div role="group">` with a role description | `focus-order-semantics` |
| a slider inside the picture                              | `nested-interactive`    |
| the picture beside a `role="slider"`                     | clean                   |
| the picture beside an `<input type="range">`             | clean                   |
| `role="application"`                                     | clean                   |
| a focusable `<svg role="img">`                           | clean                   |

Every shape received the arrow key in all three engines; the question was never whether the
key arrives but what a reader makes of the element that receives it. axe separates less than
the table suggests: `focus-order-semantics` reads only `div`, `span`, `p` and headings, so a
clean `<svg>` and a clean `application` are shapes the rule does not look at. What axe shows
is that a focusable picture built of a `div` is a stop with no role to act on, and that a
control inside a picture is hidden by it. The choice of a range rests on the platform: a range
is a control every reader knows and switches to focus mode for, with keys a reader expects
and a value text it reads when the value changes.

## Consequences

- The reading under the cursor is announced by the reader's own handling of a range, in its
  own voice and timing, with no live region of ours.
- The picture keeps a name and a description a reader reaches in browse mode, with no stop.
- The arrows change meaning only where a range is focused, which is where a reader expects it.

## What this costs us

- **A range whose steps are not even.** A reader that computes a percentage from the value
  announces one nobody asked for; the value text is there to override it, and the readers'
  walk says whether it does.
- **A range with no "none".** The middle stands for no cursor, and only the value text tells
  the two apart.
- **The readers are not measured yet.** This record chooses by the platform's semantics;
  the readers' walk binds at the phase that brings the cursor.

## Alternatives considered

| alternative                                | why rejected                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A focusable picture                        | a stop with nothing to act on (`focus-order-semantics` on a `div`); browse mode keeps the arrows   |
| `role="application"` on the chart          | turns off browse mode for the whole picture and asks the reader to trust a key map of ours         |
| `role="slider"` on a `<div>`               | the platform's range gives the same role, the keys and the change of value without our code (0042) |
| A slider inside the picture                | an image's children are presentational: `nested-interactive`                                       |
| A live region for every move of the cursor | a second voice for what the range's value text already says                                        |

## Amended 2026-10-30: the name is `ariaLabel` or `ariaLabelledby`

The record called the picture's name `label`. A component that keeps its widget inside its
template is named in this library by `ariaLabel` and `ariaLabelledby` — the pair a consumer
writes on every other one, and the pair `check-aria` asks of a host that does not carry the
role itself. The chart takes the same two: `ariaLabel` names the picture and captions the data
table; a chart named by a heading on the page takes `ariaLabelledby`, and its table a
`caption` of its own.
