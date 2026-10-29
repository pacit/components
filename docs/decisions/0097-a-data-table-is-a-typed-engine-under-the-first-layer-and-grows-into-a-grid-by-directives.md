# 0097 — A data table is a typed engine under the first layer, and it grows into a grid by directives

**Status:** accepted
**Implements:** [`req-api-generic`](../requirements/api.md#req-api-generic),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** axe in three engines over each structure this record promises, before any of
them is built — a body per group headed by `<th scope="rowgroup">`, a details row, the empty
state beside the table, row indices without a grid — none with a violation
([0098](0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md), P4); a
type probe on TypeScript 6.0.3 in which an unknown column id, a number kind on a string
column, a misspelt key and a template reading the wrong value type are each a compile error

## Context

[0096](0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) drew two layers by who
writes the rows, and a third thing, a data grid with an entrypoint of its own, for later. The
first consumer's panel then asked for more than the second layer was drawn for: a thousand
registers today and a million rows of history tomorrow, the server's page and the server's
blocks as the user scrolls, columns the user hides, moves and widens and gets back on the
next visit, a selection a form can require, groups, a details row and a tree. Every one of
those is what the data grids people know already do, mostly in JavaScript first and with
types bolted on.

A third entrypoint would have to build the same engine again, or import the second layer's,
and its consumer would choose between two tables that differ in what they can grow into.

## Decision

**One data table, `pct-data-table` in `./table`, and the grid is what it becomes.** Each
feature past the base is a directive on the same element, imported by the consumer who wants
it: `pctTableGroups`, `pctTableSelection`, `pctTableLayout`, `pctTableGrid`,
`pctTableEditing` and the rest. A feature not imported is not in the bundle. The third-thing
clause of 0096 is superseded.

**Columns are typed records, and a cell is a template keyed by the column's id.** A list built
with `pctColumnsOf<Device>()` carries every id and the type of every value, so the table knows
that `energy` is a `number` and that `enrgy` is not a column. A cell template names its column
with `pctCellOf`, and its context carries that column's value type through
`ngTemplateContextGuard`. A renderer is a template, never a component class: the template
holds any component the consumer writes, keeps the consumer's encapsulation
([`lesson-96`](../lessons.md#lesson-96)), and is checked by the consumer's compiler. Headers,
filters, editors, groups, details and the empty state are templates the same way.

**The engine is pure, and the component composes it.** Ordering, the quick filter, the lines
(rows, details, group headers, holes), the window, the blocks of a remote source, groups,
aggregates and the exports are functions of data in `table/src/model/`, with no DOM and no
Angular, tested as functions. The component composes them in `computed`s. A feature directive
reaches the table through one internal method, `contribute()`, whose fields are a closed list:
lines, leading and trailing columns, attributes on the table, a row and a cell, and keys.

**The element is a `<table>`, always.** A grid is `role="grid"` on that `<table>`, written by
`pctTableGrid` with the roving cell, the arrows and Enter into a cell's control; editing
injects the grid and fails by name without it. A grid of `div`s with ARIA roles was rejected:
it buys free positioning, which only a window over columns needs, and pays with column
alignment computed by hand, `caption`, `scope` and `colspan` written as attributes, the
readers' table commands on a structure that pretends, copying into a sheet, print, RTL,
forced colours and the first layer's density, all again in a second system of paint.

**State is models and signals the application owns.** `sort` (a list from the first day, so
a second key is not a breaking change), `filter`, the opened `details`, `collapsed` groups,
`expanded` tree rows, the selection as the `value` of a signal-forms control (so a form can
require one row and the table shows the error and the warning of
[0087](0087-a-warning-is-a-verdict-without-a-veto.md)), and the column `layout` — widths,
order, hidden and pinned — as one plain object to save and restore. The table reads back
what it shows (`matched`, `lines`, `visible`, `scrolled`) and moves on request (`scrollTo`,
`reveal`).

**The data comes by one of three roads.** The whole list, sorted and filtered in the client
by default; the same list with `clientSort` and `clientFilter` off, the models handed to the
server and a page recipe on the pager of
[0048](0048-a-pagination-owns-its-page-number.md); or `PctTableRemote`, which loads blocks as
the window reaches them, cancels what scrolled away and draws a hole until a block arrives.

## Consequences

- The cards and the docs show one table with sections per feature, not two components.
- Every feature records its own decision when it is built, and this one only names its
  shape, so a phase cannot change another's model by accident.
- The words for what opens are three and stay three: `details` for a row's details,
  `collapsed` for a group, `expanded` for a branch of the tree.

## What this costs us

- **A wide API on one element.** A consumer reads about directives they do not import.
  Accepted: the card groups them by feature, and each is one import.
- **The typed list must be built by the helper.** A literal array of objects loses the ids'
  types. Accepted: the helper is one call, and a literal still compiles as an untyped table.
- **No window over columns.** Positioned `div`s would have had it for free. A `<table>` gets
  it with `colgroup` when a consumer with hundreds of columns measures the need.

## Alternatives considered

| alternative                                        | why rejected                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A third entrypoint for the grid (0096's clause)    | the same engine built twice, and a consumer choosing between tables by what they might grow into               |
| A grid of `div`s with ARIA roles                   | every reason the platform's table exists, rebuilt by hand, for a window over columns no consumer has asked for |
| Renderers as component classes                     | an inputs contract the compiler cannot check against the column, and the consumer's encapsulation lost         |
| Columns as untyped configuration objects           | a misspelt id or a wrong value type is found by the user, not by the compiler                                  |
| A sort of one key, widened later                   | the model's type changes, which breaks every consumer that bound it                                            |
| Every feature in the component, switched by inputs | every consumer pays the bytes of features they never turn on                                                   |

## What would overturn it

A consumer whose columns are counted in hundreds and whose rows are wide enough that a
`colgroup` window cannot keep the columns aligned in three engines. A grid of positioned
cells would then be a different component, and this record would say where the line between
the two runs.
