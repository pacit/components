# 0100 — A chart draws in layers, and its data are decimated to the pixel

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-quality-benchmark`](../requirements/quality.md#req-quality-benchmark)
**Evidence:** the probes P1, P2 and P3 on `probe/chart-0` (commit `863185d6`, never merged):
eight series of 60,480 readings in a plot 1,400 px wide, headless Chromium 153, Firefox 155 and
WebKit 26.6 at a device pixel ratio of 1 in a 1,600 × 900 viewport, on a desk shared with
another session (load average 3–6), every engine rasterising in software; and the decimation
of phase 1 timed in Node 24

## Context

The first consumer asks for eight series of up to sixty thousand readings each, under a
two-finger pinch, without stutter. A chart can draw in SVG, where text is text, a token
paints a stroke without a redraw and an end-to-end test reads the geometry; or in a canvas,
where every frame is pixels the page repaints itself, and text, a forced-colours palette and
the accessibility tree have to be rebuilt beside it. The usual argument for a canvas is the
number of points, so the question is whether the number of points is what costs.

## Decision

**SVG, in three promoted layers.** A scene stacks three boxes, each on a compositor layer of
its own (`will-change: transform`):

- the **data** layer, one `<svg>` with the data marks' paths, redrawn only when the data, the
  window or the size change, at most once a frame;
- the **axes and annotations** layer, a second `<svg>`, so a label that changes does not
  repaint sixty thousand points;
- the **cursor and tooltip** layer, HTML, the cursor moved by `transform` alone.

**The data are decimated to the pixel.** For each column of pixels a mark keeps the first,
the lowest, the highest and the last reading, in the order they were taken, a gap as a gap at
the position it starts, and one reading beyond each edge of the window, so a line enters from
the edge and a step carries the value that held before it. Above 64 readings a column the
extremes are read from a min/max pyramid built once per change of data: a run of the pyramid
that lies in one column and holds no gap gives its first reading, its extremes and its last;
any other is split down the pyramid until it does. The output is the scan's, point for point,
and its cost follows the pixels. Below 64 a column the readings are read one by one, which is
as cheap. The path is written on the pixel grid and a point that lands on the one before it is
dropped.

This decimation is for numeric series. A band of states is categorical: a column of it holds
a set of states, not a range, and the phase that brings it decides how a column of several
states is drawn.

**Label widths come from `measureText`**, once per set of ticks, with the font read from the
computed style of the axis. A skin that sets `font-variant-numeric` on an axis changes widths a
canvas does not measure, so the axes set none.

**A canvas stays a layer to be measured, not a renderer.** If a real case shows the data
layer cannot keep up, it may become a `<canvas>` under the same two layers above it, with the
same paths; the axes, the cursor, the table and the description do not move.

## The measurement

Frames a second, Chromium / Firefox / WebKit, two rounds each.

| reading                                                                  | Chromium | Firefox | WebKit |
| ------------------------------------------------------------------------ | -------- | ------- | ------ |
| nothing drawn (P1a)                                                      | 60       | 60      | 62     |
| one label changed in the data's `<svg>` (P1b)                            | 34–44    | 29      | 34–39  |
| every label changed in a second `<svg>`, the data's not promoted (P1c)   | 24–26    | 57–58   | 29–32  |
| the same with the data's `<svg>` promoted (P1c)                          | 58       | 57–58   | 58–60  |
| a cursor moved inside the data's `<svg>` (P1d)                           | 26–29    | 16      | 19–24  |
| a cursor on a promoted layer, moved by `transform` (P1d)                 | 56–57    | 58      | 59     |
| the pinch redrawn every frame, SVG in whole pixels (P1e)                 | 22–25    | 22–24   | 9–11   |
| the pinch redrawn every frame, canvas (P1e)                              | 21–22    | 17–19   | 10–11  |
| the pinch as a CSS transform of the promoted data layer, no redraw (P1f) | 55–56    | 13      | 55–56  |

| milliseconds, eight series over the whole week          | Chromium | Firefox | WebKit |
| ------------------------------------------------------- | -------- | ------- | ------ |
| decimation by a scan (P2a)                              | 10.6     | 20      | 8      |
| decimation by the exact pyramid, identical output (P2a) | 13.1     | 26      | 16     |
| the same and the paths in whole pixels (P2b)            | 16.7     | 28      | 21     |

At sixty thousand readings across 1,400 px a column holds 43 readings, and there the pyramid
does not pay: in the browsers it was slower than the scan (P2a). The phase-1 code in Node,
either road forced, two runs of seven rounds on a busy desk (P2d), places the crossing: the
scan wins both runs at 16 a column (0.9 against 1.2–1.6 ms), the two trade places at 32 and
43, and the pyramid wins both runs from 64 (2.7–3.7 against 1.3–1.6 ms) to 1,429 (59–63 against
8–10 ms). Hence the threshold at 64, at the first density where the measurement agrees with
itself. Building the pyramid costs about 7 ms a hundred thousand readings, 134–143 ms at two
million: paid once per change of data, which is cheap for history and not for a live series of
that size.

Read together: the frame clock is healthy, and two things cost. One is the raster of dense
paths, done here in software, which a canvas does not escape: it ties SVG in Chromium and
WebKit and loses in Firefox. The other is the script of the widest window: decimation and the
path string together take 16.7 / 28 / 21 ms for eight series over the week (P2b), a frame or
more in every engine, and the path string is the larger half and the next cost to cut. The
median frame of a pinch, whose windows are mostly narrower, spent 2.1–2.4 ms of script in
Chromium, 6 in Firefox and 7–10 in WebKit, the 95th percentile 26–63 ms.

What changes the frame rate twofold to fourfold is not repainting the data when only a label
or the cursor moves, and that takes promotion, not a canvas: a second `<svg>` is a layer of
its own in Firefox and not in the other two (P1c). The baseline it is read against is
unsteady — one label changed in the data's `<svg>` reads 34–44 frames a second in Chromium
unthrottled and 53–54 under the throttle — so the factor is the order of the effect, not its
measure.

A CSS transform of the promoted data layer moves a whole week at 55 frames a second in
Chromium and WebKit, twice to six times a redraw, and at 13 in Firefox, half of one. A
gesture redraws in every engine for now: a preview by transform in two engines and not the
third is two behaviours to test and to explain, and whether it is worth that is for the phase
that brings the gestures to measure on a device with a GPU, where both numbers move.

The 4× CPU throttle of Chromium slows the main thread and not the raster threads, so it slows
a canvas's raster and not SVG's: its 4.8 frames a second for the canvas against 22 for SVG
compares the throttle, not the renderers (P1g).

## Consequences

- A cursor, a tooltip and a label cost the same whatever the data are, because they never
  touch the data layer.
- Every renderer decision is a measured row the card repeats: the strategy, the engine and
  the condition.
- A series of two million readings costs a frame two to three times what one of a hundred
  thousand does, not twenty times (P2d).

## What this costs us

- **Three promoted layers in every scene**, each a compositor surface the size of the plot.
- **The raster is not ours to fix.** Eight dense series under a pinch drop frames in WebKit's
  software raster in any renderer; the chart keeps its arithmetic small and the card says so.
- **The numbers are headless and at a pixel ratio of 1.** A GPU does better, a phone at 2 or
  3 draws four to nine times the pixels, and neither was measured here.

## Alternatives considered

| alternative                                        | why rejected                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A canvas renderer                                  | no gain in Chromium and WebKit, a loss in Firefox (P1e), and text, colours and the tree to rebuild  |
| An SVG `transform` on the drawn paths in a gesture | 7–12 frames a second: the unscaled stroke repaints anyway (P1f)                                     |
| A CSS transform of the promoted layer in a gesture | 55 in two engines and 13 in Firefox, below the redraw it replaces; kept as a measured option        |
| One `<svg>` for everything                         | a label or a cursor repaints every path (P1b, P1d)                                                  |
| A second `<svg>` without promotion                 | a layer of its own in Firefox only (P1c)                                                            |
| The pyramid at every density                       | slower than the scan at 43 readings a column in the browsers (P2a), and below 64 in Node (P2d)      |
| LTTB or another shape-keeping sampler              | drops extremes; a chart of a boiler's temperature must show the peak it reached                     |
| `getComputedTextLength` for label widths           | equal to `measureText` within 0.016 px, and 10–21 ms of layout after 200 labels change at once (P3) |
