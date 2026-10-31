# 0105 — A point is picked by distance, and the Y window is the first axis's

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-names`](../requirements/tokens.md#req-token-names)
**Evidence:** the sandbox demos `chart-points`, `chart-bubbles`, `chart-dense`, `chart-log` and
`chart-xy` walked by `apps/sandbox-e2e/src/chart.spec.ts`; `libs/components/chart/src/points.spec.ts`
and `axis.spec.ts`

## Context

A smart-home card plots the power a heat pump drew against the temperature outside: eighty
days, one point each, in no order a line could follow. The marks of 0099 so far have been
lines, bars and a band of states, every one a function of the horizontal axis — a value at a
position, a band at an interval — and the cursor of 0103 is a position on that axis, which the
pointer's column gives it. A scatter breaks both: its rows come in no order, several may stand
at one position, and a cursor in the pointer's column lands between points more often than on
one. Bubbles add a third number to each point. A zoom along one axis is of little use on a
scatter, where the cloud is as tall as it is wide; and a device that draws a watt in standby
and two kilowatts heating is read on no linear axis.

Three decisions the plan left open, each measured in the sandbox before it was taken.

## Decision

**A point stands where its row puts it, and the cursor stands on the nearest point.** `pct-points`
reads `x` and `y` off the rows and sorts them — a scatter's rows have no order to refuse — and a
row with no finite value is no point. Every mark may answer `nearAt(px, py)` with its nearest
point and the distance in pixels; the scene asks each where a pointer hovers, presses or
drags, and puts the cursor on the nearest point within sixteen pixels, in the pointer's own
column otherwise. So on a scatter the cursor is always a point, and the reading is that point's
row; on a chart of a line and points it is the line's reading until the pointer nears a point.
`valueAt` of a scatter is the point AT the position and `null` between points; where two rows
stand at one position the first stands for both, and the table and the keys walk the points one
by one. A press within a point's reach — its radius and two pixels — emits `pick` with the row.

**A bubble's AREA is its size.** `size` reads a number off each row; the largest draws
`maxRadius`, the rest the radius whose area is in proportion, and none under two pixels — a
size of none, of zero or below draws a point, not nothing. The size is a column of words
beside the series in the table and a row of the tooltip, named by `sizeName` (`chartSize`
otherwise) and written with `sizeUnit`, and bubbles let one another through by
`--pct-chart-bubble-alpha`. The marks keep the series' shape (0102): a square scaled by the
square root of its area says the same as a circle, and under forced colours the shape is what
tells the series apart.

**Two points closer than two pixels draw one mark.** The points in the window are placed, and
the first of every cell of two pixels a side is drawn; a bubble wider than a cell is never
thinned, since its neighbour would have covered it anyway. Fifty thousand rows in a plot of
600 by 300 draw at most 45 000 marks, a cloud of them a few thousand, and the picture stays
light where a line's decimation (0100) could not help it.

**The Y window belongs to the first value axis, and the others follow it in pixels.** With
`zoom="xy"` every move of the window — the wheel with Ctrl, a pinch, a drag, the keys, the
zoom bar, a double tap — works `yWindow` too, a model in the first axis's unit: the same
transform (0101) run in the axis's own pixels, so a logarithmic first axis zooms by decades, and
let go to `null` once the window covers the data's domain again. The other axes take the same
stretch of pixels, each through its own scale, so the series keep their places over one
another and a log axis follows a linear one and back. Shift with an arrow up or down pans the
first axis a tenth; `0` and a double tap return both axes. One model, not one per unit: a
chart of two units zoomed independently is two charts, and `pctChartSync` lines them up.

**A logarithmic axis counts decades.** `pct-axis scale="log"` maps a value by its logarithm:
the domain is whole decades, the one under the lowest value to the one over the highest, each
the same height; the ticks are 1, 2 and 5 of every decade while they fit, the decades alone
when they do not, every k-th decade when even those are too many. A value at or below zero has
no logarithm: it is a gap on such an axis, reported in development, and with no positive value
in sight the axis shows the three decades under its top — `floor` says better. `floor` and
`ceiling` hold where they are above zero and are ignored at or below it.

**The unit of a numeric horizontal axis is written at its end.** `xUnit` on a `linear` axis
takes a line under the labels (over the axis on a turned chart) and follows the position the
cursor reads, as a value axis's unit does.

## Consequences

- A scatter's cursor never reads "no reading": it stands on a point or nowhere. A reader hears
  the point's position and value, the size of a bubble among them.
- A press anywhere on the plot asks every mark whether it picks; the points answer by
  distance, the bars by their rectangle. The order of the marks decides when two overlap.
- The Y window is in the axis's values, and the axis's whole domain follows the data in the
  horizontal window: zoom the horizontal axis onto fewer readings and the first axis's domain
  shrinks around them, while `yWindow` stays where it was put. A consumer who wants a fixed
  value axis has `floor` and `ceiling`.
- A log axis holds lines and points. Bars and areas stand on zero, which a log axis has not:
  they are not drawn there, and the card says so.
- One token (`bubble-alpha`), one string (`chartSize`), three parts (`points`, `point`,
  `swatch` of the points), one harness; `/theming` counts 778 tokens.

## Alternatives considered

- **A cursor in the pointer's column, snapped to the nearest X.** The library's cursor so far.
  On a scatter the nearest X is rarely the nearest point — a point far up the plot at the same
  position wins over one under the pointer — and the libraries compared (Vega-Lite's nearest
  selection, Plotly's `hovermode: closest`) pick by distance for a reason.
- **A Y window per unit** (`Record<unit, PctWindow>`). The plan named it and refused it: two
  axes zoomed apart tell nothing of either, and a consumer who wants that has two charts in
  step. One model, and the others follow in pixels, keeps the series over one another.
- **Circles for bubbles, whatever the series' shape.** The classic bubble chart. It drops the
  shape channel of 0102 where it matters most — bubbles of two series in forced colours — for
  a shape whose area a reader does not compare better than a square's.
- **A log axis with `nice` ends like a linear axis's.** An axis from 0.5 to 1 500 would start at
  0.5 and end at 2 000; whole decades keep the grid regular and the ticks the same for any data
  of the same decades, and are what every library compared draws.

## Related

- [0099](0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md) — the
  marks and the scales they share; this one adds a mark that is no function of the axis.
- [0101](0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md) — the
  window's transform, run here across the plot as well.
- [0102](0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md) — the
  shape a bubble keeps.
- [0103](0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md) — the
  cursor the points move onto themselves.
