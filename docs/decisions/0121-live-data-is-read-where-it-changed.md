# 0121 — Live data is read where it changed, and a recount eases

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)
**Evidence:** the probes on branch `probe/chart-15b` at 6d54cd92 (`probes/chart-live/`: eight
series of 60 000 readings under `follow`, a reading each a tenth of a second, sixty seconds in
three engines, before and after); `libs/components/chart/src/model/columns.spec.ts`,
`model/decimate.spec.ts`, `model/tween.spec.ts`, `tween.spec.ts` and `animate.spec.ts`; the
sandbox view `/chart` walked by `apps/sandbox-e2e/src/chart.spec.ts` ("live readings and a
recount eased")

## Context

A chart of a building's meters is live: a reading arrives, the oldest leaves, and the window
follows the present ([0100](0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)
measured the frame, not the stream). The plan asked for the stream to be measured before
anything was built for it — an `append(id, points)` on the chart only if `data.set` turned out
too dear — and for motion as an opt-in, off by default, because readings that slide under the
eye as they arrive are flicker, not information.

Measured (P1): eight series of 60 000 readings under `follow`, one reading added to each ten
times a second, the window ten minutes. Each tick took 59 ms in Chromium, 54 ms in Firefox and
32 ms in WebKit from the `set` to the render (p50), and kept the main thread busy 61%, 67% and
38% of the time; 115, 451 and 45 frames of a minute ran over 50 ms. The profile (P2) put
nearly all of it in two places, once per series per tick: reading the 60 000 rows into columns
(3.7 ms a series in Node) and building their min/max pyramid (2.5 ms). The consumer's own copy
of the rows was a twentieth of it.

## Decision

**The rows already read are not read again.** A mark keeps the rows it read last. When the
next rows are those with some dropped from the front and some added at the back — the same
objects, in the same order, as `[...rows.slice(1), row]` gives — it reads only the rows added
into columns that have room behind them, and the columns it handed out before are never
written over (`pctColumnsReader`). Any other rows are read whole and give the same columns as
`pctColumnsOf`. `data` stays the one source of truth: no `append` beside it, no second way of
saying what the series holds, and every consumer that already updates immutably gets the fast
road without a word. Line, area, bars and range read this way.

**A pyramid only where it pays.** The pyramid serves a frame that reads many readings again,
as a pan over a wide window does; built again on every change, it costs what it saves (P3).
A mark builds it only when the window holds more than 16 384 readings (`pctPyramidPays`), so a
live series in a short window is decimated by a scan of that window and builds no pyramid at
all. The result is the same either way; only the cost moves.

After (P1): each tick took 11, 13 and 9 ms; the thread was busy 15%, 40% and 13%; frames over
50 ms fell to 0, 9 and 1.

**Motion is asked for, and only a recount moves.** `animate` on `pct-chart`, off by default,
eases a change that only moves the values — the same positions, in the same number: a forecast
revised, the bars of a period recounted — from what was drawn to the new values, frame by
frame, over twice the motion axis's transition (300 ms), as the table's rows move
([0116](0116-pinned-rows-stand-outside-the-lines-and-a-move-is-the-applications.md)).
Readings added or dropped move the positions and are drawn at once, so a live series never
slides even with `animate` on. The easing is the token's, computed by the browser: an effect
with no target is run for the duration and its eased progress read each frame (P4) — the same
in all three engines, and no Bézier of our own. `prefers-reduced-motion` takes the transition
to nought on the token axis (0008), so a reader who asked for less motion sees every change
at once. A change on its way is taken up from where it stands.

**What is drawn eases; what is read does not.** The path, the axis that follows it, the stack
above a bar and the value the cursor reads are the drawing, and move with it. The table, the
description and `readings()` read the rows, never a step on the way.

## Consequences

- A row kept is not read again. A row whose value changes is a new object; an accessor that
  takes the row's index, whose answer moves with the rows dropped, reads every row every time.
- The columns have room behind them, up to twice the readings a series holds. Over the sixty
  seconds of P1 Chromium's heap after a collection grew by 12 MB for eight series of 60 000,
  against 65 MB before.
- A live series shown whole stays dear: with all 60 000 readings of each in the window, a tick
  still took 54, 50 and 66 ms (P1), spent decimating 60 000 readings to the pixel and building
  their pyramid. A pyramid kept up reading by reading, and a decimation that redraws only the
  last column, would answer it; neither is built until a consumer needs a whole day live at
  this rate. Until then, readings gathered and added once a second cost a tenth of it.
- `pctColumnsReader`, `pctPyramidPays`, `pctTweenable` and `pctTween` are on the entrypoint,
  and `animate` on `pct-chart` and `PctChartScene`.
- Lines, areas (alone or on a stack) and bars (alone, grouped or stacked) ease. A compared
  period's bars, ranges, points, boxes, the heatmap, the pie and the gauge draw every change at
  once.

## Measurements

| #   | What                                                                         | Read                                                                                                                                   |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | 8 × 60 000 under `follow`, a reading each per 100 ms, 60 s, production build | 10 min window, p50 render before → after: chromium 59 → 11 ms, firefox 54 → 13, webkit 32 → 9; whole window: 63 → 54, 71 → 50, 71 → 66 |
| P2  | Chromium CPU profile, 5 s, 10 min window                                     | before: columns 1.30 s + accessor 0.47 s, pyramid 0.95 s, the consumer's copy 0.14 s; after: identity check 0.25 s, copy 0.20 s        |
| P3  | Node, one series of 60 000, decimation across 860 px, scan / pyramid         | pyramid built 2.5 ms; 600 in window 0.15 / 0.08 ms, 16 000 0.80 / 0.78, 60 000 2.50 / 1.47; extent at 16 000 0.41 / 0.007 ms           |
| P4  | `KeyframeEffect(null)` progress at 600 of 1000 ms under `steps(2, end)`      | 0.5 in chromium 153, firefox 155 and webkit 26.6: the progress read is the eased one                                                   |

## Amended 2026-11-05: the pyramid grows with its columns

A live series shown whole was dear mostly for its pyramid, built again on every tick over
60 000 readings: 1.09 s of a five-second profile (P6). `pctPyramidGrower` keeps the pyramid it
built last, and when the next columns are those columns with readings dropped from the front
and added at the back of the same buffer — as `pctColumnsReader` hands them out — it builds
only the runs over the readings added. Its runs count from the start of the buffer, not of the
columns, so a reading dropped moves an offset and not the runs. A run cut by either end of the
columns is split down to its readings, as one cut by the window's edge always was, so neither
the readings dropped nor the room past the end is read through a run. Lines and areas build
their pyramids with it; the columns of another buffer, and readings put before the start, are
built whole.

What is left of a whole window live (P6): the decimation of 60 000 readings to the pixel
(0.83 s of five), the description's facts (0.41 s — a least-squares line through every reading
in the window, which running sums would keep only by losing the digits a slope of instants
needs), the identity check of the rows kept (0.23 s) and the consumer's own copy (0.18 s). A
decimation that redraws only the last column is still not built.

