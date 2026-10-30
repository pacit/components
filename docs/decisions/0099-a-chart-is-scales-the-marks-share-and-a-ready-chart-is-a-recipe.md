# 0099 — A chart is scales the marks share, a mark is a slot, and a ready chart is a recipe

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-api-generic`](../requirements/api.md#req-api-generic),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking),
[`req-project-dependencies`](../requirements/project.md#req-project-dependencies),
[`req-project-ssr`](../requirements/project.md#req-project-ssr)
**Evidence:** the probes P4 and P5 on `probe/chart-0` (commit `863185d6`, never merged), whose
README holds every reading this record cites

## Context

The first consumer asks for three drawings: a time series of up to eight series in four
units, grouped bars comparing two periods with a line of means through them, and a band of
states under the series on the same time axis. The next consumer will ask for a fourth, and
the one after for a scatter, a heatmap or a pie.

The libraries compared answer this with an options object. ECharts, Highcharts and Chart.js
mix series types, mark lines and axes inside it; what a chart can combine is what the object's
schema foresaw, and the object lives outside the template, untyped where it names a field in
a string. Observable Plot answers with a grammar instead: scales, and marks drawn on them, any
number in any order.

## Decision

**A chart is a scene and the marks inside it.** `pct-chart` measures its box, holds the
scales (time, linear or band on the horizontal axis, one value axis per unit), the window,
the cursor and the selection. A mark — `pct-line`, `pct-bars`, `pct-points`, `pct-band`,
`pct-area`, `pct-heat`, `pct-reference`, `pct-span`, `pct-note` and whatever comes after — is
an element in the scene's content. Each mark is a component whose drawing stands in an
`<ng-template>` of its own; the scene stamps every mark's template through `NgTemplateOutlet`,
in the order they are declared, into the layer the mark names
([0027](0027-a-slot-is-a-directive.md): a slot is a directive). The layers are
[0100](0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)'s: the data
in one `<svg>`, the axes and the annotations in a second. So the marks of a layer share one
canvas, one clip and one coordinate system, and a mark nobody imports costs nothing.

A mark's template writes every element with the `svg:` prefix (`<svg:g>`, `<svg:path>`): an
`<ng-template>` with no `<svg>` above it in its own file parses an unprefixed `<g>` as HTML.
Each mark's spec reads the namespace of what it drew.

The scene knows a mark through one interface and nothing else: the template, the layer, the
series it brings to the legend, the axes and the data table, its contribution to each axis's
extent in a given window, and the value of a series at a position.

**A ready chart is a recipe.** "A time series with a band of states under it", "bars of two
periods with a line of means", "a dashboard of charts moving together" are written in the
component's page and measured in the sandbox, not shipped as classes. The ready components
are those a scene cannot be: `pct-chart-legend` and `pct-chart-table` beside it,
`pct-sparkline` without a scene at all, and a radial scene of its own for pies and gauges.

**The arithmetic is pure and public.** Scales, ticks, ticks in a zone, the window, the value
at a position, extents, decimation, paths, axis slots and layout live in `chart/src/model/`
with no import from `@angular/*`, and are exported: an application deciding when to fetch
finer data computes with the functions the chart draws with.

**The data are the consumer's and the accessors are typed.** A mark takes `readonly T[]` and
an accessor per coordinate: a key of `T` whose value is of the right type, or a function of
the row. `null` is a gap. The rows must be ordered along the horizontal axis; a mark checks
that once per change of data in development and warns through `pctWarn`
([0087](0087-a-warning-is-a-verdict-without-a-veto.md)) rather than sorting sixty thousand
readings on every change for a consumer whose data were already in order. A mark copies its
rows into two `Float64Array`s once per change of data, under a millisecond for sixty thousand
(0100).

## The measurement

- **The template road holds (P4).** Three marks of two classes stamped into one `<svg>` keep
  the SVG namespace in the browser's DOM and in the server's HTML, keep the order of their
  declaration, stand inside the clip group, and stay apart as two instances of one class. The
  marks' host elements never reach the DOM, so nothing foreign stands inside the `<svg>`.
- **The accessors are checked by the template compiler (P5).** With `strictTemplates`, `T` is
  inferred from `[data]`, a static attribute `x="at"` is checked against the keys of `T`, and
  exactly the four wrong uses fail: an unknown key, a text column as a value, a nullable
  column as a position, an accessor returning text. The three right ones compile.

## Consequences

- A consumer writes a chart as a template, and the template is the documentation of what it
  draws.
- A new chart type is a new mark in the same entrypoint, measured on its own row of the size
  snapshot, and a combination of marks is never a feature request.
- The scene is one file and the phases that grow it are serial; marks are files of their own
  and two of them can be built side by side.

## What this costs us

- **No `type: 'bar'` shortcut.** A consumer who wants a chart in one line writes four. The
  recipes are the answer, and they are measured, so they do not rot.
- **The scene must know every layer a mark may want.** A mark that needs something the
  interface does not give is a change to the scene, not a change to the mark.
- **Ordered data are the consumer's duty.** A warning in development, not a sort.
- **A change of data is a copy of all of it.** Readings arriving live are a new array each
  time, copied and decimated whole; whether that needs an append that copies only the tail is
  measured with the live data, not assumed here.

## Alternatives considered

| alternative                                                    | why rejected                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A component per chart type (`pct-time-chart`, `pct-bar-chart`) | each carries the inputs of every combination it foresaw; a threshold on bars is an input a bar chart did not plan   |
| An options object, as ECharts takes                            | a second language beside the template; fields named in strings; the chart reconfigured from the object on change    |
| Marks as directives on SVG elements the consumer writes        | the consumer's elements stand in the consumer's template, outside the scene's `<svg>` and its coordinates           |
| d3 underneath                                                  | a runtime dependency for arithmetic of a few hundred lines that must know named zones and `Intl`, which d3 does not |
| Sorting the data in the mark                                   | sixty thousand readings sorted on every change, paid by every consumer whose data are already in order              |

## Amended 2026-10-30: a warning in development is a console warning

The record said a mark reports rows out of order "through `pctWarn`". `pctWarn` is a form
field's warning ([0087](0087-a-warning-is-a-verdict-without-a-veto.md)), shown to a user beside
a value; rows out of order are a developer's mistake. The mark warns as every component of this
library warns its developer: `console.warn` under `isDevMode()`, naming the series and the
first row out of order.

## Amended 2026-10-30: a band is a span on the continuous scale

The bars (phase 6 of 1.11) brought no band scale to the scene. A bar's band is a span on the
horizontal axis the scene already has — a calendar interval of the zone when the chart names
an `interval`, or `[i, i + 1]` for the i-th of its `categories` — and the bar takes the
pixels of that span, four fifths of them. So the cursor, the window, its gestures and
`pctChartSync` work under bars exactly as under lines, a line on the same scene draws through
the bands' middles at `i + 0.5`, and the day of twenty-five hours is a wider bar, as it is a
longer day. `pctBand` of the core stays for what cuts a range into equal slots with nothing
to measure them by.
