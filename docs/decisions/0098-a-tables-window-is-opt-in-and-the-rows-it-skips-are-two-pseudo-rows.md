# 0098 — A table's window is opt-in, and the rows it skips are two rows the body draws without elements

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** five probes run on 2026-10-29 in the three engines this repository runs
(chromium 153.0.8010.12, firefox 155.0, webkit 26.6 — Playwright 1.63.0), every reading
written with the conditions it was taken under — the "Measurement" section below. The probes
and their readings stand on `probe/table-window-0098` (commit `cdfcb2e5`, never merged), in
three runs: P1 and P4 from the first, P5 from the second, P2 and P3 from the third, each run
after the probe it repeats was corrected, as the branch's README says. The window built on
it, `pctTableWindow`, is held by `apps/sandbox-e2e/src/datatable.spec.ts` in the same engines —
a hundred thousand rows and a million, the scroll up through rows of two heights, the columns'
widths — and its own numbers, read on 2026-10-31, stand in the card's "How much it holds".

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
find-in-page finds any of them, and nothing is estimated. The test was a first frame and a
reorder of every row each under 400 ms in every engine, a line this record draws, not one
taken from a source. **1,000 rows of eight columns** passed it in three engines, WebKit's first
frame the slowest at 385 ms; at 2,000 WebKit took 760 ms to its first frame. Only eight
columns were probed. The card states the threshold in cells, 8,000, on the assumption that
the cost grows with cells, and the component's own measurement checks that assumption with
a wider table before the card promises it. These are the platform's numbers; the component measures its
own when it is built, Angular's cost on top, and the card states the smaller.
`content-visibility: auto` on a row is no road: CSS Containment Level 2 gives size
containment no effect on a table's internal boxes, and 10,000 rows drew their first frame
slower with it in every engine.

**With `virtual`, the skipped rows are the body's `::before` and `::after`.** Each is
`display: table-row` with a height from a custom property the component writes on the
`<tbody>`. They are not elements: `@for` steps around nothing, axe reports no violation and
nothing to review, Chromium's accessibility tree holds 41 rows — the header row and the 40
drawn — the sticky header stays at the top, and the row each scroll position names sits
within half a pixel of where the sum puts it. Firefox's and WebKit's trees are read by the readers' walk
the table owes. Where a grouped table carries the space — on the first drawn body's
`::before` and the last one's `::after` — is unmeasured here, and the phase that joins the
groups and the window measures it.

**A window's columns have fixed widths, and its text wraps.** `table-layout: fixed`, with the
widths of the first drawn frame written on `<col>` unless a column states its own. Under the
automatic layout a column moved by 174.4 to 174.6 px between two windows of one list whose
text widens further down; with fixed widths it moved by none. Those rows cut their text with
an ellipsis. In the window a text longer than its column wraps instead, since every line's
height is measured anyway, so nothing is hidden from a reader or a keyboard; a column cut
with an ellipsis is the consumer's choice. Wrapped rows under fixed widths are unmeasured
here, and the phase that builds the window measures them.

**Heights are measured per line.** Each drawn line's height is read and kept, compared with a
tolerance of 1/64 px as the select's is ([`lesson-111`](../lessons.md#lesson-111)); a line
not yet drawn counts at an estimate taken from the first line drawn (the probe used a fixed
36 px); the space above the
window is the prefix sum. When a line above the row the user is reading has another height
than the one counted — first drawn, or changed after — the window moves `scrollTop` by the
difference. Without that, every details row scrolled into pushed the rows on screen by 101 to
104 px, and a drawn row that grew pushed them by 77 px; with it nothing moved by more than a
pixel, and five renders with no scroll in between moved nothing past half a pixel. The frame
of a window writes `overflow-anchor: none`: under a sticky header the engines' own anchoring
corrected none of the jump, and beside the window's correction it added up to 1.6 px more.
This is the different mechanism 0038 named, recorded here, and the select's window keeps its
one measured height.

**Above the engines' ceiling, the space is scaled.** Firefox keeps a block at least
17,895,530 px tall and collapses one of 18,000,000 to nothing, while a table there is clamped
at 17,895,698 px; Chromium and WebKit clamp at 33,554,428 px. A million rows of 36 px cannot
be laid out as they are. The window keeps its space under 16,000,000 px, which leaves the
header, the footer and the error of the estimates room under Firefox's ceiling. Past that it
scales: the space is 16,000,000 px and `scrollTop` maps to the first line in proportion. At
36 px a line, that begins near 444,000 lines. The scaled mode is designed here and not yet
measured: the phase that takes the window to a million rows measures where its rows land
near the ceiling and what the keys and the wheel do there.

