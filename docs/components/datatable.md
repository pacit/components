# `PctDataTable` — a table built from data

**Summary:** A table drawn from your rows and a typed list of columns: sorting by one key or several, a quick filter over what the cells show, and the empty and loading states, in the look of the platform table.
**Entrypoint:** `@pacit/components/table`
**Selectors:** `pct-data-table`, `ng-template[pctCell]`, `ng-template[pctHeaderCell]`, `ng-template[pctEmpty]`
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

|             |                                                                                                                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `sort`: a list of `PctTableSort` keyed by the columns' ids, the first deciding first; `filter`: the quick filter's question                                                                                                                                                                                         |
| **Inputs**  | `columns` and `rowId` (required), `rows` (`[]` until bound), `caption`, `ariaLabelledby`, `unsortable`, `clientSort`, `clientFilter`, `filterWith`, `loading`, `locale`, `now`, `stickyHeader`, `striped`, `rowNumbers`, `rowTone`, `highlightMatches`, `highlightChanges`                                          |
| **Outputs** | `sortChange` and `filterChange` (the models'); read-only signals `matched`, `lines`, `scrolled` and `visible`; methods `scrollTo(id, { align })` and `reveal(id)`                                                                                                                                                   |
| **Slots**   | `ng-template[pctCell]` (a cell, by column id or a list of ids), `ng-template[pctHeaderCell]` (what stands in a header's label), `ng-template[pctEmpty]` (what stands for the empty table's sentence)                                                                                                                |
| **Parts**   | `message` (the sentence beside an empty table), `placeholder` (a row standing for rows still coming), `place` (the place of a sort key after the first), `mark` (a word the quick filter found)                                                                                                                     |
| **Harness** | `PctDataTableHarness` — the parts, and `headers()`, `rows()`, `cell(row, header)`, `sortBy(header, { shift })`                                                                                                                                                                                                      |
| **Tokens**  | the first layer's `--pct-table-*` tier, and the data table's rows: `bg-hover`, `bg-striped`, `bg-changed`, the four tones' `bg-*` and `fg-*`, `fg-muted` (the rows' numbers), `column-max-width`, `mark-bg`, `mark-fg`                                                                                              |
| **Strings** | `tableEmpty`, `tableNoMatches`, `tableLoading` (the three sentences an empty table says), `tableYes`, `tableNo` (how a boolean cell is read and searched), `tableRowNumber` (the header of the rows' numbers), `tableSortKey`, `tableSortAscending`, `tableSortDescending` (a later sort key, as a reader hears it) |

**Typed by its columns.** A list built with `pctColumnsOf<T>()` carries every id and the type
of every value. A cell template names its column with `pctCellOf` beside the list, so
`let-value` has the column's type and a misspelt id is the compiler's error, not the user's.
A kind the value cannot take — a number kind on text — is refused the same way. A literal
array of columns compiles too, and its templates are not checked against the ids.

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

| key                 | effect                                                       | test                                                                                                                                          |
| ------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves between the sort buttons and the controls in the cells | `apps/sandbox-e2e/src/datatable.spec.ts` — "Tab moves from the sort buttons into the controls in the cells", and `Shift+Tab` in the next      |
| `Enter` / `Space`   | sorts by the column as its only key, or turns the first key  | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard sorts by one key, Space turns it, and Shift+Enter adds a second marked by its place" |
| `Shift+Enter`       | adds the column as the next key, or turns it where it stands | the same case                                                                                                                                 |

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
| Touch target ≥ 24×24 px outright                           | the first layer's sort button, `libs/components/table/src/header.scss`; the controls in cells are the consumer's own components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a cell is not a control, as the first layer's card says                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Density axis                                               | the first layer's padding on `space.3` and `space.4`, re-pointed by the compact scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot is the first layer's `table-pattern-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/datatable` in `SBX_ROUTES`; the scroll listener and the observer start after render                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Forms                                                      | not applicable — the selection, the one value a form will own, arrives as a control of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `message`, `placeholder`, `place`, `mark`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/component.table.json` — the rows' surfaces, the tones, the mark; `libs/tokens/src/contrast.policy.json` — a cell's text on each surface, each tone's pair, the rows' numbers and the mark                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `tableEmpty`, `tableNoMatches`, `tableLoading`, `tableYes`, `tableNo`, `tableRowNumber`, `tableSortKey`, `tableSortAscending`, `tableSortDescending`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./table` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Screen-reader log                                          | Read 2026-10-30 from `docs/acr/at/` — three readers, whole sandbox. **The table is a table under all three**: Orca enters it by its shape, `table with 21 rows 6 columns · column header. · row 1. · column 1 · Name · button.`; VoiceOver says the sort button, `Room button`; NVDA reads it as its header, `Room, column header, row 1, column 2`, with no role word, as on the first layer. **A control in a cell is read with its row and its column**: NVDA `Enabled: Supply fan, row 2, Enabled, column 6`, Orca `row 3. · Enabled: Heater · switch not pressed.`, VoiceOver `Enabled: Supply fan on switch`. **A table given a height is a named stop**, because its frame scrolls: NVDA `Polling rules, region`, VoiceOver `Polling rules region`, Orca `Polling rules. · clickable. · Browse mode`. The press, the filter and the empty sentence are not walked: the e2e suite reads them |
| A docs page with live examples                             | `apps/sandbox/src/app/views/datatable/` (the sandbox view). The published site: `/components/datatable`, its demos' source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Unit + mutation                                            | `libs/components/table/src/data-table.spec.ts`, the engine's specs in `libs/components/table/src/model/`; `libs/components/mutation.snapshot.md` — measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

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
- **NVDA does not say the sort is a control**, as the first layer's card records for the same
  button: `Room, column header, row 1, column 2` in the walk of 2026-10-30.
