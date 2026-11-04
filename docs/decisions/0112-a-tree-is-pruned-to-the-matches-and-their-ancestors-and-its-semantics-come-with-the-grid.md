# 0112 — A tree is pruned to the matches and their ancestors, and its semantics come with the grid

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking)
**Evidence:** `libs/components/table/src/model/tree.spec.ts`; `data-table-tree.spec.ts` — the
tree alone and as a treegrid, its keys, its level under groups; the sandbox demo `demo-tree`
walked by `apps/sandbox-e2e/src/datatable.spec.ts` in three engines

## Context

Phase 12 of 0097 is the tree of rows D12 prepared for: `pctLines` has walked children since
phase 1, a row line has carried its level and whether it is open since then, and the groups
of phase 5 are the same recursion over synthetic nodes. What was open is what the filter and
the sort do to a tree, what the table counts and exports, which semantics a tree carries when
it is a table and when it is a grid, and what the arrows do on a row that opens.

## Decision

**The filter keeps the way to a match.** A row the filter matches is kept with every row
above it — kept, not opened: the branches are the application's `expanded`, and a filter that
wrote it would undo what the user closed — a row kept for the rows below it alone is `data-pct-muted` and drawn in the muted
text, since a reader of the screen should see why a row that says nothing of `lamp` stands
in a table filtered by it. A branch with no match below it goes with its children. A row that
matches is kept with the children that match, and without the others: it is a leaf when none
do. The pruning is one pass over the tree (`pctTree`), read once per change of the rows, the
filter or the sort, and it reads each row's children once, so a `children` that builds a new
list on each call reads as one tree.

**The sort orders siblings.** Each list — the roots, and each row's children kept — is
ordered by the same keys. A child is never ordered out of its parent, since a tree's rows are
where they are because of what holds them.

**The table counts what the filter kept, open or not.** `matched`, `matchedIds` and
`matchedRows` are every row kept, depth first, whether its branch is open: a closed branch
holds rows the filter let through, and a count that fell when the user closed it would say
the filter changed. So a selection's `selectAll` picks the rows of closed branches too, and
`pctTableCsv` writes the whole tree flat, in its order. `aria-rowcount` and `lines` are the
rows drawn, as before: a closed branch's children are no lines.

**The semantics come with the grid.** `aria-level`, `aria-expanded`, `aria-posinset` and
`aria-setsize` on a `tr` are defined for a `treegrid`'s rows; on a table's row they are
nothing a reader says. So the tree alone is a table whose first cells hold a button with
`aria-expanded`, named `Expand` or `Collapse`, indented by the row's level, and with
`pctTableGrid` the grid writes `role="treegrid"` and the table writes the four attributes on
each row — the level counting the tree alone, not the groups the row stands in. The grid is
the directive that reads the tree directive, since the role is its to write.

**Two keys on the first cell.** The APG's treegrid gives the arrow into the line — Right in a
left-to-right table — to a closed branch, which it opens, and the arrow out of it to an open
branch, which it closes, and to a leaf or a closed branch, which it leaves for the parent. The
grid does that on a row's first data cell alone; on any other cell, and on an open branch
pressed into the line, the arrows move the stop as the grid's do. A first cell holds the
disclosure as its lone control, so the stop is the button and Space opens it as a button.

**A model of ids.** `expanded` is the ids of the open rows, as `details` and `collapsed`
are: a new list of rows keeps its branches open by their ids, and `reveal(id)` adds the
ids above a row before it scrolls. `expandAll` opens every branch the filter kept; a branch
dropped by the filter is none to open.

**Nothing is paid without the directive.** The tree is `contribute({ tree })`, like the
details and the groups: a table with no `pctTableTree` prunes nothing and reads no children,
and the pure `pctTree` is a function the bundler drops with the directive.

## Consequences

- A tree of a remote source is built inside the rows the source delivered, as they came: the
  source's filter and order are its own, `matched` stays the source's count of roots, and a
  root's place among its siblings counts the roots delivered so far.
- A branch row's first cell is edited from its button: F2 and a typed letter open the cell,
  Enter and Space stay the button's and open the branch.
- The four attributes of a treegrid's row are written in the browser, with the role: a
  server's table is a table to its reader.
- Under `pctTableGroups` the groups group the roots by their values, and the rows of a branch
  stand under their root's group, whatever their own values are.
- A tree under `pctTableWindow` is a list of lines like any other: the window measures the
  lines drawn, and a branch opened above the view moves what is read by the difference, as a
  taller line does.
- The tree's walk by three screen readers is not recorded yet: the card's row says so.
