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

|             |                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `sort`: a list of `PctTableSort` keyed by the columns' ids, the first deciding first; `filter`: the quick filter's question                                                                          |
| **Inputs**  | `rows`, `columns` and `rowId` (required), `caption`, `ariaLabelledby`, `unsortable`, `clientSort`, `clientFilter`, `filterWith`, `loading`, `locale`, `now`, `stickyHeader`                          |
| **Outputs** | `sortChange` and `filterChange` (the models'); read-only signals `matched`, `lines`, `scrolled` and `visible`; methods `scrollTo(id, align?)` and `reveal(id)`                                       |
| **Slots**   | `ng-template[pctCell]` (a cell, by column id or a list of ids), `ng-template[pctHeaderCell]` (what stands in a header's label), `ng-template[pctEmpty]` (what stands for the empty table's sentence) |
| **Parts**   | `message` (the sentence beside an empty table), `placeholder` (a row standing for rows still coming)                                                                                                 |
| **Harness** | `PctDataTableHarness`                                                                                                                                                                                |
| **Tokens**  | the first layer's `--pct-table-*` tier; the data table adds none                                                                                                                                     |
| **Strings** | `tableEmpty`, `tableNoMatches`, `tableLoading` (the three sentences an empty table says), `tableYes`, `tableNo` (how a boolean cell is read and searched)                                            |

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

**The application can take either half back.** `clientSort` and `clientFilter` set to
`false` keep the rows as given, while the headers and the application still write `sort` and
`filter` — the question to send a server that pages, orders and filters.

## Parts

| part          | what it is                                                 |
| ------------- | ---------------------------------------------------------- |
| `message`     | the sentence beside an empty table, outside the table      |
| `placeholder` | a row of skeletons standing for rows that are still coming |

## Theming

```css
[data-theme='brand'] {
  --pct-table-heading-bg: #ccfbf1;
  --pct-table-border: #99f6e4;
}
```

## Keyboard map

| key                 | effect                                                       | test                                                                                                                    |
| ------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves between the sort buttons and the controls in the cells | `apps/sandbox-e2e/src/datatable.spec.ts` — "a switch in a cell toggles its row and sorts nothing"                       |
| `Enter` / `Space`   | sorts by the column as its only key, or turns it             | `apps/sandbox-e2e/src/datatable.spec.ts` — "the keyboard sorts by one key, and Shift adds a second marked by its place" |
| `Shift+Enter`       | adds the column as the next key, or turns it where it stands | the same case                                                                                                           |

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA pattern named in the class JSDoc                      | `libs/components/table/src/data-table.ts`                                                                                                                                   |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/datatable.spec.ts`                                                                                            |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/datatable` in `SBX_ROUTES`                                                                                                          |
| Visual screenshot                                          | none — gap: the first layer's baselines `table-pattern` and `table-pattern-rtl` hold the paint the data table renders; one of its own arrives with the details row          |
| `forced-colors: active` — no state carried by colour alone | the first layer's: the lines `CanvasText`, the focus `Highlight`; the data table adds a check mark, a drawing, and the place of a sort key, a digit                         |
| `prefers-reduced-motion` — duration from a token           | not applicable — the data table moves nothing; the skeletons of a loading table follow their own                                                                            |
| Touch target ≥ 24×24 px outright                           | the first layer's sort button, `libs/components/table/src/header.scss`; the controls in cells are the consumer's own components                                             |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a cell is not a control, as the first layer's card says                                                                                                   |
| Density axis                                               | the first layer's padding on `space.3` and `space.4`, re-pointed by the compact scope                                                                                       |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot is the first layer's `table-pattern-rtl`                                                                    |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/datatable` in `SBX_ROUTES`; the scroll listener and the observer start after render                                            |
| Forms                                                      | not applicable — the selection, the one value a form will own, arrives as a control of its own                                                                              |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `message`, `placeholder`                                                                                                              |
| Tokens registered + an entry in `contrast.policy.json`     | not applicable — the data table adds no token; the first layer's seven pairs hold its paint                                                                                 |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `tableEmpty`, `tableNoMatches`, `tableLoading`, `tableYes`, `tableNo`                                                                 |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./table` row                                                                                                                      |
| Screen-reader log                                          | none — gap: no readers' walk of `/datatable` yet; the first layer's walk of 2026-10-29 reads the same elements, sort buttons included                                       |
| A docs page with live examples                             | `apps/sandbox/src/app/views/datatable/` (the sandbox view). The published site: `/components/datatable`, its demos' source in the code tab                                  |
| Unit + mutation                                            | `libs/components/table/src/data-table.spec.ts`, the engine's specs in `libs/components/table/src/model/`; `libs/components/mutation.snapshot.md` — measured by a narrow run |

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
- **A reader hears the first sort key only.** `aria-sort` stands on one header at a time, as
  ARIA asks; the place of a key after the first is a digit drawn for the eye.
- **The sticky header needs a height.** The header row stays at the top of a table given a
  block size, where its frame scrolls; a table the page scrolls has no box to stick to.
- **A cell template does not change what is searched.** The quick filter reads the text the
  column's kind writes, whatever the template draws in its place.
- **`now` is read once per change.** A relative column counts from the clock when its rows or
  columns change; an application that wants `in 5 minutes` to tick binds a clock of its own.
- **NVDA does not say the sort is a control**, as the first layer's card records for the same
  button.
