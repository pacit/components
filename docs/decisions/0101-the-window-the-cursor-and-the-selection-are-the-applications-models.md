# 0101 — The window, the cursor and the selection are the application's models

**Status:** accepted
**Implements:** [`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** the probe P6 on `probe/chart-0` (commit `863185d6`, never merged)

## Context

A chart the reader can zoom has state the application needs as much as the chart does. The
first consumer fetches finer data when the window narrows, shows the value under the cursor
in a large number above the chart, and selects a bar's interval from a table row as well as
from the chart. A chart that kept these to itself would answer each with an event and a
method, and the application would hold a copy that drifts. The library already settled the
shape: [0048](0048-a-pagination-owns-its-page-number.md) gave the pager a model of its page.

## Decision

**Five models on the scene.** `window` (the range of the horizontal axis on show, `null` for
all of it), `cursor` (a position on the horizontal axis, `null` for none), `selected` (an
interval: a bar's, or a span brushed by the reader) and `hiddenSeries` (the ids of the series
not drawn; not `hidden`, which is the platform's attribute on every element). Each is a
`model()`, so the application binds it, keeps it in a URL or a saved analysis, and sets it
from anywhere. The fifth is `picked`, one element of the data — a series and the index of
a row — which a click or Enter on a bar or a point sets and the application can set too, so a
table row highlights its bar as the bar highlights the row. A change of `data` changes none
of the five.

**The window moves through one function.** Zoom, pan, wheel, pinch, keys and buttons all
call one pure transform of the window — a factor about an anchor and a shift — which clamps
to `limits` and to `minSpan` and stops at a limit rather than shrinking against it.
`defaultWindow` is where a double press and the `0` key return; `follow` keeps the right edge
on `now()` while the window touches it, and `now` is an input, so a test sets the clock.

**Fetching is the application's.** The library gives the window and the transform; when and
how much to fetch, and how long to wait after the last move, are the application's. The
component's page carries a recipe built on those functions.

**Charts move together through a directive.** `pctChartSync` on a common ancestor ties the
window, the cursor and the selection of the scenes inside it, and aligns the left and right
edges of their plots, because two charts on one time axis whose value axes differ in width
are not aligned otherwise. A band of states under a series is two scenes and the directive.

**Gestures, by the platform's own rules.** Pointer events with `touch-action: pan-y` on the
plot: a vertical drag is the page's, a horizontal one pans, two fingers pinch about their
middle, a tap places the cursor, a press of 300 ms carries it under the finger along the
axis, a double tap returns to the default window. With a mouse the cursor follows the pointer
and a click pins it; Ctrl + wheel zooms about the pointer, the wheel alone scrolls the page.
The wheel listener cancels only when Ctrl is down. `zoom="none"` turns all of it off and gives
the plot back `touch-action: auto`.

**Every gesture has a single-pointer twin.** A pinch is a multipoint gesture and a drag a
path (WCAG 2.5.1 and 2.5.7), so a scene that zooms renders `pct-chart-zoom`: five buttons —
in, out, earlier, later, back to the default window — calling the same transform. A consumer
may render it elsewhere or replace it with buttons of their own; one who removes it removes
the twin, and the card says so. A span is selected with two clicks as well as with a drag.

## The measurement

- **`pan-y` is what hands the chart the horizontal drag and the pinch (P6c).** Under it in
  Chromium a horizontal drag delivers ten `pointermove`s and no cancel, and a pinch two
  pointer ids and twenty moves. On a box with `touch-action: auto` the browser takes both: the
  drag ends in `pointercancel` after one move, the pinch in two, and the page zooms to 3.44.
- **The browser keeps the vertical drag (P6d).** A vertical drag delivers `pointerdown`, one
  `pointermove` and `pointercancel`, and the page scrolls 251 px under `pan-y` and 253 px
  under `auto`. So the direction threshold the first consumer's phone app computes by hand
  is the platform's here, and a press carried under the finger follows it along the axis
  only: a vertical move hands the gesture to the page.
- **Ctrl + wheel arrives as one `wheel` with `ctrlKey` in all three engines (P6b).** Headless,
  the page did not zoom under a passive listener either; a desktop browser does, so the
  listener cancels when Ctrl is down.
- **A tap is a touch pointer in all three engines (P6a)**; WebKit's synthetic click after it
  reports `mouse`, so the cursor is placed on `pointerup`, not on `click`.
- Only Chromium's protocol drives a multi-step touch, so the gestures' end-to-end cases run
  there and in WebKit's single tap; Firefox covers the mouse and the keys.

## Consequences

- The cursor of one chart can be the value of a number elsewhere on the page without an
  event in between.
- A saved view is five values, and restoring it is setting them.
- The application can refuse to narrow under the bucket it fetched, by setting `minSpan`.

## What this costs us

- **No built-in fetching.** Every application that zooms into history writes the same twenty
  lines; the recipe is in the card.
- **`pan-y` takes the page's own pinch-zoom over the plot.** Zooming the page still works
  everywhere else and through the browser's zoom; a consumer who needs the page's pinch over
  a static chart sets `zoom="none"`.
- **A model the application forgets to bind still works**, as a model left alone does, but
  it lives and dies with the component.

## Alternatives considered

| alternative                                      | why rejected                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Events and imperative methods (`setWindow()`)    | the application keeps a copy that drifts, and a restored view is a sequence of calls            |
| A data source the chart calls when it zooms      | the chart would own the debounce, the margins and the cache, which are the application's policy |
| Nested charts sharing a parent scene             | ties a band of states to a series chart; the directive ties any two scenes                      |
| Touch events and a direction threshold by hand   | the platform already decides the vertical drag under `touch-action` (P6d)                       |
| Gestures alone, the buttons left to the consumer | a chart that zooms would fail 2.5.1 and 2.5.7 out of the box                                    |

## Amended 2026-10-30: what the window's phase settled

Building the window (phase 4 of 1.11) settled three details the record left open. **The zoom
bar stands over the plot's top corner** and follows the APG toolbar pattern — one stop, the
arrows between its five buttons — so a reader who tabs past a chart meets two stops, the
cursor's range and the bar, not six. **A double tap wins over a tap on the cursor's line**: two
presses within 300 ms and 24 px return the window, and the second does not clear the cursor
the first placed. **The gestures are a pure machine** (`pctGestureStep`), tested without a
browser; the scene keeps its state, raises a held finger on a timer and acts on what it asks.