**A window says how many rows there are.** A windowed table carries `aria-rowcount` on the
`<table>` and `aria-rowindex` on every row it draws, header and footer rows too. Chromium's
tree makes a row of every `<tr>`, so the count is of lines — data rows, details rows and
group headings alike; what the three readers say is the readers' walk's to show. With `h` header rows and `f` footer rows, the line `i`, counted from 0, of a window
starting at line `offset` is `1 + h + offset + i`, and the count is `h + lines + f`. axe
reported no violation on such a table without `role="grid"`. A remote source that does not
know its total writes `aria-rowcount="-1"`, which no probe has read yet. A table with no
window writes neither.

## Consequences

- The card states the 8,000 cells, the 16,000,000 px and the cost of fixed widths.
- The window has one more input than the select's, the estimate of a line, and it is not an
  input the consumer writes: like 0038's height it is read from the first line drawn.
- The scaled mode and the grouped bodies each arrive with a probe of their own in the phase
  that builds them.

## What this costs us

- **Fixed widths in a window.** A column sized by the first frame does not grow for a longer
  text further down; its text wraps instead. Accepted: the alternative is columns that jump
  while the user reads, and a column can state its width or, with the layout feature, be
  widened.
- **A scaled scroll moves faster than the wheel.** At a million rows, 16 px of scroll moves
  one 36 px row, 2.25 times the wheel's step. Accepted: it is the only way under the engines'
  ceiling, and below 444,000 lines a pixel of scroll is a pixel of rows.
- **The probes scrolled by writing `scrollTop`.** A touch fling and its momentum were not
  measured: no headless engine flings. Accepted for this record: the correction writes only when a measured line differs, and the phase that builds
  the window measures a fling on a touch device.
- **The probes ran headless on a shared desk.** Accepted: the timings rank the engines and
  the sizes, and the component's own measurement sets the card's number.

## Alternatives considered

| alternative                                     | why rejected                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Two `<tr aria-hidden="true">` as spacers        | elements in the body that `@for` must step around, where the pseudo-elements are none                           |
| `transform: translateY` on the body and a sizer | the sticky header leaves with the table's box: 448,392 px off the top at a quarter of the list                  |
| `content-visibility: auto` on every row         | no containment on table rows, and a slower first frame in all three engines at 10,000 rows                      |
| The automatic table layout in a window          | a column moved by 174.4 to 174.6 px between two windows                                                         |
| The engines' scroll anchoring for heights       | under a sticky header it moved the scroll by 0 px at every details row, and beside the correction it added more |
| A window always on                              | find-in-page lost, and every short table pays fixed widths and estimated heights                                |

## What would overturn it

The component's own measurement putting the threshold well under 8,000 cells, so that the
window is no longer the exception. An engine that applies containment to table rows, so
`content-visibility` skips their layout: the bare table would then hold far more and the
threshold would be measured again. Or a ceiling that moves: the 16,000,000 px follows
Firefox's.

## Measurement

All readings: headless, viewport 1280 × 800, `en-US`, the table in a scrolling frame of
1000 × 600 px with a sticky header, rows of eight cells built with `createElement`. A time
runs from the change to the second animation frame after it, so two frames, about 33 ms, is
the floor. One run at a time through `scripts/heavy`, on a desk other sessions share.

**P1 — the bare table** (first frame / every row reordered, ms):

| rows   | chromium 153 |   firefox 155 |   webkit 26.6 |
| ------ | -----------: | ------------: | ------------: |
| 500    |    115 / 133 |     153 / 151 |     312 / 177 |
| 1,000  |    228 / 183 |     287 / 249 |     385 / 338 |
| 2,000  |    549 / 317 |     526 / 484 |     760 / 676 |
| 5,000  |    956 / 750 |   1245 / 1132 |   1915 / 1738 |
| 10,000 |  1875 / 1483 |   2421 / 2351 |   3718 / 3588 |
| 50,000 |  9527 / 8000 | 11827 / 10817 | 18770 / 19274 |

