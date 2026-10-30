# `PctChart` — a scene of scales and the marks drawn on them

**Summary:** A chart you compose in the template: a scene that owns the axes and the colours, and marks inside it that draw your rows. The data stand beside the picture as a table.
**Entrypoint:** `@pacit/components/chart`
**Selectors:** `pct-chart`, `pct-line`, `pct-axis`, `pct-chart-table`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** none — the APG has no pattern for a chart. The scene follows the WAI
tutorial on [complex images](https://www.w3.org/WAI/tutorials/images/complex/): a picture
`role="img"` with a name and a description, and the data as a table beside it. Named in the
class JSDoc.

**A scene and its marks.** `pct-chart` measures its box, holds the scales, the window and the
colours, and draws in layers; `pct-line` and every mark after it is an element inside it whose
drawing the scene stamps into its own `<svg>`
([0099](../decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
A chart is what its template says it is, and a combination of marks is never a feature
request. The arithmetic underneath — scales, ticks in a zone, the window, the decimation — is
exported, so an application computes beside a chart with what the chart draws with.

**Layers, and the data decimated to the pixel.** The data are one `<svg>`, the axes a second,
each on a compositor layer of its own, so a label or (later) a cursor never repaints sixty
thousand readings; a line keeps the first, lowest, highest and last reading of each column of
pixels, so every peak the eye could see survives and the path holds a few thousand points
([0100](../decisions/0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)).

**Axes by unit, colours that stay.** The first unit takes the left axis, the second the
right, the third and fourth stand outside them, and each keeps its place while a series of it
stays; a series takes the palette's next place when it first appears and keeps it, so removing
one repaints none of the others
([0102](../decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)).
The time axis reads the wall clock of `timeZone`: on a day of twenty-five hours it still ticks
00:00, 06:00, 12:00 and 18:00.

**A named picture, and the data as a table.** The drawing is a picture named by `ariaLabel`
and described by `description`; `pct-chart-table` writes the series as the first layer's
`table[pctTable]`, the rows the picture shows, gaps as gaps
([0103](../decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)).

## Usage

```html
<pct-chart #chart ariaLabel="Supply air, last 24 hours" timeZone="Europe/Warsaw" style="height: 320px">
  <pct-line [data]="readings" x="at" y="value" name="Supply air" unit="°C" curve="step" />
</pct-chart>
<pct-chart-table [chart]="chart" />
```

## Contract

|             |                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `window` on `pct-chart` (`PctWindow` or `null` for all the data), `hiddenSeries` (the ids not drawn) and `cursor` (a position on the horizontal axis, or `null`), all models; `reading()` is what the cursor reads                                                                                                                  |
| **Inputs**  | `ariaLabel`, `ariaLabelledby`, `description`, `x`, `timeZone`, `locale`, `grid`, `loading`, `cursorMode`, `tooltip` on `pct-chart`; `data`, `x`, `y`, `name`, `id`, `unit`, `curve`, `area`, `color`, `end` on `pct-line`; `unit`, `floor`, `ceiling`, `includeZero` on `pct-axis`; `chart`, `caption`, `rows` on `pct-chart-table` |
| **Outputs** | `windowChange`, `hiddenSeriesChange` and `cursorChange` (the models')                                                                                                                                                                                                                                                               |
| **Slots**   | the marks and `pct-axis` inside `pct-chart`; the consumer's `<figcaption>`; `[pctChartEmpty]` for the message of an empty chart; `ng-template[pctChartTooltip]` for a tooltip of the consumer's own, given the reading                                                                                                              |
| **Parts**   | `plot`, `data`, `grid`, `axis`, `unit`, `message`, `range`, `cursor`, `marker`, `tooltip`, `series`, `area`                                                                                                                                                                                                                         |
| **Harness** | `PctChartHarness`, `PctLineHarness`                                                                                                                                                                                                                                                                                                 |
| **Tokens**  | the `--pct-chart-*` prefix, the `series` role of the semantic tier and 50 entries in `contrast.policy.json`                                                                                                                                                                                                                         |
| **Strings** | `chartEmpty`, `chartAllHidden`, `chartGap`, `chartOn`, `chartOff`, `chartTime`, `chartPosition`, `chartNoCursor`, `chartKeys`                                                                                                                                                                                                       |

**Rows, typed.** A mark takes the consumer's rows and reads `x` and `y` off them by a key of
the row whose value is a number — a key of another type does not compile — or by a function of
the row. A value that is not a finite number is a gap. The rows come ordered by `x`; in
development a row out of order is reported, not sorted.

**Colours.** `color` is a palette place from 1 to 8 — `color="3"` is the place too — or any
CSS colour; a number outside the palette is no place, and the series takes the next free one.
A place the template gives wins over a place a series kept, which moves to a free one.

**Units.** `unit` decides the axis: `°C`, `kWh`, `%`, any text; `''` is a plain number;
`boolean` is a yes/no axis from 0 to 1 labelled with `chartOff` and `chartOn`. `pct-axis` fixes
an axis's ends by its unit.

**The cursor.** `cursor` is a model in the horizontal axis's own terms — an instant, or a
number — so a change of the window or of the data leaves it where it is, and two charts can
share one. A mouse's cursor follows it and a press pins it; a tap places it, a tap on its line
clears it, and a finger held still drags it (`cursorMode="tap"` takes presses alone, `none` no
cursor at all). The keys reach it through a range beside the picture, the chart's one stop
([0103](../decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)):
every key lands on a reading, a column of pixels at least, and the range's value text is the
reading — the time and each series' value — which a reader announces in its own voice. The
tooltip writes the same reading beside the line; `pctChartTooltip` replaces its rows.

**A step and what it holds.** `curve="step"` holds each reading until the next, which is right
for data written when they change; `end` carries the last reading to a moment, `now` for a
series whose last value is still the value.

## Parts

| part      | what it is                                                     |
| --------- | -------------------------------------------------------------- |
| `plot`    | the picture: the box with `role="img"` holding the layers      |
| `data`    | the `<svg>` the marks draw into                                |
| `grid`    | the lines behind the data                                      |
| `axis`    | the `<svg>` of the axes, their lines, ticks and labels         |
| `unit`    | the unit written over a value axis                             |
| `message` | the message of a chart with nothing to draw                    |
| `range`   | the cursor's range: the chart's stop, hidden from the eye      |
| `cursor`  | the cursor's line across the plot                              |
| `marker`  | a series' value on the cursor's line                           |
| `tooltip` | the reading beside the cursor's line                           |
| `series`  | a line's path, drawn by `pct-line` into the chart's data layer |
| `area`    | the area under a line, drawn by `pct-line` when `area` is set  |

## Theming

```css
[data-theme='brand'] {
  --pct-series-1: #0f766e;
  --pct-chart-grid-border: #ccfbf1;
  --pct-chart-series-width: 3px;
}
```

## Keyboard map

| key                     | effect                                                                                               | test                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Tab`                   | reaches the cursor's range, the chart's one stop; the picture is a named image and no stop           | `apps/sandbox-e2e/src/chart.spec.ts` — "the cursor is the chart's one stop, a range named by the chart"                  |
| `→` / `↑`               | the next reading of any series, a column of pixels at least; with no cursor, the first in the window | `apps/sandbox-e2e/src/chart.spec.ts` — "the arrows walk the cursor from reading to reading, Home and End go to the ends" |
| `←` / `↓`               | the reading before; with no cursor, the last in the window                                           | `apps/sandbox-e2e/src/chart.spec.ts` — "the arrows walk the cursor from reading to reading, Home and End go to the ends" |
| `Home` / `End`          | the first and the last reading in the window                                                         | `apps/sandbox-e2e/src/chart.spec.ts` — "the arrows walk the cursor from reading to reading, Home and End go to the ends" |
| `Page Up` / `Page Down` | the first reading a tenth of the window further, or the last that way                                | `apps/sandbox-e2e/src/chart.spec.ts` — "Page Up and Page Down move a tenth of the window"                                |
| `Escape` / `Delete`     | clears the cursor; with none, `Escape` is left to the page (a dialog around the chart closes on it)  | `apps/sandbox-e2e/src/chart.spec.ts` — "Escape and Delete clear the cursor, and Escape passes on when there is none"     |

The window's own keys — zoom about the cursor, `Shift` with an arrow to pan, `0` home — come
with the next phase (0103).

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/chart/src/chart.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Keyboard map tested key by key                             | the table above — `apps/sandbox-e2e/src/chart.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/chart` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `chart-area` and `chart-area-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `forced-colors: active` — no state carried by colour alone | `libs/components/chart/src/chart.scss`, `line.scss` — the lines and the axes in `CanvasText`, no area filled, and each palette place drawn with a dash of its own (0102's second channel). The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Touch target ≥ 24×24 px outright                           | deliberately not a target of its own: the pointer moves the cursor across the whole plot, its least side far over 24 px, and the range is no target at all — the pointer never lands on it (0103)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a chart is not a control, and its height is the consumer's                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Density axis                                               | `libs/tokens/src/component.chart.json` — the gap between an axis and its labels stands on `space.2`, which the compact scope re-points                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the axes run left to right in every direction (`direction: ltr` on the layers), the screenshot `chart-area-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/chart` in `SBX_ROUTES`; the server draws the skeleton, the browser draws after measuring                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Forms                                                      | not applicable — a chart holds no value a form owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `plot`, `data`, `grid`, `axis`, `unit`, `message`, `range`, `cursor`, `marker`, `tooltip`, `series`, `area`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — the eight series on both surfaces, in the tooltip and inside a marker's ring (UI error, 32), the cursor's line (UI error), the tick labels, the unit, the message and the tooltip's text (AA error), the axis line, the grid and the tooltip's edge (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                                                  |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `chartEmpty`, `chartAllHidden`, `chartGap`, `chartOn`, `chartOff`, `chartTime`, `chartPosition`, `chartNoCursor`, `chartKeys`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./chart` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Screen-reader log                                          | Read 2026-10-30 from `docs/acr/at/` — three readers, whole sandbox, and **the instrument cannot reach this component**: the picture is a named image and no stop, the table beside it does not scroll, so `/chart` walks the demo's theme, size and direction groups and then out to the browser (NVDA `Size, grouping`, Orca `Theme · panel · light · selected radio button.`, VoiceOver `light selected radio button, 1 of 2 Theme radio group`). Nothing in the three logs reads the picture's name, its description or the table, which is what a reader reading the page would hear and is not evidence of it — the cursor's range, the next phase, is the chart's first stop (0103) |
| A docs page with live examples                             | `apps/sandbox/src/app/views/chart/` (the sandbox view). The published site: `/components/chart`, its demo's source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Unit + mutation                                            | `libs/components/chart/src/chart.spec.ts`, `model/*.spec.ts`; `libs/components/mutation.snapshot.md` — the chart's files, measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Decisions this component implements

[0099](../decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)
(the main one — a scene and its marks, a ready chart as a recipe, typed rows),
[0100](../decisions/0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)
(the layers and the decimation),
[0101](../decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)
(the window and the hidden series as models),
[0102](../decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)
(the palette and its places),
[0103](../decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)
(a named picture and its table),
[0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) (the table
the data stand in).

## Known limitations

- **No zoom, pan or legend yet.** They are the next phases of the plan (1.11); the window
  and the hidden series are models today, so an application can already set both.
- **The cursor's keys move it, not the window.** A cursor outside the window stays where it
  was put and draws nothing until the window comes back to it.
- **A series is told apart by its colour on the picture.** Under forced colours each place
  has a dash of its own; the second channel everywhere else — a dash and a marker per series
  — arrives with the legend, and until then the table names every series.
- **The rows must come ordered by `x`.** A row out of order is reported in development and
  drawn where it stands.
- **The width follows the container, the height is the consumer's** — `16 / 9` of the width
  when neither height nor aspect ratio is set.
- **Labels are measured with a canvas in the axis's font.** A skin that sets
  `font-variant-numeric` on an axis changes widths the canvas does not see.
