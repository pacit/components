# 0098 — A table's window is opt-in, and the rows it skips are two rows the body draws without elements

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** five probes run on 2026-10-29 in the three engines this repository runs
(chromium 153.0.8010.12, firefox 155.0, webkit 26.6 — Playwright 1.63.0), every reading
written with the conditions it was taken under — the "Measurement" section below. The probes
are kept in `tmp/table-window/` of the checkout that wrote this record.

## Context

[0038](0038-a-window-is-measured-and-its-spacer-is-not-an-element.md) drew the select's
window: opt-in, so find-in-page keeps every option; geometry measured, not assumed; and the
space of the options not drawn carried by no element. It also named what would overturn it:
rows of different heights need _"a measured height per row and a layout that survives one
changing, which is a different mechanism and not a setting on this one."_

The data table of [0097](0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)
is that case. A details row is taller than a data row and a group header has a height of its
own. Its lists go from a thousand registers to a million rows of history, and the space lives
inside a `<tbody>`, where a `div` cannot stand. Four questions had to be measured, not
guessed: how many rows a bare table holds, where the skipped rows' space lives, what a row of
another height does to the scroll, and how tall a scroller may be.

## Decision

**Without `virtual`, every row is in the DOM.** The table is a table: readers count its rows,
find-in-page finds any of them, and nothing is estimated. Up to **1,000 rows of eight
columns** the bare table drew its first frame in under 400 ms and reordered every row in under
350 ms in three engines. At 2,000 WebKit took 760 ms. The card says _"above 1,000 rows, turn
on `virtual`"_, and the component measures itself under that number when it is built, since
Angular's own cost comes on top of the platform's. `content-visibility: auto` on a row is no
road: CSS Containment does not apply size containment to a table's internal boxes, and the
probe drew 10,000 rows slower with it in every engine.

**With `virtual`, the skipped rows are the body's `::before` and `::after`.** Each is
`display: table-row` with a height from a custom property the component writes on the
`<tbody>`. They are not elements: a reader meets no row that is not there, `@for` steps
around nothing, axe reports no violation and nothing to review, the sticky header stays at
the top, and every drawn row sits within half a pixel of where the sum puts it. A grouped
table carries the space on the first drawn body's `::before` and the last one's `::after`.

**A window's columns have fixed widths.** `table-layout: fixed`, with the widths of the first
drawn frame written on `<col>` unless a column states its own. Under the automatic layout a
column moved by 174.6 px between two windows of one list whose text widens further down, in
every engine; with fixed widths it moved by none.

**Heights are measured per line.** Each drawn line's height is read and kept, a line not yet
drawn counts at an estimate, and the space above the window is the prefix sum. When a line
above the row the user is reading turns out to have another height than its estimate, the
window moves `scrollTop` by the difference. Without that, every details row the user scrolled
up into pushed the rows on screen by 101 px; the engines' own scroll anchoring corrected none
of it; with the correction nothing moved by more than a pixel. This is the different
mechanism 0038 named, recorded here, and the select's window keeps its one measured height.

**Above the engines' ceiling, the space is scaled.** Firefox holds a scroller of 17,895,697 px
and Chromium and WebKit 33,554,428 px. Above Firefox's ceiling a block collapses to nothing
and a table row is cut short, so a million rows of 36 px cannot be laid out as they are. The
window keeps its space under 16,000,000 px. Past that it scales: the space is 16,000,000 px
and `scrollTop` maps to the first line in proportion. At 36 px a row, that begins near
444,000 rows. Below it nothing is scaled.

**A window says how many rows there are.** A windowed table carries `aria-rowcount` on the
`<table>` and `aria-rowindex` on every row it draws, header and footer rows too. With `h`
header rows, a data row `i` of a window starting at `offset` is `1 + h + offset + i`, and the
count is `h + total + footer rows`. axe reported no violation on that table without
`role="grid"`. A table with no window writes neither.

## Consequences

- The card states the 1,000 rows, the 16,000,000 px and the cost of fixed widths.
- A cell wider than its fixed column is cut with an ellipsis, which only paints: the full text
  stays in the cell for readers and for the column's tooltip.
- The window has one more input than the select's: the estimate of a line's height, read from
  the density token unless the consumer names one.

## What this costs us

- **Fixed widths in a window.** A column sized by the first frame does not grow for a longer
  text further down. Accepted: the alternative is columns that jump while the user reads,
  and a column can state its width or, with the layout feature, be widened.
- **A scaled scroll is coarse.** Past 444,000 rows one pixel of the bar is more than one row,
  so the bar's thumb finds a region and the keys find the row. Accepted: it is the only way
  under the engines' ceiling, and below it every pixel is a pixel.
- **The probes ran headless on a shared desk.** The timings rank the engines and the sizes;
  they do not promise a frame rate on a phone.

## Alternatives considered

