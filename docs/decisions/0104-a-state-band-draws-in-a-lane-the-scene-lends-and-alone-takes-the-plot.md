# 0104 — A state band draws in a lane the scene lends, and alone takes the plot

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-names`](../requirements/tokens.md#req-token-names)
**Evidence:** `tmp/duration-probe.mjs` on 2026-10-31 in Playwright's three engines; the
sandbox demo `chart-band` walked by `apps/sandbox-e2e/src/chart.spec.ts`

## Context

A smart-home card shows what a device was doing through the day — a heat pump heating,
defrosting, standing by, off — under the line of what it measured. That is a band of states
along the time axis: a block per segment, in the colour of its state. The marks of 0099 bring
series, and a series brings a value axis; an annotation (0099, amended) brings none and draws
in the plot. A band of states is neither: it has no value to put on an axis, yet it has data —
segments with a state each — that the tooltip, the legend, the table and a reader all want,
and it wants a strip of its own rather than the plot, so the line above it stays readable.
The libraries compared draw such a band as a separate chart with no value axis, which the
application then has to line up with the one above it.

## Decision

**A lane is a strip the scene lends a mark.** `PctMark.lane` names a strip under the plot
(right of it when the chart is turned), of the scene's `band-height` and a gap; marks that
name the same lane share it; `PctChartScene.laneFrame` hands the mark its rectangle. The plot
gives the lanes their room from its bottom, the time axis stands under the whole picture —
plot and lanes — and so do the clip, the cursor's line and the selection. **A scene whose
marks declare no series lends the lanes the whole plot**, in equal strips: a chart holding a
band alone is a band of states with a time axis, that `pctChartSync` lines up with the chart
above it. Both shapes, because the first gives one chart with a shared axis and no directive,
and the second composes freely.

**A band of states is a mark with no series and three new answers.** It spans its segments,
so a scene with the band alone has a window; it is not "nothing to draw" while it has a
sentence to say. For the tooltip it writes a note with a swatch (`PctMarkNote.swatch`): the
state under the cursor and how long it held, which the legend's entry of the same id shows
as its value. For the table it adds a column of text (`PctMark.columns`, `textAt`) and a row
per segment (`rowsIn`); the keys step along the segments' starts as they step along readings.
For a reader it says how long each state held in the window. Each state is a legend entry
with a toggle that hides its segments, by `id:state`; the whole band is hidden by its id. A
state takes a palette place or a colour given in `states`, else the next free place of the
palette, round again past eight — the same rule as a series (0102), and its words are its
second channel: under forced colours the segments are boxes of one colour, and the tooltip,
the legend and the table tell the states apart.

**A duration is written by `Intl.DurationFormat`.** Measured 2026-10-31: Chromium 153,
Firefox 155 and WebKit 26.6 all have it and write `2 hr, 15 min`, `1 day, 3 hr`, `45 min`
for `en`, `2 Std., 15 Min.` for `de`; a zero duration is `0 sec`
when the seconds are asked to show, and an empty string otherwise. The band writes the two
largest parts that are not zero. A runtime without the API — none of the three — gets the
same parts as `2 h 15 min`, so the fallback guards and never decides what the engines show.

**Daily hours of operation are a recipe, not a mark.** The sums of a state's segments per day
are rows for `pct-bars` with `interval="day"`; the card gives the recipe.

## Consequences

- Three additions to the mark contract, each with a default that is today's behaviour: `lane`
  (`null`), `columns` (none) with `textAt` (`null`), and a `swatch` a note may carry. The
  scene gains `laneFrame` and `xKind`; `frame` stays the plot's.
- A lane takes height from the plot: a chart of fixed height with a band under it has a
  shorter plot. The scene does not grow, because its height is the consumer's; the token
  `band-height` (16px) is the lane's.
- The band's segments are not stops of their own under focus: the cursor's range is the one
  stop, and its value text carries the state and its duration as it carries every series'
  value (0103).
- A chart with a band alone shows no value axis and no grid rows; its x axis, zoom and cursor
  are the scene's as on any chart.

## Alternatives rejected

| Alternative                                  | Why not                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A band as a series with a `state` unit       | a unit claims an axis slot, and a state has no value to scale                                        |
| A separate `pct-state-chart` component       | the scene already owns the time axis, the window, the cursor and the sync; a lane reuses all of it   |
| The scene grows by the lanes' height         | the chart's height is the consumer's CSS; growing it moves the page under them                       |
| A text written inside each segment           | text on eight arbitrary fills, or the consumer's own colours, has no contrast the policy can promise |
| Durations by `pctRelativeFormat` from `core` | relative words (`in 2 hours`) are not lengths; the platform has a formatter for lengths              |
