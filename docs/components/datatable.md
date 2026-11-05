# `PctDataTable` — a table built from data

**Summary:** A table drawn from your rows and a typed list of columns: sorting by one key or several, a quick filter over what the cells show, and the empty and loading states, in the look of the platform table.
**Entrypoint:** `@pacit/components/table`
**Selectors:** `pct-data-table`, `pct-data-table[pctTableDetails]`, `pct-data-table[pctTableGroups]`, `pct-data-table[pctTableSelection]`, `pct-data-table[pctTableWindow]`, `pct-data-table[pctTablePage]`, `pct-data-table[pctTableRemote]`, `pct-data-table[pctTableColumns]`, `pct-data-table[pctTableGrid]`, `pct-data-table[pctTableEditing]`, `pct-table-column-chooser`, `ng-template[pctCell]`, `ng-template[pctHeaderCell]`, `ng-template[pctEmpty]`, `ng-template[pctDetails]`, `ng-template[pctEditor]`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** a native `<table>` — sorting as the APG's
[sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
draws it, with `aria-sort` on the header of the first sort key alone. With `pctTableGrid`,
the APG's [data grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/): `role="grid"` on the
same `<table>`, one tab stop moved over the cells. Named in each class's JSDoc.

**One table that grows by directives.** `pct-data-table` renders the first layer,
`table[pctTable]`, from data, so the two look the same and share one tier of tokens
([0097](../decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
Its engine is a set of pure functions — the order, the quick filter, the lines and the
window — exported beside it for an application that wants them without the component.

## Usage

```ts
const col = pctColumnsOf<Rule>();
readonly columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('energy', { header: 'Energy', kind: { number: { unit: 'kWh' } } }),
  col.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
]);
```

```html
<pct-data-table caption="Rules" [rows]="rules()" [columns]="columns" [rowId]="byId" [(filter)]="question">
  <ng-template [pctCell]="columns" pctCellOf="enabled" let-rule let-on="value">
    <pct-switch [checked]="on" (checkedChange)="toggle(rule, $event)" [ariaLabel]="'Enabled: ' + rule.name" />
  </ng-template>
</pct-data-table>
```

## Contract

|                                                                                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**                                                                                     | `sort`: a list of `PctTableSort` keyed by the columns' ids, the first deciding first; `filter`: the quick filter's question; `value` on `pctTableSelection`: the ids of the rows picked; `columnFilters` on `pctTableColumnFilters`: each column's filter by id; `layout` on `pctTableColumns` and on `pct-table-column-chooser`: the columns' order, widths, the hidden and the pinned, as JSON holds it; `focused` and `range` on `pctTableGrid`: the cell holding the tab stop, and a rectangle of data cells; `editing` on `pctTableEditing`: the cell open in an editor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Inputs**                                                                                    | `columns` and `rowId` (required), `rows` (`[]` until bound), `caption`, `ariaLabelledby`, `ariaLabel`, `unsortable`, `clientSort`, `clientFilter`, `filterWith`, `loading`, `locale`, `now`, `stickyHeader`, `striped`, `rowNumbers`, `rowTone`, `highlightMatches`, `highlightChanges`, `animateRows`; on `pctTablePinnedRows`: `pinnedTop`, `pinnedBottom`; on `pctTableRowOrder`: `disabled`; on `pctTableDetails`: `details` (a model of the open rows' ids) and `disabled`; on `pctTableGroups`: the columns (its own input), `groupBy`, `collapsed` (a model of the collapsed groups' keys) and `disabled`; on `pctTableTree`: the columns (its own input), `children` (required — a row's children), `expanded` (a model of the open rows' ids) and `disabled`; on `pctTableSelection`, the field's: `mode` (`single` or `multiple`), `cascade` (in a tree), `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `warnings`, `name`, `hint`; `pctTableWindow` takes `printLimit` (5,000 lines a print draws at most), and needs the table to have a height; on `pctTableRowMenu`: the application's `pct-menu` (required); on `pctTablePage`: `rowTotal` (required) and `rowOffset`; on `pctTableRemote`: the load (its own input, required), `blockSize` and `keepScroll`, and it needs `pctTableWindow`; on `pctTableColumnFilters`: the columns (its own input), `columnFilters` and `filterRow`; on a column, `columnFilter` and `filterBy`; on `pctTableColumns`: the columns (its own input) and `layout`; on `pct-table-column-chooser`: `columns` (required), `layout`, `ariaLabel` and `ariaLabelledby` (the name of its group); on a column, `width`, `minWidth`, `group`, `colSpan` and `component`; on `pctTableGrid`: the columns (its own input), `focused` and `range`; on `pctTableEditing`: the columns (its own input), `editable` (required — the ids of the columns, or a question asked of each row and column), `rowEdit`, `history` and `editing`, and it needs `pctTableGrid` |
| **Outputs**                                                                                   | `sortChange` and `filterChange` (the models'), `detailsChange` on `pctTableDetails`, `reorder` on `pctTableRowOrder` (a row's id and the id of the row it goes in front of); `id` on `pctTableRowMenu` (the row its menu was opened for); read-only signals `matched`, `matchedRows`, `lines`, `rowCount` (what a reader is told, pinned rows and all), `scrolled`, `visible`, `hiddenColumns`, `shownColumns` and `resolvedLocale`; the functions `pctTableCsv(table, options)` and `pctTableXlsx(table, options)`, a string and a `Blob` of the rows; methods `scrollTo(id, { align })` and `reveal(id)`; `collapsedChange`, `expandAll()` and `collapseAll()` on `pctTableGroups`; `groupKeys()` on the table; `expandedChange`, `toggle(id)`, `expandAll()` and `collapseAll()` on `pctTableTree`; `valueChange`, `touch`, `showInvalid`, `selectAll()` and `clear()` on `pctTableSelection`, and `matchedIds` and `childIds(id)` on the table; read-only signals `total`, `loading` and `error`, and methods `refresh()` and `invalidate()`, on `pctTableRemote`; the read-only signals `drawn` (the lines drawn) and `first` (the line at the view's top) on `pctTableWindow`; `columnFiltersChange` and `clear(column?)` on `pctTableColumnFilters`, and the read-only signal `columnFilters` and the method `textOf(row, column)` on the table; `layoutChange`, `fit(column?)` and `reset()` on `pctTableColumns`, and `layoutChange` on `pct-table-column-chooser`; `focusedChange` and `rangeChange` on `pctTableGrid`; `edit` (a proposal: the row's id, the row, its changes and their cause), `editingChange`, the read-only signals `canUndo` and `canRedo`, and the methods `undo()` and `redo()` on `pctTableEditing`                                                                                                                                                                                                                                                                                        |
| **Slots**                                                                                     | `ng-template[pctCell]` (a cell, by column id or a list of ids), `ng-template[pctHeaderCell]` (what stands in a header's label), `ng-template[pctEmpty]` (what stands for the empty table's sentence), `ng-template[pctDetails]` (what stands in a row's details, below the hidden columns' values), `ng-template[pctFilter]` (a column's filter of the application's own, on `pctTableColumnFilters`), `ng-template[pctEditor]` (a column's editor, on a signal of the draft, on `pctTableEditing`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Parts**                                                                                     | `message` (the sentence beside an empty table), `placeholder` (a row standing for rows still coming), `place` (the place of a sort key after the first), `mark` (a word the quick filter found), `disclosure` (the button that opens a row's details, or a tree row's children), `details` (the row of details), `group` (a group's heading), `select` (a row's checkbox or radio), `select-all` (the header's checkbox), `error`, `warning` and `hint` (the selection's line under the table), `hole` (a row a remote source has not delivered), `retry` (the button that asks for a failed block again), `filter` (a column's filter button), `options` (a column's menu button), `separator` (the handle that resizes a column), `item` (a column's row in the chooser), `editor` (a cell open in an editor), and `handle` (the button that moves a row), `actions` (the button that opens a row's menu)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Harness**                                                                                   | `PctDataTableHarness` — the parts, and `headers()`, `rows()`, `cell(row, header)`, `sortBy(header, { shift })`, `toggleSelection(row, { shift })`, `selectAll()`, `selectedRows()`; `PctTableColumnChooserHarness` — its rows by their part                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Tokens**                                                                                    | the first layer's `--pct-table-*` tier, and the data table's rows: `bg-hover`, `bg-striped`, `bg-changed`, the four tones' `bg-*` and `fg-*`, `fg-muted` (the rows' numbers), `column-max-width`, `mark-bg`, `mark-fg`, `details-bg`, `group-bg`, `group-fg`, `indent`, `bg-selected`, `fg-selected` (a picked row), `hint-fg`, `hint-fg-invalid`, `hint-fg-warning` (the selection's line), `separator-fg` (a resize handle's line), `pinned-bg` and `pinned-shadow` (a pinned column's surface and the shade at its edge), `editor-border` (the outline of a cell open in an editor)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Strings**                                                                                   | `tableEmpty`, `tableNoMatches`, `tableLoading` (the three sentences an empty table says), `tableYes`, `tableNo` (how a boolean cell is read and searched), `tableRowNumber` (the header of the rows' numbers), `tableSortLater`, `tableSortAscending`, `tableSortDescending` (a later sort key, as a reader hears it), `tableDetails`, `tableDetailsOpen`, `tableDetailsClose` (the column of disclosures and its buttons), `tableNodeOpen`, `tableNodeClose` (a tree row's button), `tableGroupCount`, `tableTotal` (a group's count, the foot's label), `tableSelectAll`, `tableSelectRow` (the header's checkbox, and the word a row's is named by), `tableLoadFailed`, `tableRetry` (what a failed block says, and its button), `tableFilter`, `tableFiltered`, `tableClear`, `tableFrom`, `tableTo` (a column's filter button, its panel and the ends of a range), `tableColumnMenu`, `tableResize`, `tableMoveStart`, `tableMoveEnd`, `tablePinStart`, `tablePinEnd`, `tableUnpin`, `tableFit`, `tableHide` (a column's menu button, its separator and its menu), `tableMoveUp`, `tableMoveDown` (the chooser's buttons), `tableEdit` (the name of a cell's field), `tableCopied`, `tablePasted`, `tablePasteSkipped` (what a copy and a paste say), `tableMoveRow`, `tableMoveRowKeys`, `tableMovedTo` (the word a row's handle is named by, the keys a reader is told, and what a move says), `tableRowActions` (the word a row's button of actions is named by), `tablePrintLimit` (what a print past its limit says under the table)                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Typed by its columns.** A list built with `pctColumnsOf<T>()` carries every id and the type |
| of every value. A cell template names its column with `pctCellOf` beside the list, so         |
| `let-value` has the column's type and a misspelt id is the compiler's error, not the user's.  |
| A kind the value cannot take — a number kind on text — is refused the same way. A literal     |
| array of columns compiles too, and its templates are not checked against the ids.             |

**What is written is what is searched.** A column's `kind` writes its value in the table's
locale: a number with its unit, an instant on a wall clock or relative to `now`, a boolean as
a word. The quick filter searches that text, word by word, every word in some column of the
row, so `kitchen 45,8` finds a reading copied off the screen. Accents are not folded.

**The order is a list.** A press makes a column the only key, ascending, and turns it on the
next. With Shift held it is added as the last key, or turned where it stands, and the header
of a key after the first shows its place. `unsortable` makes the third press take the column
out of the order.

**Rows that say more.** `striped` lifts every other row, `rowNumbers` numbers the rows as
they stand from 1 in a leading column of data, and the pointer tints the row under it. A
column's `tone` and the table's `rowTone` paint a cell or a row in one of the four tones,
from the value and the row; a tone repeats a word the row says and never says it alone. A
column's `tooltip` set to `true` keeps its cells to one line, cut at
`--pct-table-column-max-width`, and shows the whole text under the pointer when it is cut; a
function writes every cell's tooltip itself. The quick filter's words are marked where it
found them (`highlightMatches`, on by default), and `highlightChanges` flashes a cell whose
value changed, for live readings.

**A narrow table gives way, and its rows open.** A column with a `priority` is hidden when
the table no longer fits its frame, the highest number first, and comes back once the frame
is wider than where it hid by eight pixels. Its value moves into the row's details: a column
of disclosures appears, and each opens a details row the full width of the table, listing
the hidden columns' values above the `pctDetails` template. `pctTableDetails` binds which
rows are open as `[(details)]`; without it the table holds that itself. A column with no
priority never hides, so a row keeps its name and its controls.

**Groups, and what they sum up.** `pctTableGroups` groups the rows by the values of one
column or several. Each group is a body of the table headed by a `th scope="rowgroup"`: a
button with the group's label and count that collapses it, and under each column with an
`aggregate` — `sum`, `avg`, `min`, `max`, `count` or a function — that column's sum. A group
stands where its first row stood, so the order sorts the rows within the groups. The foot sums
every row in view, the filter's answer, not every row the application holds.

**A tree of rows.** `pctTableTree` reads each row's `children` and draws them below it, one
level deeper, behind a button in its first cell; `expanded` holds the open rows' ids, so new
rows keep their branches open. The filter keeps the way to a match — the rows above it, muted
when they matched nothing themselves — and drops a branch with none; the sort orders each list
of siblings; `matched` and `matchedRows` count every row kept, open or not, so an export writes
the tree flat. Alone, the tree is a table with buttons; with `pctTableGrid` it is a treegrid
whose rows say their level, their place and whether they are open, and on a first cell the
arrow into the line opens a branch, the arrow out of it closes one or goes to the parent
([0112](../decisions/0112-a-tree-is-pruned-to-the-matches-and-their-ancestors-and-its-semantics-come-with-the-grid.md)).
`reveal(id)` opens the branches above a row before it scrolls.

```html
<pct-data-table [pctTableTree]="columns" [children]="placesOf" [(expanded)]="open" [pctTableGrid]="columns" …></pct-data-table>
```

**Rows picked, as a field of a form.** `pctTableSelection` leads every row with a native
checkbox, named `Select` and the row's first text, and heads the column with one that is
clear, mixed or checked over the rows the filter left. Shift with a press picks the rows
drawn between it and the row pressed before. The directive is a `FormValueControl` of the
rows' ids, so `[formField]` binds it like any field: its error, once touched, its warning
and its hint stand under the table, which they describe, and an error or a warning describes each row's checkbox too, where a reader inside a cell hears it. An id stays picked while the
filter hides its row and when the rows change — the list is the application's, and a press takes out only what it drops. A list
that must not be empty takes `minLength(1)`, because the form's `required()` reads an empty
list as filled. `mode="single"` picks one row with radios.

In a tree, `cascade` makes a press on a branch pick or drop every row below it that the filter
kept, and picks a branch once all its children are picked and drops it once one is not, up to
the roots; a branch with some of its rows below picked and some not has a mixed checkbox,
which a reader says as half checked. The list is still the application's: what it writes is
shown as written, and the mixed state is read off the rows below, so a branch written picked
over children that are not stands checked and mixed at once.

```html
<pct-data-table [pctTableTree]="columns" [children]="placesOf" pctTableSelection cascade [(value)]="picked" …></pct-data-table>
```

**A window over a long list.** `pctTableWindow` draws the lines its frame shows, eight more
on each side, and the space of the rest as two rows of no element — its first body's
`::before` and its last body's `::after` — so the scrollbar is the whole list's
([0098](../decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)).
Each line drawn is measured and kept by its key; a line never drawn counts at the median of
the first rows measured, and a line above the reader's place that turns out another height
moves the scroll by the difference, so what is read stays where it is. The columns keep the
widths of the first frame, so a longer text further down wraps rather than moving them. The
table tells a reader the count: `aria-rowcount` on the table, `aria-rowindex` on every row
drawn, the header's row first. `scrollTo` and `reveal` reach a row not drawn, and past
16,000,000 px the space is scaled under Firefox's tallest box.

**The application can take either half back.** `clientSort` and `clientFilter` set to
`false` keep the rows as given, while the headers and the application still write `sort` and
`filter` — the question to send a server that pages, orders and filters.

## Server-side by page

A server that pages, orders and filters takes no feature of the table's but one: the table's
`sort` and `filter` are the request, the page is the application's, and `pctTablePage` tells
a reader where the page stands — `aria-rowindex` among every row and `aria-rowcount` of them
all, so the third page of twenty says "row 43 of 1,001", not "row 3 of 21". The rows shown
stay while the next page loads, and `loading` marks them busy.

```ts
protected readonly sort = signal<readonly PctTableSort<'address' | 'name'>[]>([]);
protected readonly filter = signal('');
// A new order or new words go back to the first page.
protected readonly page = linkedSignal({ source: () => [this.sort(), this.filter()], computation: () => 1 });
protected readonly answer = resource({
  params: () => ({ page: this.page(), sort: this.sort(), filter: this.filter() }),
  loader: ({ params, abortSignal }) => this.server.registers(params, abortSignal),
});
// A resource has no value while new params load: keep the last answer, so the rows stay.
protected readonly answered = linkedSignal<Answer | undefined, Answer | undefined>({
  source: () => this.answer.value(),
  computation: (answer, previous) => answer ?? previous?.value,
});
protected readonly total = computed(() => this.answered()?.total ?? 0);
protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
```

```html
<!-- The offset of the page answered: the rows kept while the next loads keep their places. -->
<pct-data-table pctTablePage [rowOffset]="((answered()?.page ?? 1) - 1) * 20" [rowTotal]="total()" [rows]="answered()?.rows ?? []" [columns]="columns" [rowId]="byId" [clientSort]="false" [clientFilter]="false" [loading]="answer.isLoading()" [(sort)]="sort" [(filter)]="filter"></pct-data-table>
<pct-pagination ariaLabel="Pages of registers" [count]="pages()" [(page)]="page" />
```

A change of the order or of the words is one request: the page goes back to the first in the
same change, and `resource` aborts the request it replaces; each keystroke of the filter is
one, and a debounce is the application's. A row's details and a group's heading are lines of
the page, and the count adds the page's.

## Server-side by block

A list too long to page through — a million rows, a log, a history — comes a block at a time
with `pctTableRemote`: one function that loads a block, and the table asks for the blocks the
view reaches, a hundred rows each and half a block on each side, each block once. A row not
here yet is a hole, a row of placeholders at its place among all of them, so the scrollbar
is the whole list's from the first answer and a reader is told "row 500,002 of 1,000,001".

```ts
protected readonly sort = signal<readonly PctTableSort<'address' | 'name'>[]>([]);
protected readonly filter = signal('');
// The request names the block, the order and the question; the signal aborts a block the
// table let go of.
protected readonly load: PctTableLoad<Register, 'address' | 'name'> = (request, signal) =>
  this.server.registers(request, signal); // → { rows, total }
```

```html
<pct-data-table #remote="pctTableRemote" pctTableWindow [pctTableRemote]="load" [columns]="columns" [rowId]="byId" [(sort)]="sort" [(filter)]="filter" style="block-size: 30rem"></pct-data-table> <button pctButton type="button" (click)="remote.refresh()">Refresh</button>
```

The source orders and filters: the table's `sort` and `filter` are what each block is asked
under, and the table orders and matches nothing itself. A new order or question aborts every
block in flight, lets every row go and goes back to the top; `keepScroll` stays where the
reader was. A block the view leaves before it comes is aborted, and asked for again when the
view comes back. A block that fails says so in the first of its rows in view, with a retry
that asks for that block alone. `refresh()` asks again for the blocks in view and keeps
their rows until the answer, for data that lives; `invalidate()` lets every row go.

## Filters by column

`pctTableColumnFilters` gives each column a filter of its own: a button beside the header's
label opens a panel with the control, and `filterRow` draws the same control under each
header. One model, `columnFilters`, holds them by column id, typed by the columns, so a URL
can hold the whole state:

```html
<pct-data-table [pctTableColumnFilters]="columns" [(columnFilters)]="filters" filterRow [rows]="rules()" [columns]="columns" [rowId]="byId">
  <ng-template [pctFilter]="columns" pctFilterOf="address" let-half let-set="set">
    <button pctButton (click)="set('low')">Below 4128</button>
  </ng-template>
</pct-data-table>
```

| a column of                  | is filtered by                 | its state                              |
| ---------------------------- | ------------------------------ | -------------------------------------- |
| text (the default)           | the words of its text          | `{ text: 'lamp' }`                     |
| a boolean kind               | its values: `Yes`, `No`        | `{ values: [true] }`                   |
| a number kind                | a range, both ends included    | `{ from: 10, to: null }`               |
| an instant kind              | the days it falls on, its zone | `{ since: '2026-10-01', until: null }` |
| `columnFilter: 'values'`     | the values its rows hold       | `{ values: ['Kitchen', null] }`        |
| a `filterBy` and `pctFilter` | the application's own state    | `{ own: 'low' }`                       |

`columnFilter: false` gives a column none. A row answers the quick filter and every column's
filter, `matched()` counts the rows that did, and a column's text filter marks its words in
that column. With `clientFilter` off the table applies none of them; with
`pctTableRemote` the source is asked under the ones in force (`request.columnFilters`: no
empty one, none of a column without a filter), and a change starts again at the top. The
panel is a popover: Escape closes it and the focus goes back to the button, whose name says
the column is filtered — `Filter Name, filtered` — as its header's `data-pct-filtered` does;
Clear puts the focus in the panel's first control. A state that went wrong on its way back
from a URL — a shape the column does not take, a day that is not one, a value that is no
filter — lets no row through, so it shows as no rows rather than as a filter that stopped
filtering. Values are compared as `includes` compares them: strings, numbers and booleans
come back from a URL whole, an object does not.

## Layout of the columns

`pctTableColumns` hands the columns' widths, places, edges and visibility to the user, and
`pct-table-column-chooser` lists them beside the table. Both write one model, typed by the
columns' ids, which `JSON.stringify` saves and a signal sets back as it was:

```html
<pct-table-column-chooser [columns]="columns" [(layout)]="layout" /> <pct-data-table [pctTableColumns]="columns" [(layout)]="layout" [rows]="rules()" [columns]="columns" [rowId]="byId" />
```

```ts
readonly layout = signal<PctTableLayout<'name' | 'room' | 'energy'>>({});
// { order: ['room', 'name', 'energy'], widths: { name: 240 }, hidden: ['energy'], pinned: { start: ['room'] } }
```

**Widths the user sets.** The table lays its columns out at fixed widths, whatever the rows
hold: a column's `width` from the layout, else its own, else an equal share of what the others
leave. Each header has a separator at its end edge, the APG's
[window splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/): its width is its
`aria-valuenow`, the arrows move it by 8 px and by 32 with Shift, a pointer drags it, and a
double press fits the column to what it draws. A column is no narrower than its `minWidth`,
120 px by default, and no wider than 2000; one with no width of its own takes at least 160 px
when the frame is narrower than the columns, and the frame scrolls. `fit(column?)` does what the double press does, and
fits every column shown with no id.

**A menu in every header.** Beside the label, a button named `Options for` and the header
opens the column's menu: move it one place towards either end, pin it to the start or the end
or take it off, fit it, hide it. The last column shown cannot be hidden, and a hidden column's
menu hands the focus to the menu of the column taking its place. A column moves among the
columns of its own edge, so a column pinned to the start stays among those pinned there.

**Pinned columns stay.** A column pinned to an edge sticks there while the rest scroll under
it, a shade at its inner edge, and the leading cells — the checkboxes, the disclosures, the
rows' numbers — stick with the start's. In a right-to-left table the start is the right.

**The chooser lists every column**, the hidden among them, in the layout's order: a checkbox
shows or hides one, two buttons move it — `Alt+↑` and `Alt+↓` too — and its menu pins it.

**A layout older than the columns still lays them out** (0097, D9). An id of no column is
passed over and a field of the wrong shape is read as missing; a column the layout does not
name stands at its own place, at its own width; a column pinned to both edges is pinned to the
start. A release that adds a column never throws a user's layout away.

**Groups of headers.** A column's `group` puts a header over the adjacent columns that share
it, in a row above the headers' row, `scope="colgroup"` and all; `'Energy/Next run'` is two
levels, a row each. The header stands over the columns shown — a hidden column leaves its
group, a group with no column shown leaves no header — and the groups' rows stick with the
header. The menu and the chooser move and pin a column's group whole, and a stored order that
split a group is read with the group gathered at its first column
([0114](../decisions/0114-a-header-group-is-a-block-of-adjacent-columns-moved-and-pinned-whole.md)).

**A cell over its neighbours.** A column's `colSpan` asks each row how many of the columns
shown its cell takes, from its own: the cell is a `td colspan`, the cells it covers are not
drawn, and an ask past the row's last column stops there. A span never reaches a pinned
column, which stands where its offset says: a pinned cell takes its column alone, and a span
stops before the first pinned column after it. A row's checkbox and buttons are named by its
first cell of text that is drawn. In the grid the arrows step over the cell as one, and an
arrow across the rows comes back to the column it left; the cell is named in `focused` by its
own column.

```ts
col.key('state', { header: 'State', colSpan: (room) => (room.sensor ? 1 : 3) });
```

**A cell drawn by its column's component.** A column may carry the component its cells are
drawn with, for an application that keeps its cells in its columns rather than in its
template. The table sets the inputs the component declares of four — `value`, `row`, `column`
and `index` — and no other, so a component with inputs of its own keeps them; a new value is
set on the same instance. Built by `pctColumnsOf`, the column refuses at compile time a
component whose input cannot take what the table sets: a `value` of `number` on a column
whose value may be `null`. A `pctCell` template for the column draws in its place, and a
boolean column drawn by a component draws no check mark of its own.

```ts
@Component({ selector: 'app-humidity', template: `{{ value() }} %` })
class Humidity {
  readonly value = input.required<number | null>();
}

col.key('humidity', { header: 'Humidity', component: Humidity });
```

**A hidden column is out of the table**: no header, no cell, no value in the details, and the
quick filter does not read it. Its column filter, set before it was hidden, still filters, and
its sort still orders. A layout that would hide every column hides none, since a table with no
header has no menu to show one back. When every column shown has a width, the table is their
sum and the frame does not stretch them.

## Pinned rows and the order of the rows

`pctTablePinnedRows` draws `pinnedTop` above the rows and `pinnedBottom` below them, in bodies
of their own, with the rows' columns and slots: a sum, a row being added, a row kept in sight.
A pinned row is outside the sort, the filter and the window, so it is not among `rows` and
not among the matches, the exports or the stops of the grid; while the header sticks, a row
pinned above sticks under it while the rows scroll and a row pinned below at the frame's
end, and a reader counts them in the DOM's order. Its checkbox picks it by its id; it has no details and no number.

`pctTableRowOrder` puts a handle in a leading column, which moves the row with `Alt+↑` and
`Alt+↓`, or by dragging it over another row — the place marked by a line above the row or
below it. **The table moves nothing itself**: `(reorder)` says the row's id and the id of the
row it goes in front of, `null` for the end, and the application moves the row in `rows`,
where the order is kept — in the handler, before the next render. Once the row stands at its
new place its handle has the focus again and a reader hears the row's new number; a move
made later is drawn, and says nothing. Under a sort, in a tree or in groups a place is not a
place in the list: the handles stay disabled, and the table says so once in development.

`animateRows` on the table slides a row that changed its place from where it stood to where it
stands — after a move, a sort or a filter — by a transform on the row, for twice the
transition token; a user who asked for less motion sees none. Each render measures the rows
drawn, so a table that redraws on every scroll pays a measurement for it
([0116](../decisions/0116-pinned-rows-stand-outside-the-lines-and-a-move-is-the-applications.md)).

## A row's menu, a status bar and a print

`[pctTableRowMenu]` takes the application's `pct-menu` and draws a trailing column with a
button per row, named by the column's word and the row's first text. The menu opens from the
row it is asked on — that button, a press of the secondary button on the row, the context
menu key or `Shift+F10` in it — at its first item, hangs off that row's button and gives the
focus back to it. **The menu and its items are the application's**: `id()` on the directive
says the row it was opened for, and an item acts on it. A field and a link in a cell keep the
browser's own menu. A command that removes the row hands the focus to the button now where
the row stood. The column sticks after the columns pinned to the end
([0118](../decisions/0118-a-rows-menu-is-the-applications-menu-opened-from-the-row.md)).

```html
<pct-data-table [pctTableRowMenu]="actions" #rowMenu="pctTableRowMenu" pctTableSelection [(value)]="picked" [rows]="rules()" [columns]="columns" [rowId]="byId" #table="pctDataTable" />
<pct-menu #actions>
  <button pctMenuItem (click)="duplicate(rowMenu.id())">Duplicate</button>
  <button pctMenuItem (click)="remove(rowMenu.id())">Remove</button>
</pct-menu>
```

**A status bar is a line of the application's.** What it counts is the table's already:
`matchedRows()` against `rows` for the rows the filter left, the selection's `value()` for the
rows picked, and `pctAggregate` over the values picked for their sum. It is text under the
table, not a live region: a reader reaches it, and a count that changes at every key is not
announced.

```html
<p>{{ table.matchedRows().length }} of {{ rules().length }} shown · {{ picked().length }} picked · {{ pickedEnergy() }} kWh</p>
```

**A print draws every line.** `pctTableWindow` draws them all at the browser's `beforeprint`
and the window again at `afterprint`, up to `printLimit` lines, five thousand by default; past
it the print stops there and says so under the table, on paper only. On paper the table has
no height of its own and no scroll, nothing sticks, a row stays on one page and the header
repeats on each; the handles and the menu's buttons keep their places, unpainted.

## The table as a grid

`pctTableGrid` makes the table the APG's data grid: one tab stop, moved over the cells by the
arrows, Home and End, Ctrl or ⌘ with them, Page Up and Page Down
([0107](../decisions/0107-a-grid-moves-one-stop-over-the-cells-it-drew-and-a-lone-control-is-its-cell.md)).
The element stays a `<table>` with `role="grid"`, its count of columns the hidden ones too,
and each cell its place while a column is hidden — written in the browser, with the keys, so
a server's rendering is a table until then. Tab reaches the grid once and leaves it on the
next press, and the frame that scrolls it is no stop of its own.

**A lone control is its cell.** A checkbox, a button, a switch or a link alone in a cell takes
the stop itself, so the arrow lands on a row's checkbox and Space ticks it. A cell with more,
or with a field, takes the stop: Enter or F2 steps into it, Tab moves among its controls, and
Escape or F2 steps back. A group's heading, a row's details and the foot are lines of the grid
like the rows.

**The stop stays on its cell.** `focused` holds it as a cell: a row's id, or `null` for the
header, and a column's id, or `#select`, `#details` and `#number` for the leading columns; on a
heading, a row's details or the foot it is `null` itself. The stop keeps its cell through new
rows, a new order and a filter that keeps the row. A row
taken away hands it to the line in its place. Under `pctTableWindow`, a stop the scroll left
behind waits on the table, and the next key brings its row back.

**A range, and every row.** Shift with a move stretches `range` over the rows' data cells, a
rectangle between two corners, each cell `aria-selected`; a move without Shift lets it go.
With `pctTableSelection`, Ctrl+A or ⌘+A picks every row the filter left, and each row says
whether it is picked; a `readonly` or `disabled` selection leaves the key to the browser.

```html
<pct-data-table [pctTableGrid]="columns" [(focused)]="cell" [(range)]="range" pctTableSelection …></pct-data-table>
```

## Editing in a cell

`pctTableEditing` edits the cells of a grid in place: Enter or F2 opens the cell under the
stop, with the focus in its editor; a letter or a digit opens it with what was typed, and a
double press opens the cell pressed
([0108](../decisions/0108-a-cell-is-edited-by-a-draft-the-table-never-applies.md)). Enter
commits and the stop goes a row down, Shift+Enter a row up; Tab commits and goes to the next
cell, Shift+Tab to the one before; Escape lets the draft go, and the focus leaving the editor
commits it. It needs `pctTableGrid`.

**The table proposes, the application applies.** A commit emits `(edit)`: the row's id, the
row, its changes — each column's value and the one it held, typed by the column — and its
cause. The table draws the rows it is given, so the cell shows the new value once the
application writes it, as a sort is a proposal the rows answer. An edit that changed nothing
is none. `editable` names the columns that may be edited, or asks of each row and column.

**The editor.** A column's `pctEditor` template draws its own control on `value`, a signal of
the draft, with `invalid` to refuse it — a commit then keeps the editor open — and `commit()`
and `cancel()` for a control that ends the edit by itself, a select that commits on a pick.
Without a template, a column of a number kind is edited in a number field of its fraction
digits, rounded as the commit reads it, and a column of text whose values are strings in a text
field. Any other column needs a template, and a dev build says so. A popup a control owns by
`aria-controls` — a calendar the page draws outside the table — is the editor's while the
focus is in it. What is typed on a cell before its editor has the focus is kept, as typed.
Only the columns drawn are edited: Tab steps over a column the user or a narrow frame hid, and
a row the table no longer holds lets its draft go.

**A whole row, and undo.** With `rowEdit`, Enter opens every editable cell of the row: Tab moves
among them, the last commits them, and the row's changes leave in one `(edit)`; Escape lets the
row go. `undo()` and `redo()`, and Ctrl+Z and Ctrl+Shift+Z or Ctrl+Y on the grid, ask for the
last `history` committed edits back as edits of their own, the values turned round, with the
cause `undo` or `redo`.

```html
<pct-data-table [pctTableGrid]="columns" [pctTableEditing]="columns" [editable]="['name', 'room']" (edit)="apply($event)" …>
  <ng-template [pctEditor]="columns" pctEditorOf="room" let-value="value" let-commit="commit">
    <pct-select ariaLabel="Edit Room" [options]="rooms" [value]="value()" (valueChange)="value.set($event ?? value()); commit()" />
  </ng-template>
</pct-data-table>
```

## Copy, paste and export

**A copy is what a sheet takes.** Ctrl+C on a grid copies the range, else the rows picked, else
the stop's cell, as tab-separated values of the columns drawn, and says `Cells copied: 4`
([0111](../decisions/0111-a-copy-is-a-sheets-text-and-an-export-is-a-function-the-application-calls.md)).
A value is written as another program reads it: a number with the locale's decimal separator
and nothing else, an instant as its wall clock on the column's zone, `2026-11-03 14:05:00`, or
its day, a boolean as `true` or `false`; a text as the cell shows it, after an apostrophe where a sheet would run it as a formula. A field's text, text the
user selected and a cell stepped into copy as the platform copies them.

**A paste is a step of edits.** With `pctTableEditing`, Ctrl+V writes a sheet's cells from the
stop, or the range's top left, to the right and down — one value on a range fills it — each read
as its column's kind reads it: `1 950,3` or `1950.3` in a Polish table, an instant with or without
its time and offset, a boolean as `true`, `1` or the table's word. Each row changed is an
`(edit)` with the cause `edit`, and the paste is one step Ctrl+Z gives back. A value pasted back as the copy wrote it is unchanged. A cell that may not be edited, a column drawn by its own `pctEditor` — its rules are the template's — and a text that is no value of its column are left out, and counted:
`Cells pasted: 3, left out: 1`.

**An export is a function the application calls.** `pctTableCsv(table)` is the rows the filter
let through, in the table's order, with every column the user has not hidden: a byte-order mark,
the delimiter of the locale's sheets (`;` where decimals take a comma), and a text a sheet would
run as a formula written after an apostrophe. `pctTableXlsx(table)` is a workbook of one sheet,
written with no library: numbers as numbers, an instant as a date of the day or the moment on
its zone's wall clock, booleans, a bold header frozen in view, and widths from the text or from
`widths`, a layout's pixels. `formatted` writes the texts the cells show. The download is the
page's: the table offers no button.

```ts
const csv = pctTableCsv(table, { formatted: false });
const file = await pctTableXlsx(table, { sheet: 'Rules', widths: layout().widths });
```

## How much it holds

Measured on 2026-10-31 by the sandbox's `registers` demo — five columns, a switch in one, a
name that wraps in every twenty-fifth row — headless at 1280 × 720 on a desk other sessions
share, one engine at a time (chromium 153, firefox 155, webkit 26.6; Playwright 1.63). The
first frame runs from the press that binds the rows to the second frame after the window
drew them, and includes the demo making the list; a step is 5,000 px of scroll to the second
frame after it, the median of ten.

| rows      | chromium first / step | firefox first / step | webkit first / step | rows in the DOM |
| --------- | --------------------: | -------------------: | ------------------: | --------------: |
| 10,000    |            34 / 51 ms |           37 / 88 ms |        113 / 105 ms |              25 |
| 100,000   |           152 / 53 ms |          187 / 94 ms |        169 / 106 ms |              25 |
| 1,000,000 |          1320 / 57 ms |         1641 / 95 ms |         901 / 98 ms |              25 |

Without the window a table holds 8,000 cells, a thousand rows of eight columns (0098). With
it the DOM holds the same 25 rows whatever the list, and a step costs the same; what grows
is the work over the whole list, which is the application's and the table's sort and filter.
Past about 100,000 rows give the order and the filter to a server: `clientSort` and
`clientFilter` set to `false`, as the demo does for a million.

## Parts

| part          | what it is                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| `message`     | the sentence beside an empty table, outside the table                             |
| `placeholder` | a row of skeletons standing for rows that are still coming, hidden from readers   |
| `place`       | the place and the way of a sort key after the first, drawn for the eye            |
| `mark`        | a word the quick filter found, in a cell it read by its text                      |
| `disclosure`  | the button that opens a row's details, in the leading column                      |
| `handle`      | the button that moves a row, in the leading column `pctTableRowOrder` adds        |
| `actions`     | the button that opens a row's menu, in the trailing column `pctTableRowMenu` adds |
| `details`     | the row of details below a row, the full width of the table                       |
| `group`       | a group's heading, the first row of its body                                      |
| `select`      | a row's checkbox, or its radio in single mode, in the leading column              |
| `select-all`  | the header's checkbox, over the rows the filter left                              |
| `error`       | the selection's error under the table, once touched                               |
| `warning`     | the selection's warning under the table, with its glyph                           |
| `hint`        | the selection's hint under the table                                              |
| `hole`        | a row a remote source has not delivered: its cells loading, or its block failed   |
| `retry`       | the button in the first hole drawn of a failed block, which asks for it again     |
| `filter`      | a column's filter button beside its header's label, which opens its panel         |
| `options`     | a column's menu button beside its header's label, on `pctTableColumns`            |
| `separator`   | the handle at a header's end edge that resizes its column                         |
| `item`        | a column's row in `pct-table-column-chooser`                                      |
| `editor`      | a cell open in an editor, around its field or the column's own control            |
| `toggle`      | the first layer's button in a sortable header — see the table's card              |
| `icon`        | its chevron                                                                       |

## Theming

```css
[data-theme='brand'] {
  --pct-table-heading-bg: #ccfbf1;
  --pct-table-border: #99f6e4;
}
```

## Keyboard map

| key                                                                       | effect                                                                                                                                                      | test                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`                                                       | moves between the sort buttons and the controls in the cells                                                                                                | `apps/sandbox-e2e/src/datatable.spec.ts` — "Tab moves from the sort buttons into the controls in the cells", and `Shift+Tab` in the next                                                                                                            |
| `Enter` / `Space`                                                         | sorts by the column as its only key, or turns the first key                                                                                                 | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard sorts by one key, Space turns it, and Shift+Enter adds a second marked by its place"                                                                                                       |
| `Shift+Enter`                                                             | adds the column as the next key, or turns it where it stands                                                                                                | the same case                                                                                                                                                                                                                                       |
| `Enter` / `Space` on a disclosure                                         | opens the row's details, or closes them                                                                                                                     | `apps/sandbox-e2e/src/datatable.spec.ts` — "a narrow table hides the columns of the highest priority, and its details list them"; Tab through them in "Tab goes from a row's disclosure to its controls, into its details, then on to the next row" |
| `Space` on a row's checkbox                                               | picks the row, or drops it                                                                                                                                  | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard picks a row, Shift with a press picks the rows between, and the header reads clear, mixed and checked"                                                                                     |
| `Shift` with a press on a checkbox                                        | picks, or drops, every row drawn between it and the row pressed before                                                                                      | the same case                                                                                                                                                                                                                                       |
| `Space` on the header's checkbox                                          | picks every row the filter left, or drops them when all are picked                                                                                          | the same case                                                                                                                                                                                                                                       |
| `↑` / `↓` among the radios                                                | moves the one pick, the platform's radio group                                                                                                              | `apps/sandbox-e2e/src/datatable.spec.ts` — "one rule to copy: radios in one group, the arrows move the pick"                                                                                                                                        |
| `→` / `←` on a separator                                                  | widens or narrows its column by 8 px, the other way in a right-to-left table                                                                                | `apps/sandbox-e2e/src/datatable.spec.ts` — "a separator widens its column by the arrows, by 32 with Shift, and stops at its narrowest"                                                                                                              |
| `Shift+→` / `Shift+←` on a separator                                      | by 32 px                                                                                                                                                    | the same case                                                                                                                                                                                                                                       |
| `Enter` / `Space` on a column's menu button                               | opens its menu, the platform's menu button; `Escape` closes it, a chosen command keeps the focus on the button, or on the next column's when it hid its own | `apps/sandbox-e2e/src/datatable.spec.ts` — "a header’s menu moves its column, pins it and hides it, and the focus goes to the menu taking its place"                                                                                                |
| `Alt+↑` / `Alt+↓` in the chooser                                          | moves the column of the row focused one place, the focus staying                                                                                            | `apps/sandbox-e2e/src/datatable.spec.ts` — "the chooser shows and hides a column, its buttons move one, and Alt with an arrow moves the one focused"                                                                                                |
| `Shift+F10` / the context menu key in a row                               | opens the row's menu at its first item; `Escape` closes it and the focus goes back to the row's button                                                      | `apps/sandbox-e2e/src/datatable.spec.ts` — "Shift+F10 opens a row’s menu"                                                                                                                                                                           |
| `Enter` / `Space` on a row's button of actions                            | opens the row's menu, or closes it                                                                                                                          | the same case                                                                                                                                                                                                                                       |
| `Alt+↑` / `Alt+↓` on a row's handle                                       | moves the row one place, the focus staying on its handle                                                                                                    | `apps/sandbox-e2e/src/datatable.spec.ts` — "Alt with an arrow moves the row, the focus stays on its handle, a reader hears its number, and the rows slide"                                                                                          |
| `Tab` into a grid                                                         | reaches its one stop, the first row's first cell; the next `Tab` leaves the grid                                                                            | `apps/sandbox-e2e/src/datatable.spec.ts` — "is one tab stop: Tab reaches the first cell of the first row, and the next Tab leaves"                                                                                                                  |
| `→` / `←` / `↑` / `↓` in a grid                                           | moves the stop to the next cell, the horizontal arrows turned in a right-to-left table; across lines the column stays                                       | `apps/sandbox-e2e/src/datatable.spec.ts` — "the arrows move cell to cell, Home and End along the row, Ctrl with them to the ends"                                                                                                                   |
| `Home` / `End` in a grid                                                  | to the line's first or last cell                                                                                                                            | the same case                                                                                                                                                                                                                                       |
| `Ctrl+Home` / `Ctrl+End` in a grid (`⌘` on macOS)                         | to the grid's first cell, the header's, or its last, the foot's or the last row's                                                                           | the same case                                                                                                                                                                                                                                       |
| `Page Down` / `Page Up` in a grid                                         | by as many lines as the frame shows                                                                                                                         | `apps/sandbox-e2e/src/datatable.spec.ts` — "Page Down and Page Up move by what the frame shows"                                                                                                                                                     |
| `Space` on a lone control in a grid                                       | presses it — a row's checkbox, a switch; the arrows go on from it                                                                                           | `apps/sandbox-e2e/src/datatable.spec.ts` — "a switch alone in its cell takes Space, and the arrows go on from it"                                                                                                                                   |
| `Enter` / `F2` on a cell of several controls                              | steps into it: `Tab` moves among its controls, `Escape` or `F2` steps back to the cell                                                                      | `apps/sandbox-e2e/src/datatable.spec.ts` — "opens a row with its disclosure; its details, of two buttons, are stepped into with Enter and left with Escape"                                                                                         |
| `Shift` with a move in a grid                                             | stretches the range of data cells from where it began; a move without `Shift` lets it go                                                                    | `apps/sandbox-e2e/src/datatable.spec.ts` — "Shift with the arrows stretches a range of cells, an arrow alone lets it go"                                                                                                                            |
| `Ctrl+A` / `⌘+A` in a grid that picks                                     | picks every row the filter left                                                                                                                             | `apps/sandbox-e2e/src/datatable.spec.ts` — "Ctrl+A picks every row, and each row says it is selected"                                                                                                                                               |
| `Enter` / `F2` on an editable cell                                        | opens its editor with the focus in it; a double press opens the cell pressed                                                                                | `apps/sandbox-e2e/src/datatable.spec.ts` — "opens a cell on Enter"                                                                                                                                                                                  |
| a letter or a digit on an editable cell                                   | opens a text editor with the letter, a number editor with the digit                                                                                         | `apps/sandbox-e2e/src/datatable.spec.ts` — "opens a number with the digit typed"                                                                                                                                                                    |
| `Enter` / `Shift+Enter` in an editor                                      | commits, and the stop goes a row down, or up                                                                                                                | `apps/sandbox-e2e/src/datatable.spec.ts` — "opens a cell on Enter"                                                                                                                                                                                  |
| `Tab` / `Shift+Tab` in an editor                                          | commits, and the stop goes to the next cell, or the one before; with `rowEdit`, moves among the row's editors first                                         | `apps/sandbox-e2e/src/datatable.spec.ts` — "lets the draft go on Escape", "edits a whole row"                                                                                                                                                       |
| `Escape` in an editor                                                     | lets the draft go, the row's with `rowEdit`; the stop stays on the cell; a control's open list closes first                                                 | `apps/sandbox-e2e/src/datatable.spec.ts` — "lets the draft go on Escape", "edits the room"                                                                                                                                                          |
| `Ctrl+Z` / `Ctrl+Shift+Z` or `Ctrl+Y` in a grid that edits (`⌘` on macOS) | asks the last committed edit back, or again                                                                                                                 | `apps/sandbox-e2e/src/datatable.spec.ts` — "asks the last edit back"                                                                                                                                                                                |
| `Ctrl+C` on a grid (`⌘` on macOS)                                         | copies the range, else the rows picked, else the cell, as tab-separated values                                                                              | `apps/sandbox-e2e/src/datatable.spec.ts` — "copies a range on Ctrl+C and pastes it"                                                                                                                                                                 |
| `Ctrl+V` on a grid that edits (`⌘` on macOS)                              | writes a sheet's cells from the stop as one step of edits                                                                                                   | `apps/sandbox-e2e/src/datatable.spec.ts` — "copies a range on Ctrl+C and pastes it", "pastes a number as the column reads it"                                                                                                                       |
| `Enter` / `Space` on a tree row's button                                  | opens the row's children, or closes them                                                                                                                    | `apps/sandbox-e2e/src/datatable.spec.ts` — "three levels open from their buttons, and the treegrid says each row’s level and place"                                                                                                                 |
| `→` on a treegrid row's first cell (`←` in a right-to-left table)         | opens a closed branch, the stop staying; on an open branch or a leaf, the grid's move                                                                       | `apps/sandbox-e2e/src/datatable.spec.ts` — "on a first cell the arrow out of the line closes a branch or goes to the parent, the arrow into it opens one"                                                                                           |
| `←` on a treegrid row's first cell (`→` in a right-to-left table)         | closes an open branch, the stop staying; on a leaf or a closed branch, moves the stop to the parent's first cell; on a root, the grid's move                | the same case                                                                                                                                                                                                                                       |

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/table/src/data-table.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/datatable.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/datatable` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `datatable-devices` and `datatable-devices-rtl`: stripes, numbers, tones and a cut name; the first layer's `table-pattern` holds the rest of the paint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `forced-colors: active` — no state carried by colour alone | the first layer's: the lines `CanvasText`, the focus `Highlight`; the data table adds a check mark, a drawing, and the place of a sort key, a digit. A tone repeats a word of its row, so the tint forced colours drop takes nothing with it, and a marked word takes the system's `Mark` and `MarkText`; a pinned column's edge, which the shade draws elsewhere, is a `CanvasText` line, and a separator's line `CanvasText`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `prefers-reduced-motion` — duration from a token           | `libs/components/table/src/data-table.scss` — a changed value's flash lasts eight of `--pct-motion-transition-duration`, which the reduced scope makes `0.01ms`, so a user who asked for less motion sees none; the skeletons of a loading table follow their own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Touch target ≥ 24×24 px outright                           | the first layer's sort button, `libs/components/table/src/header.scss`; the label around a row's checkbox, `apps/sandbox-e2e/src/target-min.spec.ts` — `data table pick`, `data table column menu`, `data table separator`, `data table handle`, `data table actions`; the controls in cells are the consumer's own components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a cell is not a control, as the first layer's card says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Density axis                                               | the first layer's padding on `space.3` and `space.4`, re-pointed by the compact scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot is the first layer's `table-pattern-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/datatable` in `SBX_ROUTES`; the scroll listener and the observer start after render                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Forms                                                      | `pctTableSelection` is the table's one control: `[formField]` binds its value and its state, `libs/components/table/src/data-table-selection.spec.ts` — "a field of a form"; `apps/sandbox-e2e/src/datatable.spec.ts` — the error once touched, the warning that lets the form through                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `message`, `placeholder`, `place`, `mark`, `disclosure`, `details`, `group`, `select`, `select-all`, `error`, `warning`, `hint`, `hole`, `retry`, `options`, `separator`, `editor`, `handle`, `actions`, and the chooser's `item`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/component.table.json` — the rows' surfaces, the tones, the mark, the separator, a pinned column's surface and shade, an editor's outline; `libs/tokens/src/contrast.policy.json` — a cell's text on each surface, each tone's pair, the rows' numbers and the mark, a picked row under the pointer and without it, the selection's three lines on the page's surface, a separator on the header's surface, a cell's text and the rows' numbers on a pinned column's, an editor's outline on the page's surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `tableEmpty`, `tableNoMatches`, `tableLoading`, `tableYes`, `tableNo`, `tableRowNumber`, `tableSortLater`, `tableSortAscending`, `tableSortDescending`, `tableDetails`, `tableDetailsOpen`, `tableDetailsClose`, `tableGroupCount`, `tableTotal`, `tableSelectAll`, `tableSelectRow`, `tableLoadFailed`, `tableRetry`, `tableColumnMenu`, `tableResize`, `tableMoveStart`, `tableMoveEnd`, `tablePinStart`, `tablePinEnd`, `tableUnpin`, `tableFit`, `tableHide`, `tableMoveUp`, `tableMoveDown`, `tableEdit`, `tableCopied`, `tablePasted`, `tablePasteSkipped`, `tableMoveRow`, `tableMoveRowKeys`, `tableMovedTo`, `tableRowActions`, `tablePrintLimit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./table` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Screen-reader log                                          | Read 2026-11-05 from `docs/acr/at/` — three readers, whole sandbox, and five of this view's demos past the walk's twelve stops entered as headings of their own (`at/sections.ts`): a column's filter, the grid, a row's menu, a tree picked as one and a cell over its neighbours. **The table is a table under all three**: Orca enters it by its shape, `table with 21 rows 6 columns · column header. · row 1. · column 1 · Name · button.`; NVDA reads a sort header as its header, `Room, column header, row 1, column 2` — the walk of 2026-11-02 had said the button, `column 2, Room, button`; VoiceOver reached the filter above it alone, `Filter rules search text field`, and lost the page after it. **A control in a cell is read with its row and its column**: NVDA `Enabled: Supply fan, row 2, Enabled, column 6`, Orca `row 3. · Enabled: Heater · switch not pressed.` **A table given a height is a named stop**, because its frame scrolls: NVDA `Polling rules, region`, Orca `Polling rules. · clickable. · Browse mode`. **A column's filter is a button that opens a dialog**: NVDA `Filter Room, button, collapsed, opens dialog`, Orca `Filter Room · collapsed button. · opens dialog`; opened, NVDA says `Filter Name, dialog`, Orca `Filter Name · dialog clickable.`, VoiceOver `Filter Name web dialog with 4 items heading level 2 Filter Name`. **In the grid the arrows read a cell with its row and its column**: NVDA `Show details, not selected, row 3, Details, column 2`, Orca `row 3. · Show details · collapsed button.`, and the next Tab leaves the grid — one stop; VoiceOver answered `End` with `end of table`, its own command, which took the focus to the table. **A row's menu button says the row and the menu**: Orca `Actions Supply fan · collapsed button. · opens menu.`, NVDA `Actions Heater, row 3, Actions, column 8`, VoiceOver `Actions Heater menu pop up button`; opened, NVDA `Duplicate, 1 of 2`, Orca `menu · Duplicate.`, VoiceOver silent at the first item and `Remove menu item (2 of 2)` at the second; on Escape Orca reads the button again, NVDA `main landmark`. **The column of picks is named by its word**: NVDA `Select Heater, row 3, Select, column 1` — a first walk of this change heard `Select all rows` there, the checkbox over the rows naming the header, and the header now has a name of its own. **A branch half picked is mixed**: with the kettle picked, Orca reads its room `Select Kitchen · check box partially checked.`, VoiceOver `Select Kitchen mixed checkbox`; NVDA said `checked` as Space picked the kettle, and reads a box in a cell without its state, `Select Kitchen, row 3, Select, column 1`. **A cell over its neighbours is one cell**: NVDA `No sensor fitted, not selected, row 3, State, column 2, through 4`, Orca `State column header No sensor fitted · row 3 column 2`, and the next ArrowDown is back in the column it left, `23.0 degrees C, not selected, row 4, Temperature, column 3`. The press, the empty sentence, a cell's editor and the row of filters are not walked: the e2e suite reads them |
| A docs page with live examples                             | `apps/sandbox/src/app/views/datatable/` (the sandbox view). The published site: `/components/datatable`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Unit + mutation                                            | `libs/components/table/src/data-table.spec.ts`, `libs/components/table/src/data-table-selection.spec.ts`, `libs/components/table/src/data-table-window.spec.ts`, `libs/components/table/src/row-menu.spec.ts`, `libs/components/table/src/data-table-page.spec.ts`, `libs/components/table/src/data-table-columns.spec.ts`, `libs/components/table/src/data-table-grid.spec.ts`, `libs/components/table/src/data-table-editing.spec.ts`, the engine's specs in `libs/components/table/src/model/`; `libs/components/mutation.snapshot.md` — measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Decisions this component implements

[0097](../decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)
(the main one — one typed engine, templates by column id, the native table, the order as a
list, the three roads of data),
[0098](../decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)
(the window: opt-in, measured lines, the space as two rows of no element),
[0107](../decisions/0107-a-grid-moves-one-stop-over-the-cells-it-drew-and-a-lone-control-is-its-cell.md)
(the grid: one stop over the cells drawn, a lone control as its cell, a window's stop that
waits),
[0108](../decisions/0108-a-cell-is-edited-by-a-draft-the-table-never-applies.md)
(the editing: a draft the table never applies, a commit as a proposal, undo as edits asked
back),
[0111](../decisions/0111-a-copy-is-a-sheets-text-and-an-export-is-a-function-the-application-calls.md)
(copy, paste and export: the platform's clipboard events, plain values, functions the
application calls, a workbook with no library),
[0112](../decisions/0112-a-tree-is-pruned-to-the-matches-and-their-ancestors-and-its-semantics-come-with-the-grid.md)
(the tree: pruned to the matches and their ancestors, counted open or not, a treegrid with the
grid alone),
[0114](../decisions/0114-a-header-group-is-a-block-of-adjacent-columns-moved-and-pinned-whole.md)
(a header group: a block of adjacent columns, moved and pinned whole, HTML's semantics),
[0116](../decisions/0116-pinned-rows-stand-outside-the-lines-and-a-move-is-the-applications.md)
(pinned rows outside the lines, a move the application's, a slide by a transform on the row),
[0118](../decisions/0118-a-rows-menu-is-the-applications-menu-opened-from-the-row.md)
(a row's menu the application's, opened from the row; a status bar a recipe; a print of every
line to a limit),
[0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) (the first
layer it renders), [0037](../decisions/0037-loading-is-a-fact-about-the-list.md) (loading is a
fact about the list), [0027](../decisions/0027-a-slot-is-a-directive.md) (a slot is a
directive).

## Known limitations

- **A row's menu opens at its button, not at the pointer.** The panel is placed by the control
  it hangs off, so a press of the secondary button far along a wide row opens it at the row's
  end.
- **A print past `printLimit` is cut.** The lines past the limit are left off the paper, and
  the sentence under the table says how many there were.
- **A tree is grouped by its roots.** Under `pctTableGroups` a branch stands in its root's
  group, whatever its rows' own values; a tree of a remote source is built inside the rows the
  source delivered, in their order.
- **The tree has not been through the readers' walk.** Its rows' level, place and state are
  the APG treegrid's; what Orca, NVDA and VoiceOver say on them is not recorded yet.
- **The `.xlsx` is one sheet of values.** No formulas, merged cells, colours or second sheet; an
  application that needs them writes its own file from `matchedRows`. It was opened by hand in
  LibreOffice 2026-11-03 (`soffice --headless --convert-to csv`): numbers, days, moments and
  booleans came back as values in the reader's locale, the escaped markup as text; the CI image
  has no LibreOffice, so the unit test reads the zip's XML instead.
- **An export names the columns, not their groups.** A copy, a CSV and a workbook carry one
  header row; a group is the view's, and a reader of the file sees the columns' headers alone.
- **A pinned row is drawn, not reached.** It is not a stop of the grid, not edited in a cell,
  not exported and not among the matches; a drag of a row does not scroll the frame, so a row
  is dragged within the rows in view and moved further by the keyboard.
- **A copy and a paste are said, not walked.** The announcement is a live region's; what Orca,
  NVDA and VoiceOver say around it is not recorded. A copy writes no `text/html`.

- **Editing has not been through the readers' walk.** The editor's field is named by its
  column and the focus moves as a sheet's does; what Orca, NVDA and VoiceOver say as a cell
  opens and closes is not recorded yet.
- **A built-in editor has no rules.** An empty text field commits `''`, an empty number field
  `null`; a column that holds neither gives its editor a template that refuses them. Delete
  does not clear a cell.
- **A draft refused stays open while the focus is elsewhere**, and does not take the focus
  back; it waits until it is committed, let go, or another cell is opened, which lets it go. Under a window, an editor the scroll takes away
  is committed.
- **The grid has not been through the readers' walk.** Its role, its count and its stop are
  the APG's; what Orca, NVDA and VoiceOver say in its cells, and whether each enters it as a
  grid, is not recorded yet.
- **A stop the window's scroll left behind waits on the table.** The table holds the focus
  and a reader hears its name, not the cell's, until the next key brings the cell back; the
  cell is not drawn outside the window to keep it.
- **A cell's lone control is read off the DOM after each render.** A template that draws a
  second control, or a field, makes the cell one to step into from the next render on.
- **A move into rows a remote source has not loaded lands next to them.** They are holes until
  their block comes, and a hole is reached by the loaded row beside it.
- **A cell out of a range says nothing of selection**, though the grid is
  `aria-multiselectable`: `aria-selected="false"` on every cell would be spoken on every cell.

- **Without the window every row is in the DOM**, which 0098 measured as fluent up to 8,000
  cells — a thousand rows of eight columns. A longer list takes `pctTableWindow`.
- **Find-in-page finds only the lines a window drew.** The rest are a height, not text; the
  quick filter searches every row.
- **A window needs a height.** It draws what its frame shows; a frame taller than the page —
  a table with no height of its own — draws a page of lines, and a dev build says so.
- **A focused row that a window scrolls away hands the focus to the frame.** Not to another
  row, which would scroll the frame back to it: the frame takes the keys that scroll it, and
  a `Tab` from it goes into the rows drawn.
- **A window's group heading leaves with its line.** A heading scrolled past is not drawn,
  so it does not stick above its rows the way it does in a table with no window.
- **A scaled window moves faster than the wheel.** Past 16,000,000 px a pixel of scroll moves
  the lines by more than a pixel; a line that grows above the view still keeps what the
  reader sees where it was.
- **A step of the window takes two or three frames.** The rows a scroll draws are measured
  after they are laid out and placed again, which a fling on a touch device has not been
  measured for.
- **A remote source's rows are not grouped, and not summed.** Its groups and its sums are
  the source's to make: the table has only the blocks it was sent, so `pctTableGroups` groups
  none of them, and a dev build says so, and the foot is not drawn. `selectAll` picks the
  rows that came, and `matched` is the count the source gave.
- **A remote source's answer is read over the whole list.** Each block that comes makes the
  table's lines and the window's heights again, every one of the `total`: measured on
  2026-10-31 by the sandbox's `remote` demo, a block of a million registers costs 140 to
  230 ms of the main thread in a dev build in chromium, so a fling across a million rows
  stutters as its blocks come.
- **A remote source's rows stay once they came.** A block the view left keeps its rows, so a
  scroll across a million rows holds every block it passed until a new order, a new
  question, `refresh()` or `invalidate()` lets them go. A refreshed block whose new answer
  fails keeps the rows it had, and `error` says so; the table draws them as they were.
- **A filter by values offers the values of `rows`.** With a remote source, whose rows the
  table only has a block at a time, such a column offers nothing: give it `filterBy` and a
  `pctFilter` template of the source's own values, or filter it by its text.
- **A column filter's text is matched as the cell writes it**, as the quick filter's is: a
  number in its unit and the locale's digits. A range reads the value itself.
- **A hidden column's filter still filters.** A column `priority` hides on a narrow table
  keeps its filter, and its button and its control go with it: the rows it holds back are
  missing with nothing on the screen to say why, until the table is wide again or
  `clear()` takes it away. Hiding a column does not drop its filter, so a table that narrows
  does not change its answer.
- **A hidden column's sort still orders.** The rows stay in the order its header gave them,
  with no arrow on the screen to say by what, until it is shown again or `sort` is set.
- **The row of filters has not been through the readers' walk.** The header's buttons and
  their panel have, as the reading above says; the row under the headers is off in the demo
  the walk enters, and what the three readers say of its fields is not recorded yet.
- **A hole is read as an empty, busy row.** It carries `aria-busy` and its place, and the
  readers' walk has not recorded what each says of it yet.
- **A pinned column's group heading and foot scroll.** The header and the rows stick at
  their edge; a group's heading and the foot's sums span or sit under the columns as they
  are, and move with the scroll.
- **The shade at a pinned edge is a shadow.** It is drawn whether or not anything has
  scrolled under the column yet.
- **Widths are the directive's.** Without `pctTableColumns` a column's `width` and
  `minWidth` are not read, and the table lays its columns out by their content as before.
- **A column has a width or a share, not a flex.** A column with no width shares what the
  others leave equally; there is no weight to share it by, and a header or a cell longer than
  its column wraps rather than widening it. `tooltip: true` keeps a cell to one line.
- **A word longer than its column breaks.** The header's buttons and the chevron take about
  90 px of a column, so a column narrowed to its least breaks its header's word.
- **Fitting under a window measures the rows drawn.** A double press on a separator, or
  `fit()`, reads the header and the cells in the DOM; a row the window has not drawn may be
  wider.
- **The layout's controls have not been through the readers' walk.** The separator is the
  APG's window splitter and the menu the platform's menu button; what the three readers say
  of them is not recorded yet.
- **A later sort key is a description.** `aria-sort` stands on one header at a time, as ARIA
  asks; a key after the first describes its header's button — `Sort key 2, descending` — and
  a reader says a description after the name, or only when asked.
- **`visible` counts lines.** `start` and `end` are positions among the lines drawn, the end
  excluded, so a details row or a group heading, when they come, counts as a line too.
- **The sticky header needs a height.** The header row stays at the top of a table given a
  block size, where its frame scrolls; a table the page scrolls has no box to stick to.
- **A cell template does not change what is searched.** The quick filter reads the text the
  column's kind writes, whatever the template draws in its place.
- **A column gives way when the table overflows.** The table squeezes its columns, wrapping
  their text, before it hides one: the frame's overflow is what it reads, not a width it
  computed, because the cells' content decides the columns' widths. A table whose box grows
  with its content — in a flex row, in an `auto` grid track — never overflows, and hides
  nothing.
- **A group heading is read differently by each reader.** A `th scope="rowgroup"` is what
  the platform has, and the readers announce it in their own ways; the readers' walk records
  what each says rather than bending the markup to one of them.
- **A group heading takes no template yet.** It writes the label its column writes for the
  group's first row.
- **A column comes back at the width it needed when it hid.** Rows that became shorter since
  do not bring it back sooner; a resize of the frame does. Under SSR every column is drawn,
  and the client hides what does not fit once it has laid the table out.
- **A cut cell's whole text is the pointer's.** The tooltip is the platform's `title`, which a
  keyboard does not open; a reader hears the whole text, because the cut is only paint.
- **A tone is a tint and a colour.** It is gone in forced colours and for a reader who cannot
  tell the colours apart, which is why a column of states wears the tone of the word it
  writes rather than a tone of its own.
- **A flash compares values, not texts.** A value that is a new object at every poll flashes at
  every poll; the clock moving a relative instant on does not.
- **`now` is read when the rows are written.** A relative column counts from the clock each
  time the rows, the order or the filter change; an application that wants `in 5 minutes` to
  tick between those binds a clock of its own.
- **A row is not picked by a press on the row.** Only its checkbox picks it, so a press on a
  switch or a link in a cell does what it says; `aria-selected` waits for the grid, where a
  row is a thing that can be selected.
- **Shift picks the rows drawn.** A range runs over the lines in view, so a collapsed group's
  rows between its ends are left as they were.
- **NVDA does not say the sort is a control**, as the first layer's card records for the same
  button: `Room, column header, row 1, column 2` in the walk of 2026-10-30.
