# `PctDataTable` — a table built from data

**Summary:** A table drawn from your rows and a typed list of columns: sorting by one key or several, a quick filter over what the cells show, and the empty and loading states, in the look of the platform table.
**Entrypoint:** `@pacit/components/table`
**Selectors:** `pct-data-table`, `pct-data-table[pctTableDetails]`, `pct-data-table[pctTableGroups]`, `pct-data-table[pctTableSelection]`, `ng-template[pctCell]`, `ng-template[pctHeaderCell]`, `ng-template[pctEmpty]`, `ng-template[pctDetails]`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** a native `<table>` — sorting as the APG's
[sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
draws it, with `aria-sort` on the header of the first sort key alone. Named in the class
JSDoc.

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

|                                                                                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**                                                                                     | `sort`: a list of `PctTableSort` keyed by the columns' ids, the first deciding first; `filter`: the quick filter's question; `value` on `pctTableSelection`: the ids of the rows picked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Inputs**                                                                                    | `columns` and `rowId` (required), `rows` (`[]` until bound), `caption`, `ariaLabelledby`, `ariaLabel`, `unsortable`, `clientSort`, `clientFilter`, `filterWith`, `loading`, `locale`, `now`, `stickyHeader`, `striped`, `rowNumbers`, `rowTone`, `highlightMatches`, `highlightChanges`; on `pctTableDetails`: `details` (a model of the open rows' ids) and `disabled`; on `pctTableGroups`: the columns (its own input), `groupBy`, `collapsed` (a model of the collapsed groups' keys) and `disabled`; on `pctTableSelection`, the field's: `mode` (`single` or `multiple`), `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `warnings`, `name`, `hint` |
| **Outputs**                                                                                   | `sortChange` and `filterChange` (the models'), `detailsChange` on `pctTableDetails`; read-only signals `matched`, `lines`, `scrolled`, `visible` and `hiddenColumns`; methods `scrollTo(id, { align })` and `reveal(id)`; `collapsedChange`, `expandAll()` and `collapseAll()` on `pctTableGroups`; `groupKeys()` on the table; `valueChange`, `touch`, `showInvalid`, `selectAll()` and `clear()` on `pctTableSelection`, and `matchedIds` on the table                                                                                                                                                                                                                       |
| **Slots**                                                                                     | `ng-template[pctCell]` (a cell, by column id or a list of ids), `ng-template[pctHeaderCell]` (what stands in a header's label), `ng-template[pctEmpty]` (what stands for the empty table's sentence), `ng-template[pctDetails]` (what stands in a row's details, below the hidden columns' values)                                                                                                                                                                                                                                                                                                                                                                             |
| **Parts**                                                                                     | `message` (the sentence beside an empty table), `placeholder` (a row standing for rows still coming), `place` (the place of a sort key after the first), `mark` (a word the quick filter found), `disclosure` (the button that opens a row's details), `details` (the row of details), `group` (a group's heading), `select` (a row's checkbox or radio), `select-all` (the header's checkbox), `error`, `warning` and `hint` (the selection's line under the table)                                                                                                                                                                                                           |
| **Harness**                                                                                   | `PctDataTableHarness` — the parts, and `headers()`, `rows()`, `cell(row, header)`, `sortBy(header, { shift })`, `toggleSelection(row, { shift })`, `selectAll()`, `selectedRows()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Tokens**                                                                                    | the first layer's `--pct-table-*` tier, and the data table's rows: `bg-hover`, `bg-striped`, `bg-changed`, the four tones' `bg-*` and `fg-*`, `fg-muted` (the rows' numbers), `column-max-width`, `mark-bg`, `mark-fg`, `details-bg`, `group-bg`, `group-fg`, `indent`, `bg-selected`, `fg-selected` (a picked row), `hint-fg`, `hint-fg-invalid`, `hint-fg-warning` (the selection's line)                                                                                                                                                                                                                                                                                    |
| **Strings**                                                                                   | `tableEmpty`, `tableNoMatches`, `tableLoading` (the three sentences an empty table says), `tableYes`, `tableNo` (how a boolean cell is read and searched), `tableRowNumber` (the header of the rows' numbers), `tableSortLater`, `tableSortAscending`, `tableSortDescending` (a later sort key, as a reader hears it), `tableDetails`, `tableDetailsOpen`, `tableDetailsClose` (the column of disclosures and its buttons), `tableGroupCount`, `tableTotal` (a group's count, the foot's label), `tableSelectAll`, `tableSelectRow` (the header's checkbox, and the word a row's is named by)                                                                                  |
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

**Rows picked, as a field of a form.** `pctTableSelection` leads every row with a native
checkbox, named `Select` and the row's first text, and heads the column with one that is
clear, mixed or checked over the rows the filter left. Shift with a press picks the rows
drawn between it and the row pressed before. The directive is a `FormValueControl` of the
rows' ids, so `[formField]` binds it like any field: its error, once touched, its warning
and its hint stand under the table, which they describe, and an error or a warning describes each row's checkbox too, where a reader inside a cell hears it. An id stays picked while the
filter hides its row and when the rows change — the list is the application's, and a press takes out only what it drops. A list
that must not be empty takes `minLength(1)`, because the form's `required()` reads an empty
list as filled. `mode="single"` picks one row with radios.

**The application can take either half back.** `clientSort` and `clientFilter` set to
`false` keep the rows as given, while the headers and the application still write `sort` and
`filter` — the question to send a server that pages, orders and filters.

## Parts

| part          | what it is                                                                      |
| ------------- | ------------------------------------------------------------------------------- |
| `message`     | the sentence beside an empty table, outside the table                           |
| `placeholder` | a row of skeletons standing for rows that are still coming, hidden from readers |
| `place`       | the place and the way of a sort key after the first, drawn for the eye          |
| `mark`        | a word the quick filter found, in a cell it read by its text                    |
| `disclosure`  | the button that opens a row's details, in the leading column                    |
| `details`     | the row of details below a row, the full width of the table                     |
| `group`       | a group's heading, the first row of its body                                    |
| `toggle`      | the first layer's button in a sortable header — see the table's card            |
| `icon`        | its chevron                                                                     |

## Theming

```css
[data-theme='brand'] {
  --pct-table-heading-bg: #ccfbf1;
  --pct-table-border: #99f6e4;
}
```

## Keyboard map

| key                                | effect                                                                 | test                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`                | moves between the sort buttons and the controls in the cells           | `apps/sandbox-e2e/src/datatable.spec.ts` — "Tab moves from the sort buttons into the controls in the cells", and `Shift+Tab` in the next                                                                                                            |
| `Enter` / `Space`                  | sorts by the column as its only key, or turns the first key            | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard sorts by one key, Space turns it, and Shift+Enter adds a second marked by its place"                                                                                                       |
| `Shift+Enter`                      | adds the column as the next key, or turns it where it stands           | the same case                                                                                                                                                                                                                                       |
| `Enter` / `Space` on a disclosure  | opens the row's details, or closes them                                | `apps/sandbox-e2e/src/datatable.spec.ts` — "a narrow table hides the columns of the highest priority, and its details list them"; Tab through them in "Tab goes from a row's disclosure to its controls, into its details, then on to the next row" |
| `Space` on a row's checkbox        | picks the row, or drops it                                             | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard picks a row, Shift with a press picks the rows between, and the header reads clear, mixed and checked"                                                                                     |
| `Shift` with a press on a checkbox | picks, or drops, every row drawn between it and the row pressed before | the same case                                                                                                                                                                                                                                       |
| `Space` on the header's checkbox   | picks every row the filter left, or drops them when all are picked     | the same case                                                                                                                                                                                                                                       |
| `↑` / `↓` among the radios         | moves the one pick, the platform's radio group                         | `apps/sandbox-e2e/src/datatable.spec.ts` — "one rule to copy: radios in one group, the arrows move the pick"                                                                                                                                        |

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/table/src/data-table.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/datatable.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/datatable` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `datatable-devices` and `datatable-devices-rtl`: stripes, numbers, tones and a cut name; the first layer's `table-pattern` holds the rest of the paint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `forced-colors: active` — no state carried by colour alone | the first layer's: the lines `CanvasText`, the focus `Highlight`; the data table adds a check mark, a drawing, and the place of a sort key, a digit. A tone repeats a word of its row, so the tint forced colours drop takes nothing with it, and a marked word takes the system's `Mark` and `MarkText`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `prefers-reduced-motion` — duration from a token           | `libs/components/table/src/data-table.scss` — a changed value's flash lasts eight of `--pct-motion-transition-duration`, which the reduced scope makes `0.01ms`, so a user who asked for less motion sees none; the skeletons of a loading table follow their own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Touch target ≥ 24×24 px outright                           | the first layer's sort button, `libs/components/table/src/header.scss`; the label around a row's checkbox, `apps/sandbox-e2e/src/target-min.spec.ts` — `data table pick`; the controls in cells are the consumer's own components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a cell is not a control, as the first layer's card says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Density axis                                               | the first layer's padding on `space.3` and `space.4`, re-pointed by the compact scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot is the first layer's `table-pattern-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/datatable` in `SBX_ROUTES`; the scroll listener and the observer start after render                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Forms                                                      | `pctTableSelection` is the table's one control: `[formField]` binds its value and its state, `libs/components/table/src/data-table-selection.spec.ts` — "a field of a form"; `apps/sandbox-e2e/src/datatable.spec.ts` — the error once touched, the warning that lets the form through                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `message`, `placeholder`, `place`, `mark`, `disclosure`, `details`, `group`, `select`, `select-all`, `error`, `warning`, `hint`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/component.table.json` — the rows' surfaces, the tones, the mark; `libs/tokens/src/contrast.policy.json` — a cell's text on each surface, each tone's pair, the rows' numbers and the mark, a picked row under the pointer and without it, the selection's three lines on the page's surface                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `tableEmpty`, `tableNoMatches`, `tableLoading`, `tableYes`, `tableNo`, `tableRowNumber`, `tableSortLater`, `tableSortAscending`, `tableSortDescending`, `tableDetails`, `tableDetailsOpen`, `tableDetailsClose`, `tableGroupCount`, `tableTotal`, `tableSelectAll`, `tableSelectRow`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./table` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Screen-reader log                                          | Read 2026-10-30 from `docs/acr/at/` — three readers, whole sandbox. **The table is a table under all three**: Orca enters it by its shape, `table with 21 rows 6 columns · column header. · row 1. · column 1 · Name · button.`; VoiceOver says the sort button, `Room button`; NVDA reads it as its header, `Room, column header, row 1, column 2`, with no role word, as on the first layer. **A control in a cell is read with its row and its column**: NVDA `Enabled: Supply fan, row 2, Enabled, column 6`, Orca `row 3. · Enabled: Heater · switch not pressed.`, VoiceOver `Enabled: Supply fan on switch`. **A table given a height is a named stop**, because its frame scrolls: NVDA `Polling rules, region`, VoiceOver `Polling rules region`, Orca `Polling rules. · clickable. · Browse mode`. The press, the filter and the empty sentence are not walked: the e2e suite reads them |
| A docs page with live examples                             | `apps/sandbox/src/app/views/datatable/` (the sandbox view). The published site: `/components/datatable`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Unit + mutation                                            | `libs/components/table/src/data-table.spec.ts`, `libs/components/table/src/data-table-selection.spec.ts`, the engine's specs in `libs/components/table/src/model/`; `libs/components/mutation.snapshot.md` — measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Decisions this component implements

[0097](../decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)
(the main one — one typed engine, templates by column id, the native table, the order as a
list, the three roads of data),
[0098](../decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)
(above 8,000 cells, a window — not built yet),
[0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) (the first
layer it renders), [0037](../decisions/0037-loading-is-a-fact-about-the-list.md) (loading is a
fact about the list), [0027](../decisions/0027-a-slot-is-a-directive.md) (a slot is a
directive).

## Known limitations

- **No window yet.** Every row is in the DOM, which 0098 measured as fluent up to 8,000 cells
  — a thousand rows of eight columns. A longer list waits for the window.
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
