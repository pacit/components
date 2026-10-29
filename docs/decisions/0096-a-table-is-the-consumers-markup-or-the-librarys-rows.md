# 0096 — A table is the consumer's markup or the library's rows, and the first is dressed element by element

**Status:** accepted — the third-thing clause (a data grid with an entrypoint of its own) superseded by 0097
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)
**Evidence:** [`lesson-96`](../lessons.md#lesson-96) (projected content keeps the declaring
template's encapsulation); `libs/components/table/src/table.spec.ts`;
`apps/sandbox-e2e/src/table.spec.ts` (the accessibility tree, the keyboard and the frame in
three engines); the axe audit of `/table`

## Context

The first consumer asks for two kinds of table in one application. A panel lists about a
thousand registers with sorting, a filter, groups, a details row and a narrow layout. A card
shows four rows and two columns. One component for both is either a data grid the four rows
must feed an array to, or a set of attributes the thousand rows must sort, filter and window
by hand. Either way one of the two pays for the other.

## Decision

**Two layers, drawn by who writes the rows.**

- `table[pctTable]` and its parts dress a `<table>` the consumer writes. It is the whole
  cost of a table of four rows: attributes, a stylesheet, no model it must feed.
- `pct-data-table` builds the rows from data and renders the first layer, so the two look
  the same and share one tier of tokens in one entrypoint. It is the plan's next step.
- A data grid, with `role="grid"`, cells the arrow keys walk and editing in place, is a third
  thing with an entrypoint of its own, later.

**The first layer is dressed element by element.** The rows stand in the consumer's
template, and projected content keeps that template's encapsulation, so a stylesheet on the
table cannot reach a cell ([`lesson-96`](../lessons.md#lesson-96)). A directive carries no
styles and the styling API does not stand on `::ng-deep`
([0054](0054-a-breadcrumb-is-the-way-here-told-in-links.md)'s reason for
`a[pctCrumbLink]`). So each element the paint needs is a component on that element:
`table[pctTable]`, `caption[pctCaption]`, `th[pctHeader]`, `td[pctCell]`, and
`pct-table-frame` around them. A row is not dressed: nothing in this layer needs to paint one,
so the line under a row is drawn by its cells, and a sixth class would cost every row an
attribute for nothing.

**The table holds the sort, and the consumer orders the rows.** One `sort` model on the
table names a key and a direction. A header with a `sortKey` is a button that proposes the
next order: a column not yet sorted starts ascending, the sorted one turns the other way, as
the APG's sortable table toggles it. `aria-sort` stands on the sorted column's header and on
no other. Ordering the rows is the consumer's, who owns them, as the pager emits a page and
the application turns it ([0048](0048-a-pagination-owns-its-page-number.md)).

**The frame is a region only while its table overflows.** A table wider than its space
scrolls in `pct-table-frame`. While it overflows, the frame is `role="region"` with a tab
stop of its own and the caption's id as its name, because a scrolling box nobody can focus
fails 2.1.1, the axe rule [0038](0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)
met in the select. While the table fits, the frame writes none of the three, because a stop
with nothing to scroll is a stop for nothing. The overflow is measured by a
`ResizeObserver` on the frame and on the table, so it is `false` under SSR and until layout.

## Consequences

- A consumer writes an attribute on every cell, as `mat-cell` asks in Angular Material. A
  cell without it keeps the browser's look, which is visible at once rather than wrong.
- The parts are two, `toggle` and `icon`, both inside a sortable header. Every other element
  is the consumer's, so it is styled by its own tokens and its own markup.
- No zebra, no hover and no selected row in this layer: each would need a component on the
  row, and a selected row is a fact about data, which is the second layer's.

## What this costs us

- **Five classes for one table.** The import list is long for a small table. Accepted: each
  class is an element the consumer already writes, and the alternative was one global rule.
- **The sort is a proposal.** A consumer who binds `sort` and forgets to order the rows gets
  headers that turn and rows that do not. The data table orders its own rows; this layer
  cannot, because it never sees them as data.
- **No announcement of the new order.** `aria-sort` changes on the header the focus stands
  on, and the readers' walk says what each reader makes of it. A live region would repeat
  what the header says.

## Alternatives considered

| alternative                                        | why rejected                                                                                                                            |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| One data-driven table for every table              | four rows become an array, a column model and templates for their cells; the markup the consumer already has is the cost they pay twice |
| A global stylesheet keyed on `table.pct-table`     | the package's first global rule; today nothing the library ships can reach markup the consumer did not mark                             |
| `::ng-deep` from the table's stylesheet            | deprecated, and not the styling API this library offers anywhere else                                                                   |
| A frame that is always a focusable region          | a tab stop for every table that fits, which is most of them                                                                             |
| Cycle the sort through unsorted on the third press | the APG example toggles between the two directions; the consumer can write `null` to `sort` when the rows have an order of their own    |
