# 0115 — Pinned rows stand outside the lines, and a move of a row is the application's

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/table/src/pinned-rows.spec.ts` — the bodies, the reader's
numbers, the leading cells, the sticky offsets, the grid; `row-order.spec.ts` — the handle,
the keys, the drag, the announcement, the refusal, the slide; the sandbox demo
`demo-row-order` walked by `apps/sandbox-e2e/src/datatable.spec.ts` and audited by `a11y.spec.ts`

## Context

Phase 14 of 0097 pins rows above and below the rows, lets the user put the rows in an order,
and slides the rows to their places. Each had a question. Where a pinned row stands in the
table that counts its lines for a window (0098), a grid (0107) and a reader; who moves a row
when the user asks, in a table whose rows are the application's list; and how a row moves on
the screen when the DOM moves it in one step.

## Decision

**A pinned row is drawn, not counted.** `pctTablePinnedRows` draws `pinnedTop` and
`pinnedBottom` in bodies of their own, before and after the bodies of the data, with the rows'
columns and slots and through the same writer, so a slot, a tone or a check mark draws in a
pinned row as in any. A pinned row is no line: it has no index, the window's spacers stand on
the first and the last body of the data, the grid paints it not at all, and what reads the
lines off the bodies passes a pinned body over. It is outside the sort, the filter, the
matches and the exports. A reader counts it where it stands: `aria-rowindex` runs in the
DOM's order, the rows pinned above after the header, the rows pinned below after the body's,
and `aria-rowcount` holds them. While the header sticks, a row pinned above sticks under it
and the rows pinned above it, a row pinned below at the frame's end, above the rows pinned
under it — each at the offset the table measures from the heights, since a stuck row stands
where it sticks — and the frame keeps both covers clear of a row scrolled to.

**A move is said, not made.** `pctTableRowOrder` puts a handle in a leading column, before the
checkbox's, and says a move in `(reorder)` as the row's id and the id of the row it goes in
front of, `null` for the end. The table moves nothing: the application moves the row in
`rows`, where the order is kept — in the handler, before the next render — and the table
draws the rows as they are given. Once the row
stands at its new place, the handle has the focus again — `@for` moved the row's element,
which let the focus go — and a reader hears the row's number among the rows; a move the
application did not make says nothing. The keys are `Alt+↑` and `Alt+↓` on the handle, which
a grid under the table does not see; a drag is the pointer's, captured, the place under it
marked before the row or after it by its halves, `Escape` lets go. Under a sort the order is
the sort's, in a tree and in groups a place is not a place in the list: the handles stay
disabled, said once in development.

**A slide is a transform on the row.** `animateRows` measures each row drawn at each render,
from the table's top, and a row that stood elsewhere slides from there by a transform that
ends at none, for twice the transition token with its easing; a slide under way is cut short
before the next is measured. A `<tr>` is a transformable element in the three engines, and a
transform leaves the window's measures alone, which read the rows' border boxes.

## Alternatives considered

- **`pinnedTop` and `pinnedBottom` as inputs of the table.** Two inputs are cheap, but every
  feature since the selection is a directive the table makes room for (0097), so a table that
  pins nothing carries no input for it.
- **Pinned rows in `<thead>` and `<tfoot>`.** Rows of data in the header's section are
  headers to a reader; a sum under the rows is `tfoot`'s already, the foot of totals, which
  the application does not write.
- **The table moving the row.** It would have to write `rows`, which is the application's
  list and often a store's; the selection (0097) and the layout (D9) are said to the
  application the same way.
- **A placeholder row under the drag**, drawn where the row would land. A row of the table's
  own among the application's rows, with a line the window and the grid would have to pass
  over; a mark on the row under the pointer says the same.
- **A FLIP by a class and a transition.** Needs a forced layout between the write of the
  start and the write of the end on every row; the Web Animations API takes both frames at
  once.

## Consequences

- The table's `aria-rowindex` and `aria-rowcount` count the pinned rows; a page's rows start
  after the rows pinned above.
- A pinned row's checkbox picks it by its id, which the application keeps apart from the
  rows'.
- `animateRows` costs a measurement of each row drawn per render: a windowed table that asks
  for it measures on every scroll.
- Two new strings, `tableMoveRow` and `tableMovedTo`.