| #   | What                                                         | Read                                                                                                                                                    |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5  | P1 again on this desk, before → after the grower, p50 render | whole window: chromium 49.5 → 37 ms, firefox 50 → 33, webkit 66 → 38; frames over 50 ms 75 → 4, 373 → 115, 547 → 481; 10 min window unchanged (9–13 ms) |
| P6  | Chromium CPU profile, 5 s, whole window, after the grower    | pyramid 1.09 s → 0.05 s; decimation 0.83 s, facts 0.41 s, identity check 0.23 s, the consumer's copy 0.18 s                                             |

## Amended 2026-11-05: points, ranges, the pie and the gauge ease

The first cut eased lines, areas and bars and left the rest drawn at once. The same rule
reaches four more: a change that keeps the shape eases, one that changes it is drawn at once.

- **Points and bubbles** ease each point's position and a bubble's size while the points are
  the same in number and place along the axis; added or dropped, they are drawn at once.
- **Ranges and candles** ease the low, the high, the open and the close together, and a band
  that loses or gains its candles' ends is drawn at once.
- **The pie** eases the values of its slices while the same slices stand in the same order,
  and the turn is cut afresh from the eased values each frame; a slice added, dropped, folded
  into the rest or hidden by the legend is drawn at once. `animate` on `pct-pie`, off by
  default: it is a scene of its own, with no `pct-chart` to carry it.
- **The gauge** eases its fill or its needle from one value to the next, and a value that
  comes or goes is drawn at once. `animate` on `pct-gauge`, off by default, for the same
  reason.

What is read stays the truth here as well: the table, the description, `readings()`, a
slice's share (`shareOf`) and the meter's `aria-valuenow` and words are the new values from
the first frame. One easing serves them all (`pctEased`, inside the entrypoint): the drawn
value is the last one drawn, and a change it can ease is run on the token's curve as the
lines' is. A compared period's bars, the boxes and the heatmap still draw every change at
once — none of them has had a consumer ask.
