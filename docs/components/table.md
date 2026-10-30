# `PctTable` — the platform table, dressed element by element

**Summary:** A table you write yourself, in the platform's own markup, with the library's look, sortable headers and a frame that scrolls a table wider than its space.
**Entrypoint:** `@pacit/components/table`
**Selectors:** `table[pctTable]`, `caption[pctCaption]`, `th[pctHeader]`, `td[pctCell]`, `pct-table-frame`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** a native `<table>` — sorting as the APG's
[sortable table](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
draws it: a button in each sortable header, and `aria-sort` on the sorted column's header
alone. Named in the class JSDoc.

**The rows are the consumer's; the look is the library's.** The table, its caption, its
header cells and its cells are the platform's elements written in the consumer's template,
and each one the paint needs wears a component of its own, because projected content keeps
the encapsulation of the template that declared it
([0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md)). Nothing
here generates a row. A table built from data, with a filter, groups and a window over a
thousand rows, is the next layer, `pct-data-table`, which renders this one.

## Usage

```html
<table pctTable>
  <caption pctCaption>
    Devices
  </caption>
  <thead>
    <tr>
      <th pctHeader scope="col">Device</th>
      <th pctHeader scope="col" numeric>Power</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td pctCell>Heater</td>
      <td pctCell numeric>2.4</td>
    </tr>
  </tbody>
</table>
```

## Contract

|             |                                                                                                                                                                                                 |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**   | `sort` on `table[pctTable]`: a `PctTableSort` (`key`, `direction`), or `null` while the rows stand in their own order                                                                           |
| **Inputs**  | `sortKey`, `numeric`, `ariaLabel`, `ariaLabelledby` and `description` (on the sort button) on `th[pctHeader]`; `numeric` on `td[pctCell]`; `id` on `caption[pctCaption]` (generated when unset) |
| **Outputs** | `sortChange` (the model's): a header's press proposes the next order, and the consumer puts the rows in it                                                                                      |
| **Slots**   | the consumer's own `<caption>`, `<thead>`, `<tbody>` and cells; the frame's table                                                                                                               |
| **Parts**   | `toggle` (the button in a sortable header), `icon` (its chevron)                                                                                                                                |
| **Harness** | `PctTableHarness`, `PctTableCaptionHarness`, `PctTableHeaderHarness`, `PctTableCellHarness`, `PctTableFrameHarness`                                                                             |
| **Tokens**  | the `--pct-table-*` prefix plus seven entries in `contrast.policy.json`                                                                                                                         |
| **Strings** | none — every word in a table is the consumer's, and the frame is named by the caption                                                                                                           |

**The sort is a proposal.** A header with a `sortKey` writes `sort` when pressed: a column not
yet sorted starts ascending, the sorted one turns the other way. The table orders nothing.
Bind `[(sort)]` and order the rows from it, which is also what lets an application keep the
order in its URL.

**The frame is a region only while it scrolls.** `pct-table-frame` measures its table with a
`ResizeObserver`. While the table is wider than the frame, or taller than a height the frame
is given, the frame is `role="region"` with a
tab stop and the caption's id as its name, so a keyboard can reach it and a reader can say
what it holds. While the table fits, it writes none of the three.

## Parts

| part          | what it is                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| `toggle`      | the button that fills a sortable header cell                                |
| `icon`        | the chevron beside a sortable header's label                                |
| `mark`        | the data table's word the quick filter found                                |
| `message`     | the data table's sentence beside an empty table — see the data table's card |
| `place`       | the data table's place of a sort key after the first                        |
| `placeholder` | the data table's row standing for rows still coming                         |

## Theming

```css
[data-theme='brand'] {
  --pct-table-heading-bg: #ccfbf1;
  --pct-table-heading-border: #0f766e;
  --pct-table-border: #99f6e4;
}
```

## Keyboard map

| key                 | effect                                                     | test                                                                                                                        |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | moves between the sort buttons, and onto a scrolling frame | `apps/sandbox-e2e/src/table.spec.ts` — "an overflowing frame is a region named by the caption, and the keyboard scrolls it" |
| `Enter` / `Space`   | sorts by the column, or turns its order                    | `apps/sandbox-e2e/src/table.spec.ts` — "the keyboard sorts: Enter sorts ascending, Space turns it"                          |
| `←` / `→`           | scrolls a focused frame along the inline axis              | `apps/sandbox-e2e/src/table.spec.ts` — the same case as `Tab`; the scrolling is the platform's                              |

There are no handlers to map: the sort buttons are buttons and the frame is a scrolling box,
and both answer the keyboard on their own.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARIA pattern named in the class JSDoc                      | `libs/components/table/src/table.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Keyboard map tested key by key                             | the table above — every row measured in `apps/sandbox-e2e/src/table.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/table` in `SBX_ROUTES`, the overflowing frame included                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Visual screenshot                                          | `apps/sandbox-e2e/src/visual.spec.ts` — `table-pattern` and `table-pattern-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `forced-colors: active` — no state carried by colour alone | `libs/components/table/src/header.scss`, `cell.scss`, `frame.scss` — the lines `CanvasText`, the focus `Highlight`; the sorted column keeps its chevron, a drawing. The reading: `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Touch target ≥ 24×24 px outright                           | `libs/components/table/src/header.scss` — `min-block-size: var(--pct-table-toggle-target-min)` on the sort button, which fills its cell; measured in `apps/sandbox-e2e/src/target-min.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a cell is not a control, and a table is sized by its type and the spacing scale, as the badge is by its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Density axis                                               | `libs/tokens/src/component.table.json` — the padding stands on `space.3` and `space.4`, which the compact scope re-points; the sort button in `apps/sandbox-e2e/src/density.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; the screenshot `table-pattern-rtl`, where the caption and the text move to the right and the numbers to the left                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/table` in `SBX_ROUTES`; the frame measures after render, so the server writes no region                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Forms                                                      | not applicable — a table holds no value a form owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md` — `toggle`, `icon`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — seven entries: the text of a cell, the caption and a header cell (AA error), the sort hint's chevron (UI error), the header surface and both lines (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Strings through `PCT_TEXTS`                                | not applicable — the component writes no word of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./table` row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Screen-reader log                                          | Read 2026-10-29 from `docs/acr/at/` — three readers, whole sandbox. **Each reader says part of a sort header**: Orca both the header and the button, entering the table by its shape, `table with 5 rows 3 columns · column header. · row 1. · column 1 · Name · button.`, then `column header. · column 2 · Address · button.`; NVDA the header alone, `Address, column header, row 1, column 2`, so under NVDA the sort is not announced as a control; VoiceOver the button alone, `Address button`. **The overflowing frame is a named stop**: NVDA `Registers, region`, VoiceOver `main Registers region`, Orca `Registers. · clickable.` — the name under all three, the role word under two. The press itself is not walked: `aria-sort` after a press is read by the e2e suite, not by a reader |
| A docs page with live examples                             | `apps/sandbox/src/app/views/table/` (the sandbox view). The published site: `/components/table`, its demo's source in the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Unit + mutation                                            | `libs/components/table/src/table.spec.ts`; `libs/components/mutation.snapshot.md` — `table.ts`, measured by a narrow run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## Decisions this component implements

[0096](../decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md) (the main
one — two layers by who writes the rows, the dressing element by element, the sort as a
proposal, the frame that is a region only while it scrolls),
[0095](../decisions/0095-every-component-is-mit-and-the-order-is-what-a-consumer-needs.md)
(why the table is built now),
[0054](../decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md) (a component on the
consumer's own element),
[0048](../decisions/0048-a-pagination-owns-its-page-number.md) (a component that proposes and
an application that turns).

## Known limitations

- **Every dressed cell carries an attribute.** A `<td>` without `pctCell` keeps the browser's
  look. The cost is the one Angular Material's `mat-cell` asks, and it is what keeps every
  rule inside the component that owns it.
- **No zebra, hover or selected row.** Each would need a component on every `<tr>`, which this
  layer does not dress, and a selected row is a fact about data, which is the data table's.
- **A row header needs `scope="row"`.** The header cell keys its row look on the attribute, so a
  `<th pctHeader>` in the body without it wears the column header's surface. Write it anyway: it states the row header outright rather than leaving it to each engine's guess.
- **The frame keeps a static `aria-labelledby` only.** It reads the consumer's attribute once and
  falls back to it where no caption names the region; a `role` or a `tabindex` written on the frame is dropped at the first change detection, and the frame writes its own only while the table overflows.
- **The rows are not sorted for you.** The headers propose and the consumer orders; the data
  table orders its own rows.
- **NVDA does not say the sort is a control.** In the walk of 2026-10-29 NVDA with Firefox read
  a focused sort button as its column header, `Address, column header, row 1, column 2`, with
  no role word, where Orca and VoiceOver say `button`. The element is a `<button>` and Enter and
  Space press it; whether the header owes NVDA a description is for the next walk to measure.
- **No sticky header.** A header that sticks to the frame's top would stick to a box that
  does not scroll vertically, which is no help; the page's own scroll is the consumer's.
