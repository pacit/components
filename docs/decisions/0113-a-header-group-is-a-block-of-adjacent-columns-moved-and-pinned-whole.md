# 0113 — A header group is a block of adjacent columns, moved and pinned whole

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/table/src/model/layout.spec.ts` — "header groups";
`header-groups.spec.ts` — the rows of groups, the leading cells, a hidden column, the pins,
the sticky offsets, the places under a page, the grid; the sandbox demo `demo-header-groups`
walked by `apps/sandbox-e2e/src/datatable.spec.ts` and audited by `a11y.spec.ts`

## Context

Phase 13 of 0097 puts a header over several columns: a `<th scope="colgroup" colspan>` in a
row above the headers' row, as HTML has always allowed. What was open is what a group is when
the user lays the columns out (0097, D9) — a column moves one place, is pinned to an edge, is
hidden — what a stored layout that split a group is read as, what two levels are, how a header
of several rows sticks, and what the grid and a reader count.

## Decision

**A group is a run of adjacent columns with the same `group`.** `column.group` names it;
`'Cost/Spent'` is two levels, a row each, the outermost first, and a blank level is passed over
(`pctGroupPath`). The header is drawn over the columns _shown_: a hidden column leaves its
group, a group with no column shown leaves no header, and the rows of groups are as many as
the deepest group among them — none when no column shown has one. Over the columns with no
group at a level stands an empty `<td>`, one per run inside the group above, so no cell
crosses a group's edge. The same name apart twice is two groups: `colspan` has no other reading.

**The block the layout moves and pins is the outermost group.** `pctMoveColumn` moves a
column's whole group past the next column or group, hidden members along; `pctPinColumn`,
given the columns, pins every column of the group; `pctPlaceColumns` reads a stored order
that split a group as one that did not — the group gathered at its first column, each level
inside the one above it — and a group's edge is its first column's, whatever the rest say. A
layout saved before the groups existed still lays the table out (0097, D9), and the invariant
holds on every read rather than on every write.

**Each row of the header sticks below the rows above it.** The table measures each row's
offset from the header's top and writes it on the row (`--_top`); the groups' rows, the
headers' row and the filters' row each stick at their own, under one rule.

**The semantics are HTML's.** `scope="colgroup"` on a group's header, which readers announce
over the cells it spans; nothing of ARIA. A reader's row count includes the rows of groups
(`aria-rowindex` from 1, the headers' row after them) and the grid's header is the headers'
row: a group's cell is a cell of the grid with no model of its own, like a cell of the row of
filters, and the arrows cross it.

**Exports keep one header row, the columns'.** A copy, a CSV and a workbook name the columns;
the groups are the view's.

## Alternatives considered

- **`rowspan` on the header of a column with no group**, so no empty cell stands over it.
  Puts the columns' headers in two rows of the DOM, which breaks every reading of "the
  headers' row" — the grid's, the sticky offsets', a test's — for a cosmetic gain.
- **A group as its own object** (`groups: [{ name, columns }]`) beside the columns. A second
  list to keep in step with the first, and a layout to repair on both; the column's field
  reads as the header above it does.
- **Moving a sub-group inside its parent** from the menu. The menu moves the outermost block
  only; an application that needs a finer move writes `layout.order` itself, and the read
  gathers each level.

## Consequences

- `pctPinColumn` takes the columns as a fourth argument; without them, as before, it pins the
  column alone — a group's edge is then its first column's on the next read.
- The chooser moves a column with its group: `Alt+↓` on a grouped column moves the block.
- A group's cell is a stop of the grid with no `focused` model: `focused` is `null` on it.
- The header's rows are as many as the groups' levels plus one, plus the filters' row:
  `aria-rowcount` counts them.
