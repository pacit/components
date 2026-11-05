# 0120 — An export is the picture drawn again, and a description is the data's own words

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** the sandbox view `/chart` walked by `apps/sandbox-e2e/src/chart.spec.ts` ("export
and a description of its own"); `libs/components/chart/src/export.spec.ts`;
`libs/components/chart/src/model/describe.spec.ts`; `libs/components/chart/src/chart.spec.ts`
and `libs/components/chart/src/pie.spec.ts`

## Context

A chart leaves the page in three ways: a picture pasted into a report, the rows handed to a
spreadsheet, and the words a reader hears. The rows already go out as CSV through
`pct-chart-table` ([0103](0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)),
and the pie already writes its description from its shares when the consumer gives none. The
chart did neither of the other two: a picture without a `description` was announced by its
name alone, and a screenshot was the only way out for the drawing. The layers are SVG, so a
copy is near — but their colours come from the stylesheet and the tokens, which a file
opened elsewhere does not have, and an `<svg>` drawn onto a canvas reads no stylesheet at all.

## Decision

**The layers drawn again, the styles written in.** `svg()` on `pct-chart` and `pct-pie`
copies the picture's SVG layers into one standalone document of the picture's size, writes
the presentation the page computed — fill, stroke, dashes, opacity, font — into every
element's `style`, and drops the page's classes, Angular's attributes and `aria-hidden`. The
chart's name is the `<title>`, its description the `<desc>`, and the theme's surface a ground
under the layers, so a dark page exports a dark picture. `png(scale)` draws that document onto
a canvas at the device's pixel ratio and reads a PNG back. The work is `export.ts`, shared by
both scenes and kept off the public surface.

**The page's things stay on the page.** The cursor, the tooltip, the zoom bar, the brush's
grips and the legend are controls, not the picture; the export draws the data, the axes and
the annotations. The rows' CSV stays where it is, on the table: one way out for each thing.

**The data's own words.** A chart with no `description` describes the window: its ends, then
each series shown — its lowest, highest and last reading, which way it went and how many
stretches it has without readings. `pctFactsOf` reads them in one pass over the window; the
trend is the least-squares slope across the window, called level when the change it fits is
within a tenth of the series' spread, and a yes/no series tells none. A heatmap's rows are the
table's to read, not a sentence's. `describe()` reads the words out whether or not the
consumer wrote their own, so an application can put them in a caption or a report. The
sentences are six texts of `PCT_TEXTS`, placeholders in braces.

**A print keeps the colours.** In print the scenes ask for exact colours, and the zoom bar is
left out.

## Consequences

- Six texts: `chartDescribe`, `chartDescribeSeries`, `chartDescribeGaps`, `chartRising`,
  `chartFalling` and `chartFlat`.
- `describe()`, `svg()` and `png()` on `pct-chart`, `svg()` and `png()` on `pct-pie`, and
  `pctFactsOf` with `PctSeriesFacts` from the entrypoint.
- A font travels by its name: the SVG does not embed it, so a viewer without the scene's font
  draws the text in its own. Embedding a font is a file the size of the chart's bundle, for a
  picture whose words are axis labels.
- The PNG needs a browser: on the server and where the canvas gives nothing back, `png()`
  rejects.
- A description is computed for every chart that has none, on each change of the window; it is
  one pass over the rows in it, the same reading the table does.
