# 0118 — A row's menu is the application's menu, opened from the row, and a print draws every line

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/table/src/row-menu.spec.ts` — the column, the button's name
and state, the opening by the button, the secondary button and the keys, the browser's menu
kept for a field and a link, the focus after a removed row, the cells of every row, the
column stuck to the end; `data-table-window.spec.ts` — a print's lines, its limit and its
sentence; `menu.spec.ts` — a control registered while the menu is open; the sandbox demo
`demo-row-menu` walked by `apps/sandbox-e2e/src/datatable.spec.ts` and audited by
`a11y.spec.ts`

## Context

Phase 15 of 0097 gives a row a menu of actions, a table a bar of what it holds, and a
windowed table a print. Each had a question. Whose menu a row opens, and how one menu serves
every row when a `pct-menu` hangs off one control; what a bar of counts needs from the table;
and what a window, which draws the forty lines a frame shows, puts on paper.

## Decision

**The menu is the application's, and the table says which row it is for.**
`pctTableRowMenu` takes the application's `pct-menu`, written where it writes any menu with
its own items, and draws a trailing column with a button per row, named by the column's word
and the row's first text, `aria-haspopup="menu"`, `aria-expanded` while the menu is open for
that row. The menu opens from the row it is asked on: the button, a press of the secondary
button on the row, the context menu key and `Shift+F10` in it. Each opening hangs the menu off
that row's button — the one before is given back — so focus returns there, and the panel is
named by it. `id()` says the row, which the items read. A field and a link keep the browser's
own menu, and a table inside a cell answers its own rows first. A command that removes the
row hands the focus to the button now where the row stood. The column sticks after the
columns pinned to the end, as the leading cells stick before those pinned to the start, and
scrolls with the rest when none is.

**A status bar is a recipe, not a part.** The table already says what a bar shows:
`matchedRows()` against `rows`, the selection's `value()`, `pctAggregate` over what is
picked. A bar is the application's line of text under the table, in the card.

**A print draws every line, to a limit.** `pctTableWindow` draws them all at the browser's
`beforeprint` and renders at once, since the page is laid out for paper right after the event,
and draws the window again at `afterprint`. Past `printLimit` lines, five thousand by
default, the print stops there and says so under the table, on paper only. The sheet's print
takes the frame's height and scroll away, unsticks every cell and keeps a row on one page;
the handles and the menu's buttons keep their places, unpainted.

## Alternatives considered

- **A menu of the table's own, the items given as a template.** A `pct-menu` finds its items
  by a content query, which does not reach a template drawn elsewhere, nor would the items'
  injection find the menu; and the application would write its items in a second syntax.
- **One `pct-menu` per row.** A panel and its listeners per row drawn, for one open at a time.
- **The menu at the pointer for the secondary button.** The menu is positioned by its
  control; one origin keeps focus, the panel's name and its place one fact.
- **A status bar part.** What it would show is the application's to choose and word, and
  every count it needs is a signal of the table's already.
- **Printing what the window drew.** Paper has no scroll: forty rows and a blank would be a
  wrong page, not a short one.

## Consequences

- `pct-menu` follows a control registered while it is open: the panel is placed by the new
  control, and a press on the one before is outside.
- `contextmenu` on a row of a table with a menu is the table's, outside fields and links.
- A print of a long windowed table renders up to `printLimit` lines synchronously.
- Two new strings, `tableRowActions` and `tablePrintLimit`.
