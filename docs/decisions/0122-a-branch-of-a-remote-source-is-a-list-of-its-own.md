# 0122 — A branch of a remote source is a list of its own

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/table/src/data-table-remote-tree.spec.ts`; `model/lines.spec.ts`
and `model/tree.spec.ts` — a hole among a branch's children, its place and its level; the
sandbox demo `demo-remote-tree` walked by `apps/sandbox-e2e/src/datatable.spec.ts`

## Context

`pctTableRemote` loaded one list a block at a time: the source's rows, in its order, under
its question ([0097](0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
A tree on such a table could only be the tree inside the rows that came: `children` read
each delivered row's children off the row itself, so the source had to send every
descendant with its root. A building's floors, rooms and devices fit that. An archive of
folders, or an account's ledger with a branch per year, does not: the children are the
server's, a branch may hold more of them than a page, and most branches are never opened.
A grid that grew out of a table was missing a server that answers one branch at a time. That
is what ag-grid's server-side row model is for.

## Decision

**A branch's children are a list like the roots.** With `pctTableTree` and the remote's
`hasChildren`, the roots come first. A branch opens as one hole, and its first block is
asked for under `request.parent` (its id) and `request.path` (the ids above it, its own
last). From then on the branch's children have their own blocks, count, failures and
requests in flight, and are read exactly as the roots are. Nothing is a second mechanism:
`refresh()`, `invalidate()`, the retry of a failed block, the abort of a block the view left
and the slack of half a block around the view all act on every list.

**A hole says which list it stands in.** A hole line carries its `parent`, its place `at` in
that list and its `level`. Those three are what the source is asked for to fill it, and what
a treegrid reads its `aria-level` from. A row's place is written once, when its block
comes, so the window asks for the blocks of the lines it draws without walking a list.

**The tree reads holes as siblings.** `pctTree` keeps a hole where it stands, judges and
orders nothing around it (a source filtered and sorted its own rows), and counts it among
the siblings. `aria-setsize` is then the source's count, not the count that came.

**A question changes every list.** A new order, filter, column filter, block size or
source lets every branch's list go with the roots' blocks. `expanded` is the application's,
so the open branches stay open and are asked again when their rows come back. A closed
branch keeps the rows that came, as a block the view left keeps its rows; a block still
coming when its branch closes is aborted.

## Consequences

- The tree directive's `children` is optional: a tree the source holds needs none, and the
  rows that came are read for children only without `hasChildren`.
- `PctTableRequest` gains `parent` and `path`, and a hole line gains `parent`, `at` and
  `level`. A source written before this receives `parent: null` for every request and can
  ignore both.
- The groups are still the source's to make. A group heading is the table's own line, not a
  row, and asking a source for groups is a contract of its own, left to its own decision.
- A branch's checkbox picks the rows below it that came; the rows not sent yet are not
  picked. A cascading selection works over the rows the table holds, as `selectAll` picks
  only the rows a remote source sent.