The median of ten steps of 5,000 px of scroll stayed at the two-frame floor up to 5,000 rows
in every engine, the slowest step at 49 ms; at 500 and 1,000 rows most steps reached the end
of the table. At 50,000 the median took 170 ms in Chromium, 101 ms in Firefox and stayed at
the floor in WebKit.
`window.find`, the scripted find and not the browser's find bar, found row 9,000 in every
engine at every size that has it. With `content-visibility: auto` on every row, 10,000 rows
drew their first frame in 2302, 2936 and 5650 ms against 1875, 2421 and 3718 without it;
Firefox's reorder and Chromium's scroll were a little faster with it.

**P2 — the space of 50,000 rows, 40 drawn**, at five scroll positions:

| candidate                 | sticky header  | row off its sum | axe, to review      | column drift, auto / fixed |
| ------------------------- | -------------- | --------------- | ------------------- | -------------------------- |
| `tbody::before`/`::after` | holds          | ≤ 0.5 px        | nothing             | 174.4–174.6 / 0 px         |
| `<tr aria-hidden>`        | holds          | ≤ 0.13 px       | `th-has-data-cells` | 174.4–174.6 / 0 px         |
| `<tr aria-hidden><td>`    | holds          | ≤ 0.5 px        | `th-has-data-cells` | 174.4–174.6 / 0 px         |
| `transform` and a sizer   | 448,392 px off | ≤ 0.01 px       | nothing             | 174.4–174.6 / 0 px         |

No candidate had a violation. The drift is the widest column moving between windows of a
list whose text widens downwards, 174.37 px in Firefox and 174.57 px in the other two.
Chromium's accessibility tree held 41 rows for every candidate: the header row and the 40
drawn. The row offset is read for one row at each of the five positions. Moving the window by
its own length took the two-frame floor in Chromium and Firefox and 48 to 65 ms in WebKit.

**P3 — a details row taller than its estimate**, every twentieth row, after a jump to the
middle and thirty steps of 200 px up; rows of whole pixels, then rows of `line-height: 1.4`
with a details box of 120.3 px; and once settled, a drawn row above the reading point grown
by 77 px:

| correction    | `overflow-anchor` | largest move, whole / fractional rows | the row grown by 77 px |
| ------------- | ----------------- | ------------------------------------- | ---------------------- |
| none          | `none` or `auto`  | 101 / 103.8–104.3 px                  | 77 px                  |
| by the window | `none`            | ≤ 0.5 / ≤ 0.97 px                     | 0 px                   |
| by the window | `auto`            | ≤ 1 / ≤ 2 px                          | 0 px                   |

The same shape in all three engines. Without the correction the engines' anchoring moved the
scroll by 0 px in every step. With it, five renders with no scroll moved the scroll by 0.5 px
in total on fractional rows in Chromium and Firefox, and by none in WebKit.

**P4 — axe on the structures 0097 promises**, every WCAG 2.x A and AA rule, best practice and
experimental, the same in three engines:

| structure                                                           | violations | to review           |
| ------------------------------------------------------------------- | ---------- | ------------------- |
| S1 a `<tbody>` per group, `<th scope="rowgroup" colspan>` heading   | none       | `th-has-data-cells` |
| S2 a details row, `<td colspan>` holding a `<dl>`                   | none       | none                |
| S3 the empty table, its sentence in the frame with `role="status"`  | none       | `th-has-data-cells` |
| S4 `aria-rowcount` and `aria-rowindex` without `role="grid"`        | none       | none                |
| S4b the same with `role="grid"`                                     | none       | none                |
| S5 spacer rows with `aria-hidden` between rows with `aria-rowindex` | none       | `th-has-data-cells` |

What is left to review is axe asking whether a header that spans every column, or a header of
an empty table, has cells; it does not decide either way. Chromium reads the group heading as
a `rowheader` named by its text, and the details row as a `row` holding one `cell`.

**P5 — the tallest scroller:**

| engine       | a block                                            | a table holding a row    |
| ------------ | -------------------------------------------------- | ------------------------ |
| chromium 153 | clamped at 33,554,428 px                           | clamped at 33,554,432 px |
| firefox 155  | kept at least to 17,895,530 px, gone at 18,000,000 | clamped at 17,895,698 px |
| webkit 26.6  | clamped at 33,554,428 px                           | clamped at 33,554,432 px |

Chromium's and WebKit's ceiling is 2²⁵ px, a 32-bit count of sixty-fourths of a pixel;
Firefox's is 2³⁰ sixtieths of a pixel, 17,895,697 px. Under the ceiling every engine scrolled
to the middle exactly and to the end within 2 px, Firefox 1 px short of it.
