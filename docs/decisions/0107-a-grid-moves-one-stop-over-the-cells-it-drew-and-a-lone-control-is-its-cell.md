# 0107 — A grid moves one stop over the cells it drew, and a lone control is its cell

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** the sandbox demo `demo-grid` walked by `apps/sandbox-e2e/src/datatable.spec.ts`
in three engines; `libs/components/table/src/data-table-grid.spec.ts`,
`model/grid.spec.ts`, and the window's cases in `data-table-window.spec.ts`

## Context

0097, D4, left `role="grid"` to a directive that would come with the keys: the data table is a
`<table>` whose controls are reached by Tab, one after another, which is right for a table of
twenty rows and wrong for one of a thousand with a checkbox, a disclosure and a switch in each
— three thousand stops before the page goes on. The APG's data grid gives the table one stop
and moves it with the arrows. What it leaves to the author is what a cell with a control in it
does, how the stop stays put while the rows under it change, and what a window does to a stop
whose row it stopped drawing.

## Decision

**One stop, moved over the cells drawn.** `pctTableGrid` writes `role="grid"` and
`aria-colcount` through the table, and moves `tabindex="0"` over the cells it drew; every
other cell is `-1`, so a click focuses it, and every control in a cell is out of the tab
order. The keys are the APG's: the arrows, turned in a right-to-left table; Home and End along
the line and, with Ctrl or ⌘, to the grid's first and last cell; Page Up and Page Down by what
the frame shows. The lines are the header's rows, every line of the table — a row, its details,
a group's heading, a hole — and the foot, so a heading's button and a row's details are reached
like any cell. A move across lines keeps the column it was asked for, so a line that spans
columns does not pull the stop to its first. The moves are a pure function over a map of the
lines and their cells' spans (`model/grid.ts`); the directive reads the map off the cells the
table drew, and off `lines()` for those it did not.

**A lone control is its cell.** A cell whose only control takes no arrow and no letter — a
button, a checkbox, a switch, a link — gives that control the stop: the arrow lands on the
checkbox and Space ticks it, with no step into the cell first. The APG allows both, and the
other choice makes every checkbox of a picking table two keys away. A cell with more controls,
or with a field, takes the stop itself; Enter or F2 steps into it and gives its controls their
own tab order back, Escape or F2 steps out. A control a pointer focused is a step into its
cell, so a field typed into keeps its arrows.

**The stop is a row's id and a column, the focus follows it.** `focused` is a model of the cell
— a row by its id, or the header; a column by its id, or one of the leading ones by a name of
the grid's (`#select`, `#details`, `#number`). It is `null` on a line of no cell of its own, a
heading or a row's details. The stop is held by its line's key, so a new array of rows, a sort,
or a filter that keeps the row keeps it; a row taken away hands it to the line that stands in
its place, and `focused` then names that line's cell, so the row coming back does not pull the
stop after it. Angular moves a row's element on a sort, and the engines drop the focus of an
element that moves, so the grid takes the focus back to the stop when the element that had it
is gone or moved and nothing else took it — and lets it go when the page, another window, or
the host's own elements outside the table did: an empty table's button, the frame.

**A window's stop waits rather than pulling the view back.** The plan wanted the stop's cell
always drawn, as a listbox's active option is. A window draws one run of lines between two
spaces with no element (0098), and a cell drawn outside the run would need a third. So when the
scroll leaves the stop's line behind, the table itself takes the focus, `tabindex="-1"`, and
the keys: the next one scrolls the line back by the window's own arithmetic, and the move goes
on from there. A reader scrolling with the wheel is not pulled back to where the stop was.

**Ranges are rectangles of data cells.** Shift with a move stretches `range` — two corners,
each a row's id and a column's — from the cell where it began; the cells in it are
`data-pct-in-range` and `aria-selected="true"`, the grid `aria-multiselectable="true"`, and a
move without Shift lets it go. A cell out of the range says nothing rather than
`aria-selected="false"`, which a reader would speak on every cell it enters. The header,
the leading cells, a heading and the details are no data, so a move onto them with Shift
leaves the range as it was.

**The table pays nothing for a grid it is not.** The structure the table draws grows by one
binding — each header's column named while the grid is on. The role, the count, and what a
cell does under the keys — its `tabindex`, `aria-colindex` while a column is hidden,
`aria-selected` on a row a pick can pick and on a cell in the range — the directive writes on
the table drawn after each render, comparing first, so a table without the directive carries
none of it. And a render elsewhere on the page costs a grid nothing: a `MutationObserver` on the
table says whether it drew anything since the last paint, and with no record and none of the
grid's own state moved the paint returns at once. A control whose tab index is not the one the
grid wrote last was written by its template since — a widget in a cell that moved its own
stop — so the grid takes it out of the order again, and gives it back in a cell stepped into
as the template now says. A template that writes the very value the grid wrote is not told
apart: stepped into, that control gets back the index it had before. The lines are read by index, their keys built once for each list of lines,
so a window of a hundred thousand lines paints the ones it drew. The frame, which takes the focus while it scrolls, does not when its table is a
grid: the cells take it, and a frame before them would be a second stop for nothing. It is
`tabindex="-1"` then, not without one, because Firefox puts a scrolling element of no tab
index in the order by itself.

## Consequences

- Every control in a grid's cell loses its own tab stop while the grid is on; an application
  that puts a control in a cell gets it back only by stepping into the cell. The tab index a
  control had is kept by element and given back as it was.
- A cell with one field, a slider or a radio group is a cell to step into: their keys are
  theirs. A cell's lone control is detected as the DOM stands after each render, so a
  template that adds a second control turns the cell into one to step into.
- With `pctTableSelection`, Ctrl+A or ⌘+A picks every row the filter left, and every row says
  `aria-selected`; a row of a table that picks nothing says nothing. A selection `disabled` or
  `readonly` leaves Ctrl+A to the browser.
- In a cell stepped into, Escape on a control whose popup is open, `aria-expanded="true"`, is
  the control's: the popup closes, and the next Escape leaves the cell.
- While a column is hidden, a cell's `aria-colindex` is its column's place among all of them in
  the table's order (`columnOrder`), the hidden ones counted where they stand.
- Under a window, Ctrl+End and Page Down reach lines the window has not drawn by the row the
  table scrolls to; a group's heading or a hole is reached by the row next to it. A page is
  as many lines as the frame holds at a drawn row's height. Under `pctTableRemote`, a run of
  rows not loaded yet is holes, so a move into it is reached by the loaded row next to it.
- The role comes with the keys: a server's rendering is a table, and the role, the count, the
  stop, the column indices and the range come with the first render in the browser. A
  `role="grid"` before the keys would promise a reader moves the table cannot make yet, and a
  role an expression decides is one `check-aria` cannot judge on an element the name is handed
  to.
