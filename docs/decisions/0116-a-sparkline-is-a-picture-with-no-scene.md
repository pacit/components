# 0116 — A sparkline is a picture with no scene: one series, one box, the words beside it

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast)
**Evidence:** the sandbox view `/sparkline` walked by `apps/sandbox-e2e/src/sparkline.spec.ts`;
`libs/components/sparkline/src/sparkline.spec.ts`; the `./sparkline` row of
`libs/components/size.snapshot.md`

## Context

A table of rooms, each with eight hours of its energy; a card with a week of a balance; a list
of devices, each with the state of its heater through the day. What each row needs is the
shape of a series in the space of a word, beside the number the row already states. The
scene of [0099](0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md) is
the wrong tool for it in three ways. It costs the chart's entrypoint — the scales, the
window, the cursor, the measuring of text — once per page, and a table pays for that even
when a cell draws three points. It is a stop: the cursor is the platform's range
([0103](0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)), and a
table of a hundred rows with a hundred stops is a table no keyboard user crosses. And it
measures its box and its labels in the browser, so the server writes a skeleton where a
cell wants the picture. The question is what is left of a chart once it has no axes, no
cursor, no legend and no table, and whether that is a component at all.

## Decision

**A picture, not a scene.** `pct-sparkline` is an entrypoint of its own,
`@pacit/components/sparkline`, on `core` alone: it imports nothing of the chart. It takes
rows and reads a number off each by a key or a function, as the marks do, or takes the rows
as numbers; anything that is not a finite number is a gap. It draws one series as a `line`
(with an `area` under it), as `bars` from nought, or as a `band` of slots that are on or off
by the chart's rule for a state, a half or more.

**One box, drawn without measuring.** The drawing is laid in a box of a hundred by a hundred
and stretched to the host with `preserveAspectRatio="none"`: a consumer sizes it with CSS —
six by one em unset, a word's place — and the server draws the whole of it, since nothing is
read off the layout. The line keeps the token's width through `vector-effect:
non-scaling-stroke`. A stretched circle is an ellipse, so the dots — the last value, and with
`extremes` the lowest and the highest — are HTML placed over the drawing by percentages, and
stay round.

**The words are the picture's.** The host is `role="img"`, named by the consumer — the row's
header through `ariaLabelledby`, as the demo does, or `ariaLabel` — with a warning in
development when it has neither, since only the application knows what is drawn. It is
described by a hidden sentence of the data's own: the lowest and the highest value and the
last, in the consumer's unit and locale (`1.1 kWh – 2.2 kWh, last 1.7 kWh`), a band's last
state (`last On`), or `No data`. Nothing in it is a stop, nothing takes the pointer, and a
reader walking the table hears the row and its shape in one pass.

**One series, one colour.** The colour is the tier's token or the consumer's `color`; there
is no place in the palette, because there is no second series to tell apart. Forced colours
draw the line, the bars, the on-slots and the dots in `CanvasText`, leave the area empty and
edge the off-slots, so a band reads by its fill and not by a hue.

## Consequences

- A tier of six tokens, `--pct-sparkline-*`: `fg`, `width`, `area-alpha`, `band-bg`,
  `dot-size`, `dot-fg`. The contrast gate holds the drawing and the dots to UI on both
  surfaces as an error, and warns on the band's off-slot, which is the surface's own shade.
- Two texts, `sparklineLast` and `sparklineEmpty`; a band says `chartOn` and `chartOff`, the
  words the chart's state band already says.
- `floor` and `ceiling` fix the range, so the rows of one table compare; unset, each row runs
  from its own lowest to its own highest, and a flat series draws across the middle. A value
  outside a fixed range is held at the edge, and the words still say the value.
- No tooltip, no cursor and no decimation: the row beside it holds the values, and a cell
  holds tens of them, not thousands. A series that needs those is a chart, and `pct-chart`
  draws it.
- It joins neither the legend nor the table of 0115's `PctLegendSource`: it is no scene, and
  the table it would make is the row it stands in.
