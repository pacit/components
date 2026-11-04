# 0115 — A pie is a scene of shares, and a gauge is a meter drawn as an arc

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast)
**Evidence:** the sandbox demos `chart-pie`, `chart-donut` and `chart-gauge` walked by
`apps/sandbox-e2e/src/chart.spec.ts`; `libs/components/chart/src/pie.spec.ts`, `gauge.spec.ts`,
`model/arc.spec.ts` and `model/places.spec.ts`; the contrast gate on the gauge's eleven pairs

## Context

A month's energy by what used it, a battery's charge, a heat pump's load against its limit:
the shares of a whole, and one value against its range. Neither stands on the scales of
[0099](0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md): a pie has
no axis at all — its position is an angle and its value a share — and a gauge has one value,
not a series of rows. A pie drawn as a mark of `pct-chart` would carry a scene it never uses,
its axes hidden, its window and its cursor reading positions it does not have; and the legend
and the table, which take a `PctChart`, would be shut to it. A gauge drawn as a chart would
read to a screen reader as a picture with a range of one stop, when the platform has a role
for exactly this: a meter, with a minimum, a maximum, a value and a text for it. The question
is what a pie and a gauge share with the charts, and what they are instead.

## Decision

**A pie is a scene of its own.** `pct-pie` takes rows and reads a value and a name off each
by the same typed accessors as the marks, and every slice is a `PctSeriesSpec` — placed in the
palette by first appearance by `pctPlaces`, which moves out of `pct-chart` into
`model/places.ts` so both scenes place the same way, painted by `data-pct-series` as a bar is.
The pie is a figure with a picture `role="img"`, named and described (generated from the
shares when the consumer gives none), one `<svg>`, and the cursor's range as the one stop
([0103](0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)): the arrows
move it from slice to slice and the range reads `Name: value, share`; `Enter` selects the
slice and emits `pick`. The angles are pure functions (`pctSlices`, `pctArcPath`), the labels
are laid by `pctPieLabels` on leaders beside the arc, pushed down where they would cover one
another and dropped where they would leave the box, and the smallest values past `others`
fold into one slice of the rest — only when there are two or more, since a slice of one is
the row itself. The gap between slices is a stroke in the surface's colour, the stylesheet's
and not an angle in script.

**The legend and the table take a source, not a chart.** `PctLegendSource` names what the
legend reads — the series, the hidden ones, the places, the reading, the marks, a swatch and a
summary by id — and `PctChart` and `PctPie` both implement it; `pct-chart-table` takes either,
and for a pie lays a row per slice with its value and its share, and the total at its foot.
A consumer's template reads the same for both scenes.

**A gauge is a meter drawn as an arc.** `pct-gauge` is a `div role="meter"` with the
minimum, the maximum, the value and a value text — the value in its unit and the word of the
band it falls in, `21.5 °C, Comfort`, `No reading` for none — and the drawing is hidden from a
reader: a track of `sweep` degrees about the bottom, bands on its rim in the tones of the
semantic tier, the value as an arc from the minimum in the band's tone or as a needle, the
value and the band's word in the middle. The band's word is the tone's second channel
([0076](0076-a-tone-is-two-channels-and-four-names.md)): the host carries
`data-pct-tone`, a skin paints it, a reader hears it, and under forced colours the bands are
outlines and the word is what tells them apart.

**Forced colours get a hatch per place.** Eight `<pattern>`s stand in the pie's `<defs>` and
each slice and its swatch fill with its place's pattern under `forced-colors: active`
([0102](0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)'s second
channel, for an area where a dash and a marker say nothing).

## Consequences

- Two scenes, one legend and one table: `PctLegendSource` is public, and a third scene
  (a sparkline is none, a treemap would be) joins by implementing it.
- Eleven tokens join the chart's tier: `pie-gap`, `pie-border`, `pie-size-selected`,
  `gauge-width`, `gauge-font-size`, `gauge-bg`, `gauge-fg` and the four `gauge-bg-{tone}`;
  the contrast gate holds the fill and the bands on both surfaces to UI as an error, and
  warns on the gap between the slices and the track, which are the surface's own shades.
- A pie's labels are measured with a canvas, as the axes' are, and the server has none to
  draw on, so it writes the description and a skeleton and leaves the picture to the browser;
  a long name takes radius from the circle rather than leaving the picture.
- The meter is ARIA on a `div`, since the platform's `<meter>` draws its own bar and has no
  value text; a page that forbids ARIA roles has the value in the middle as text all the same.
- `others` is a count of slices, not a share: six slices and the rest reads the same on every
  data set, and a consumer who wants a share folds the rows before they reach the pie.
