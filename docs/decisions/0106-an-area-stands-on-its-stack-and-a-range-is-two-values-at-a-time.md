# 0106 — An area stands on its stack, and a range is two values at a time

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-names`](../requirements/tokens.md#req-token-names)
**Evidence:** the sandbox demos `chart-area-stack`, `chart-area-normalized`, `chart-monotone`,
`chart-histogram`, `chart-range`, `chart-candles` and `chart-box` walked by
`apps/sandbox-e2e/src/chart.spec.ts`; `libs/components/chart/src/area.spec.ts`, `range.spec.ts`,
`box.spec.ts` and `model/monotone.spec.ts`, `model/stats.spec.ts`

## Context

A smart-home card shows where the day's power came from — the boiler, the heat pump, the
panels — and the eye wants the sum as one shape with its parts as layers, or the parts as
shares of a whole that is always a hundred. The marks of 0099 so far read ONE value at a
position: a line, a bar, a point, a band of states. Four pictures the plan names read more than
one — a stacked area, whose top is a sum of other series; a range, which is a low and a high;
a candle, which is four; a box, which is five and a list — and the scene's contract knew one
value per series, one text per row of the tooltip, one place for the marker on the cursor's
line. The smooth curve every library offers had to be chosen too: a `smooth` that promises
nothing, or a monotone cubic that promises not to overshoot.

## Decision

**An area stands on its stack, and the stack is the scene's.** `pct-area` draws a series from
zero or, with `stack`, from the top of the areas naming the same stack before it. The scene
computes each stack once (`areaStackOf`): the positions every member has a reading at, in
order, and every member's start and end there, each member read at each position AS IT IS
DRAWN — by its own `valueAt`, so two series sampled on different clocks still add up — and a
gap in a member is a gap in its own layer and a zero for the layers above it; a hidden series
leaves the stack, and the layers above it come down. `normalize` makes every value its share
of the position's total in percent, the unit `%`, and a total of nothing a gap. The series'
own value is what the tooltip and the table read; where the mark draws something else — the
stack's top — it says so to the scene (`PctMark.drawnAt`) and the marker on the cursor's line
stands on the drawing, not on the value.

**A range is two values at a time, and the mark writes its own reading.** `pct-range` reads a
`low` and a `high` off each row and draws the band between them; a gap in either is a gap in
both. One series: its value is the high, which the axis, the marker and the keys follow, and
its text is both — `3 °C – 11 °C` — which is why a mark may now write a row of the tooltip and
a cell of the table itself (`PctMark.readAt`) where a number with a unit does not say it. With
an `open` and a `close` too the band becomes candles: a wick from the low to the high, a body
from the open to the close, held until the next (`curve` is a band's alone), the close the
value and the open, the high and the low notes of the tooltip and columns of the table. A
candle's body is the skin's rise or fall colour (`body-bg-rise`, `body-bg-fall`) — the `success` and `danger` tones of
0076 — whatever the series' own, and under forced colours a rising body is hollow against a
filled falling one.

**A box is five numbers and a list, computed from the rows.** `pct-box` reads the `values` of
each row and computes its quantiles once (`pctQuantiles`, the seventh of Hyndman and Fan,
which spreadsheets use): the quartiles as the box's ends, the median across it, whiskers to the
farthest values within one and a half interquartile ranges, and every value past them an
outlier, drawn as a point. The median is the value; the low, the quartiles, the high and the
outliers are notes and columns, the outliers listed six at a time with a count of the rest.
Candles and boxes take six tenths of the smallest spacing between their positions, clamped —
a body from 2 to 24 pixels, a box from 4 to 40 — so two thousand candles are still two
pixels each and three are not forty each.

**The smooth curve is monotone, and the tooltip reads the same curve.** `curve="monotone"`
joins the readings by the cubic of Fritsch and Carlson: a tangent at each reading from the
neighbouring slopes, zero where they disagree in sign, clipped so the curve stays between the
two readings it joins. `valueAt` evaluates the same Hermite segment between the same two
readings, from the same four neighbours, so the reading under the cursor is the drawn line.
`smooth` was refused as a name because it promises nothing a user can check.

**A histogram is a recipe, not a mark.** `pctBin` sorts values into bins — by Sturges' rule, by
Freedman and Diaconis, by a count or by edges given — on a nice step of 1, 2 or 5 with the
edges on the step and the last bin closed, and the bins are the `categories` of a band axis
with `pct-bars` counting each. A mark of its own would have been bars that know statistics,
and the bars already know how to be bars.

## Consequences

- Three hooks join the mark's contract: `stacked`, what a mark stands on; `readAt`, a row's
  text where the number is not it; `drawnAt`, where the marker stands. Every hook defaults
  to nothing, so the existing marks are untouched; the reading row carries `at` beside
  `value`, the table asks the mark before writing a cell.
- A stacked area is drawn at its stack's positions in the window, not decimated: a stack of
  sixty thousand readings costs its sixty thousand points, since the top of a layer is a sum
  that decimation of one series cannot keep. The members of one stack should share a curve;
  each is read by its own.
- The monotone cubic is affine in each axis, so a path in pixels and a value in data agree on
  linear axes; on a logarithmic axis the drawn curve bends in the logarithm and the reading
  is the data's, which can differ between two readings.
- `body-bg-rise` and `body-bg-fall` are the chart's own tokens over the tones, two more in
  the chart's prefix, and `edge-width` draws the line where two layers of a stack meet.
- `PctRange` as a name went to the mark; the pixel span a scale maps onto is
  `PctScaleRange`, unreleased.
