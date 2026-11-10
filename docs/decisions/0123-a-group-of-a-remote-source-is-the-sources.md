# 0123 — A group of a remote source is the source's

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/table/src/data-table-remote-groups.spec.ts`; `model/lines.spec.ts`
— a group a source made, its members and a hole among them; the sandbox demo
`demo-remote-groups` walked by `apps/sandbox-e2e/src/datatable.spec.ts`

## Context

`pctTableGroups` grouped the rows the table holds: a group's count was the count of its rows
and its sums were summed from them ([0097](0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md), D8).
On `pctTableRemote` it grouped nothing and said so in development, because the table holds
only the blocks that came. A group whose rows have not been sent cannot be counted or summed
here, and grouping the rows that came would split one group across every block. [0122](0122-a-branch-of-a-remote-source-is-a-list-of-its-own.md)
made a branch's children a list of their own and left the groups to a decision of their own.
A ledger of a million readings grouped by meter and month needs a server that answers each
group as it opens, with the count and the sums the server holds. That is what ag-grid's
server-side row model does with `rowGroupCols` and `groupKeys`.

## Decision

**The source makes the groups, a level at a time.** With `pctTableGroups` on a remote table,
each request carries `groupBy`, the table's `groupedBy`, and `group`, the values of the group
asked into. While `group` is shorter than `groupBy`, the source answers with `groups`: one
level deeper, each with its `value`, its `count` of rows and its `sums` by column id. At the
last level it answers with the group's `rows`, as it always did. An answer of the other kind,
or a count that is no count of rows, fails its block like a load that threw.

**An open group's members are a list of their own,** the same list 0122 gave a branch. The
list has its own blocks, count, holes, failures and requests, and is asked for when its hole
is drawn. Nothing else is a second mechanism: the window, the retry, `refresh()` and the
abort of a block the view left act on it unchanged. A hole line carries `group`, the key of
the group it stands in, beside `parent`.

**The table writes, the source counts.** A group's heading is written by its column's
writer from the source's `value`, and a group of no value takes the same words as a local
one. Its count and sums are the source's, and a column the source gives no sum for is
written as nothing. A group's key is `pctGroupKey` of its values, so `collapsed` holds the
same keys whether the rows are grouped here or on the server.

**A new grouping is a new question.** A change of `groupBy` lets every list go, as a new
order does. Until the new answers come, the lists keep the grouping they were asked under,
so a list of groups is never read as a list of rows.

## Consequences

- `PctTableRequest` gains `groupBy` and `group`, and `PctTableLoad` may answer with
  `PctTableGroupsAnswer`. A source written before this receives an empty `groupBy` while no
  groups are asked for, and its answers stay valid. Grouping such a source now fails its
  first block with an error naming `groups`, where it used to warn and group nothing.
- `PctDataTable` gains `groupedBy`, and `pctLines` gains `sourced`.
- A group opens as it comes. `collapseAll` collapses the groups that came. One that comes
  later is open, because `collapsed` names keys and a key not yet sent cannot be named.
- `matched` counts the rows the groups at the top hold, and the foot sums nothing: the
  source's sums are per group.
- A tree under the groups works: a row's branch is asked for under its group's values, as
  its children stand in its group.
