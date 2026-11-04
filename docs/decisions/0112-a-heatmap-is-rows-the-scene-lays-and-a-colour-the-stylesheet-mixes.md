# 0111 — A heatmap is rows the scene lays, and a colour the stylesheet mixes

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast)
**Evidence:** the sandbox demos `chart-heat` and `chart-heat-diverging` walked by
`apps/sandbox-e2e/src/chart.spec.ts`; `libs/components/chart/src/heat.spec.ts`, `ramp.spec.ts`
and `model/color.spec.ts`; the contrast gate on the 33 pairs of the heat tokens

## Context

A building's power by hour and day, a room's temperature against its set point by weekday: a
value per cell of a grid, read as a colour. The marks of 0099 to 0106 all stand on a value
axis — a line, a bar, an area, a range — and the scene maps a value to a pixel. A heatmap has
no value axis: its vertical is a list of names, its value is a colour, and the two questions
the scene had never answered are where a row stands and what colour a number is. Every chart
library answers the second with a colour scale in script — a ramp interpolated in JavaScript,
a hex per cell written into the markup — which paints the same picture under every theme, says
nothing under forced colours, and asks the server to compute colours it cannot read off a
stylesheet it does not have ([0102](0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)
already refused a colour that is the only channel).

## Decision

**The scene lays the rows.** A mark names the rows it needs (`PctMark.rows`), the scene unions
them in the order of the marks and divides the plot among them with one band scale, the whole
height — the whole width, turned — and no gap; `rowFrame(row)` is a row's strip, and the scene
writes each row's name at the left of the plot (under it, turned), moving the plot right by
the widest name. A series in a row (`PctSeriesSpec.row`) has no value axis and takes no place
in the palette: the units of the axes leave it out, the marker on the cursor's line stands at
the row's middle, and the legend, the tooltip and the table carry it as any series — a row of
the heatmap is a column of the table, so a reader walks the heatmap as the table it is. The
lanes of 0104 stay what they are: a strip under the plot for a band of states.

**The stylesheet mixes the colour.** The model maps a value to a place on the ramp, 0 to 1
(`pctSequential`, `pctDiverging`), and names the two steps of the skin's ramp the place falls
between and the share of the second (`pctRampStop`): the cell's classes are `from-3 to-4`, its
share a custom property, and its fill is `color-mix(in oklab, …)` of the two tokens the
stylesheet resolves — eight steps `heat-1` to `heat-8` for a sequential ramp, `heat-low`,
`heat-mid`, `heat-high` for a diverging one, each with an `on-heat-*` text colour over it,
semantic tokens the chart's `heat-bg-*` and `heat-fg-*` reference. So the theme paints the
heatmap as it paints a button, the server draws it without measuring a colour, and under
forced colours the ramp folds to two: a cell past the middle of the ramp is filled with the
text colour, one before it is outlined, and the picture still says low and high. The legend
of the colours is `pct-chart-ramp`: a bar of the same tokens blended by the stylesheet, the
domain's ends written under it in the chart's locale and unit, hidden from a reader because
the picture's description says the same reach in words.

**The domain is the data's, centred for a diverging ramp.** Unset, the ramp runs from the
smallest value drawn to the largest; a diverging ramp centres on zero and reaches as far on
both sides as the farther value, so the same colour means the same magnitude on either side;
a `domain` given is held at its ends. A value with no finite position is no cell and does not
stretch the ramp. Where several rows fall in one cell, the last stands, as in the bars.

**A label is written where it fits.** With `labels`, a cell wide enough for its text — the
scene's measure, four pixels of room — carries its value in the text colour of the nearer
step; a narrower cell carries none, and the table has the value anyway.

## Consequences

- Two hooks join the mark's contract, `rows` and `colorScale`, and one the scene's,
  `rowFrame` with `cellGap`; each defaults to nothing, so the existing marks are untouched.
- Forty-six tokens join the public tiers: 22 semantic (`heat-1`…`heat-8`, `heat-low`, `heat-mid`,
  `heat-high` and their `on-heat-*`) and 24 of the chart (`heat-bg-*`, `heat-fg-*`, `cell-gap`,
  `ramp-height`). The contrast gate holds every `heat-fg-X` on its `heat-bg-X` to AA as an
  error, and warns on a cell against the surface, since two neighbouring cells of a ramp are
  continuous by design and the gap between them is the edge.
- The ramp is eight steps, and two values a seventh of the ramp apart can take the same two
  steps in different shares — the eye reads a continuum, the stylesheet mixes it; a consumer
  who needs a step function sets `domain` and reads the table.
- `color-mix()` and `linear-gradient(in oklab …)` need a 2023 browser; the skin's
  `heat-bg-*` without a mix is what an older one draws, the nearer step by its class.
- The rows take the plot: a heatmap under a line shares the line's plot with no axis of its
  own, which is the heatmap's nature, not a limit — a value axis beside a ramp would say two
  things of one picture.