| alternative                                     | why rejected                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Two `<tr aria-hidden="true">` as spacers        | elements in the body that `@for` must step around, and axe leaves a header to review in three engines |
| `transform: translateY` on the body and a sizer | the sticky header leaves with the table's box: 448,392 px off the top at a quarter of the list        |
| `content-visibility: auto` on every row         | no containment on table rows, and slower in all three engines at 10,000 rows                          |
| The automatic table layout in a window          | a column moved by 174.6 px between two windows                                                        |
| The engines' scroll anchoring for heights       | `overflow-anchor: auto` moved the scroll by 0 px at every details row, in three engines               |
| A window always on                              | find-in-page and the readers' row count lost for every table of twenty rows                           |

## What would overturn it

An engine that applies containment to table rows, so `content-visibility` skips their layout:
the bare table would then hold far more than 1,000 rows and the threshold would be measured
again. Or a ceiling that changes: the 16,000,000 px follows Firefox's.

## Measurement

All readings: headless, viewport 1280 × 800, `en-US`, the table in a scrolling frame of
1000 × 600 px, rows of eight cells built with `createElement`. A time runs from the change to
the second animation frame after it, so two frames, about 33 ms, is the floor. One run at a
time through `scripts/heavy`, on a desk other sessions share.

**P1 — the bare table** (first frame / every row reordered, ms):

| rows   | chromium 153 |   firefox 155 |   webkit 26.6 |
| ------ | -----------: | ------------: | ------------: |
| 500    |    115 / 133 |     153 / 151 |     312 / 177 |
| 1,000  |    228 / 183 |     287 / 249 |     385 / 338 |
| 2,000  |    549 / 317 |     526 / 484 |     760 / 676 |
| 5,000  |    956 / 750 |   1245 / 1132 |   1915 / 1738 |
| 10,000 |  1875 / 1483 |   2421 / 2351 |   3718 / 3588 |
| 50,000 |  9527 / 8000 | 11827 / 10817 | 18770 / 19274 |

A step of 5,000 px of scroll stayed at the two-frame floor up to 5,000 rows in every engine;
at 50,000 it took 170 ms in Chromium and 101 ms in Firefox. Find-in-page found row 9,000 in
every engine at every size that has it. With `content-visibility: auto` on every row, 10,000
rows drew their first frame in 2302, 2936 and 5650 ms against 1875, 2421 and 3718 without it.

**P2 — the space of 50,000 rows, 40 drawn**, at five scroll positions:

| candidate                 | sticky header  | row off its sum | axe                           | column drift, auto / fixed |
| ------------------------- | -------------- | --------------- | ----------------------------- | -------------------------- |
| `tbody::before`/`::after` | holds          | ≤ 0.5 px        | nothing                       | 174.6 / 0 px               |
| `<tr aria-hidden>`        | holds          | ≤ 0.13 px       | `th-has-data-cells` to review | 174.6 / 0 px               |
| `<tr aria-hidden><td>`    | holds          | ≤ 0.5 px        | `th-has-data-cells` to review | 174.6 / 0 px               |
| `transform` and a sizer   | 448,392 px off | 0 px            | nothing                       | 174.6 / 0 px               |

The same in all three engines; the drift is the widest column moving between windows of a
list whose text widens downwards. Moving the window by its own length took the two-frame
floor in Chromium and Firefox and three frames (48 ms) in WebKit, for every candidate.

**P3 — a details row 101 px taller than its estimate**, every twentieth row, after a jump to
the middle and thirty steps of 200 px up:

| correction    | `overflow-anchor` | largest move of the rows on screen |
| ------------- | ----------------- | ---------------------------------- |
| none          | `none` or `auto`  | 101 px at every details row        |
| by the window | `none` or `auto`  | ≤ 1 px                             |

The same in all three engines; the engine's own anchoring moved the scroll by 0 px in every
step.

**P4 — axe on the structures 0097 promises**, all rules including best practice and
experimental, the same in three engines:

| structure                                                          | violations | to review           |
| ------------------------------------------------------------------ | ---------- | ------------------- |
| S1 a `<tbody>` per group, `<th scope="rowgroup" colspan>` heading  | none       | `th-has-data-cells` |
| S2 a details row, `<td colspan>` holding a `<dl>`                  | none       | none                |
| S3 the empty table, its sentence in the frame with `role="status"` | none       | `th-has-data-cells` |
| S4 `aria-rowcount` and `aria-rowindex` without `role="grid"`       | none       | none                |
| S5 `aria-rowindex` with `role="grid"`                              | none       | none                |

What is left to review is axe asking whether a header that spans every column, or a header of
an empty table, has cells; it does not decide either way. Chromium reads the group heading as
a `rowheader` named by its text, and the details row as a `row` holding one `cell`.

**P5 — the tallest scroller**, the largest height an element keeps as written:

| engine       | a block       | a table row   | above it                             |
| ------------ | ------------- | ------------- | ------------------------------------ |
| chromium 153 | 33,554,428 px | 33,554,432 px | cut to the ceiling                   |
| firefox 155  | 17,895,697 px | 17,895,697 px | a block collapses to 0, a row is cut |
| webkit 26.6  | 33,554,428 px | 33,554,432 px | cut to the ceiling                   |

Under the ceiling every engine scrolled to the end and to the middle exactly.
