## 0.3.0 (2026-11-03)

### Features

- **frame:** pct-topbar, pct-nav and pct-description-list — an application's frame (1.10, 0110) ([#185](https://github.com/pacit/components/pull/185))
- **card:** pct-card — a header, a body and a footer, one link by its title (1.9, 0109) ([#184](https://github.com/pacit/components/pull/184))
- **table:** pctTableEditing — a cell edited in place, by a draft the table never applies (0097, phase 10, 0108) ([#183](https://github.com/pacit/components/pull/183))
- **table:** pctTableGrid — one tab stop moved over the cells, a lone control as its cell (0097, phase 9, 0107) ([#180](https://github.com/pacit/components/pull/180))
- **table:** pctTableColumns — the columns as the user lays them out: widths, order, pins, hidden, and a chooser (0097, phase 8) ([#179](https://github.com/pacit/components/pull/179))
- **table:** pctTableColumnFilters — each column's own filter, in a panel its header opens or a row under the headers (0097, phase 7) ([#178](https://github.com/pacit/components/pull/178))
- **chart:** pct-area, pct-range, pct-box — an area on its stack, a range or candles, a box plot, and a monotone curve (1.11, phase 10, 0106) ([#177](https://github.com/pacit/components/pull/177))
- **table:** pctTableRemote — rows from a server a block at a time, as the view reaches them (0097, phase 3b) ([#176](https://github.com/pacit/components/pull/176))
- **chart:** pct-points — points and bubbles picked by distance, a zoom on both axes, a log axis of decades (1.11, phase 9, 0105) ([#175](https://github.com/pacit/components/pull/175))
- **table:** pctTablePage — a page of more rows, each told its place among all of them (0097, phase 3b) ([#174](https://github.com/pacit/components/pull/174))
- **table:** pctTableWindow — the lines in view, measured, and the space of the rest (0098) ([#173](https://github.com/pacit/components/pull/173))
- **chart:** pct-band — a band of states in a lane the scene lends, or a chart of its own (1.11, phase 8, 0104) ([#172](https://github.com/pacit/components/pull/172))
- **chart:** annotations — a reference line, a band, a note, the moment of now, a line cut by its thresholds (1.11, phase 7) ([#171](https://github.com/pacit/components/pull/171))
- **chart:** the chart turned on its side — orientation, bars that lie, lines that run down (1.11, phase 6b) ([#169](https://github.com/pacit/components/pull/169))
- **table:** pctTableSelection — the rows picked, as a field of a form (0097) ([#167](https://github.com/pacit/components/pull/167))
- **chart:** bars — bands of calendar intervals or categories, groups, stacks, a period compared by position, a selected band and a picked row (1.11, phase 6) ([#168](https://github.com/pacit/components/pull/168))
- **chart:** the legend and the second channel — swatches by the marks, dashes and markers, a list of toggles ([#166](https://github.com/pacit/components/pull/166))
- **table:** groups as bodies headed by rowgroup headers, and columns summed up (0097) ([#165](https://github.com/pacit/components/pull/165))
- **chart:** the window — gestures, keys, the wheel, follow, the zoom bar and pctChartSync ([#163](https://github.com/pacit/components/pull/163))
- **table:** a row's details, and columns that give way on a narrow frame (0097) ([#164](https://github.com/pacit/components/pull/164))
- **chart:** the cursor — the platform's range, the pointer, the keys and a tooltip ([#161](https://github.com/pacit/components/pull/161))
- **table:** the data table's harness, a later sort key a reader hears, the slots' types in a consumer's build (0097) ([#162](https://github.com/pacit/components/pull/162))
- **table:** rows that say more — stripes, numbers, tones, cut cells, marked matches, flashes (0097) ([#160](https://github.com/pacit/components/pull/160))
- **chart:** pct-chart, pct-line, pct-axis and pct-chart-table — the scene, its line and its table ([#159](https://github.com/pacit/components/pull/159))
- **table:** pct-data-table v1 — typed slots, an order of keys, the quick filter, empty and loading states (0097) ([#158](https://github.com/pacit/components/pull/158))
- **chart:** the arithmetic of a chart — scales, ticks in a zone, the window, decimation to the pixel ([#157](https://github.com/pacit/components/pull/157))
- **table:** the data table's pure engine — typed columns, order, quick filter, lines, window (0097) ([#156](https://github.com/pacit/components/pull/156))
- **table:** the platform table, dressed element by element (0096) ([#153](https://github.com/pacit/components/pull/153))
- **core:** a number with its unit, and an instant read as a wall clock in a zone and back ([#152](https://github.com/pacit/components/pull/152))
- **datetime:** a signal form's bounds reach the field through the platform's limit key ([#97](https://github.com/pacit/components/pull/97))
- **date,time:** a signal form's bounds reach the field through the platform's limit key ([#96](https://github.com/pacit/components/pull/96))
- **datetime:** the datetime field — two texts under one label, one panel (1.4, 0090) ([#75](https://github.com/pacit/components/pull/75))
- **time:** the time field and its columns — text the locale writes, a listbox per field (1.3, 0086) ([#71](https://github.com/pacit/components/pull/71))
- **field:** warnings on a field — a verdict without a veto (1.5, 0087) ([#65](https://github.com/pacit/components/pull/65))
- **time:** the value module of the time field — PctTimeOfDay, its arithmetic and pctTimeFormat ([#60](https://github.com/pacit/components/pull/60))
- **button:** `iconOnly` — a square around one glyph, a floor under both axes, and the name written on the button ([#57](https://github.com/pacit/components/pull/57))
- **icon:** a font's `roles` takes a list of the roles to dress — `[]` for none, `['chevron-down']` for the arrow alone ([#55](https://github.com/pacit/components/pull/55))
- **icon:** a source answers an id with data, the box renders it, and one line dresses the library ([#52](https://github.com/pacit/components/pull/52))
- **tools:** a target whose script asks git for its index hashes the index, held by check-tools point 6 ([#47](https://github.com/pacit/components/pull/47))

### Fixes

- **table:** pctTableRemote scrolls no frame on a server ([#182](https://github.com/pacit/components/pull/182))
- **gates:** a runner that stops reporting a case that passed, fired another check or rule, or broke what it declares is reported, in every gate ([#142](https://github.com/pacit/components/pull/142))
- **gates:** a runner that stops holding a case to what it pins is reported, by a control of its own in each of the eleven gates that pin ([#140](https://github.com/pacit/components/pull/140))
- **texts:** an array of consts is an attribute only where an instruction takes it as a node's, and an attr. binding to ariaLabel is no ARIA ([#137](https://github.com/pacit/components/pull/137))
- **bundle:** a tag of a multi-tag entrypoint is the component object it exports, under its own name ([#133](https://github.com/pacit/components/pull/133))
- **gates:** a scan reads what it forbids in every spelling Angular and the engines take, and three package reads share one pair reader ([#127](https://github.com/pacit/components/pull/127))
- **gates:** five more gates read a decorator as ngc reads it, through one module, and a spelling a pattern missed fails their own point ([#121](https://github.com/pacit/components/pull/121))
- **gates:** a base is the class TypeScript binds its name to, classes are keyed by name and file, and a shared decorated name stops the package comparison ([#115](https://github.com/pacit/components/pull/115))
- ⚠️ **forms:** a control's reset takes back what the form cannot see, and the value stays the form's ([#95](https://github.com/pacit/components/pull/95))
- **number:** a reset after junk empties the input ([#94](https://github.com/pacit/components/pull/94))
- **date:** a reset after junk empties the input, and classic forms bind without a warning ([#93](https://github.com/pacit/components/pull/93))
- **mutation:** a spec file that fails outside its tests is one failed test, under either runner ([#67](https://github.com/pacit/components/pull/67))
- **field:** the fallbacks firefox 155 outgrew stay for the engines Angular supports, forced in e2e ([#53](https://github.com/pacit/components/pull/53))
- **release:** the release commit gets its own CI, and every rendering that reads the version is written before it ([f210d78d](https://github.com/pacit/components/commit/f210d78d))

### Performance

- **table:** the selection is drawn by parts of its own, so a table that picks nothing carries none of it (0097) ([#170](https://github.com/pacit/components/pull/170))
- **mutation:** the specs beside the mutated file run first, and texts.ts gets one ([#70](https://github.com/pacit/components/pull/70))

### Refactoring

- **date:** the week table moves into the function that reads it — a mutant that broke the import was recorded as a survivor ([#64](https://github.com/pacit/components/pull/64))
- **mutation:** the literals a function reads move into it — static mutants 411 to 155 ([#61](https://github.com/pacit/components/pull/61))

### Documentation

- **bundle:** a snapshot number in prose is told with its date, or left to the row that holds it ([#136](https://github.com/pacit/components/pull/136))

### ⚠️ Breaking Changes

- **forms:** a control's reset takes back what the form cannot see, and the value stays the form's ([#95](https://github.com/pacit/components/pull/95))
  a form control's `reset()` no longer empties its value. A signal form's
  `reset()` keeps the values it holds, as Angular documents, and `reset(value)` shows the value it
  is given; to empty a form, reset it with the empty model — `form().reset({ seats: null })`.
  A direct `ctrl.reset()` takes back only the control's own state. `emptyValue` on
  `pct-radio-group` is read by nothing and deprecated.

## 0.2.0 (2026-09-25)

### Features

- ⚠️ **badge:** the tone is the library's four, and the absence is the neutral ([#13](https://github.com/pacit/components/pull/13), [#9](https://github.com/pacit/components/issues/9))
- **button:** a tone is a colour the button wears, and every wearing is measured ([#9](https://github.com/pacit/components/pull/9))
- **api:** what can stop being public does, and everything public says what it is ([352aee2](https://github.com/pacit/components/commit/352aee2))
- **api:** the public methods say since when too ([5ffc3ff](https://github.com/pacit/components/commit/5ffc3ff))
- **api:** every public API says since when, and the release names what was next ([ba39abc](https://github.com/pacit/components/commit/ba39abc))

### Fixes

- **release:** the rehearsal's gate says the undated `next` as a warning, and the release as a refusal ([dcf6960](https://github.com/pacit/components/commit/dcf6960))
- **mutation:** the spec the run never selects, and the sentences that explained it wrongly ([#15](https://github.com/pacit/components/pull/15), [#14](https://github.com/pacit/components/issues/14))
- **mutation:** the four equivalent-mutant excuses follow their lines ([4ce1789](https://github.com/pacit/components/commit/4ce1789))
- **release:** the release commit carries the manifest and the stamp ([e649f1f](https://github.com/pacit/components/commit/e649f1f))

### Refactoring

- **select:** the filter predicates leave the types file, and a types file holds types alone ([#22](https://github.com/pacit/components/pull/22))
- **schematics:** the migration calls Angular's parser instead of imitating it ([#15](https://github.com/pacit/components/issues/15), [#110](https://github.com/pacit/components/issues/110))

### ⚠️ Breaking Changes

- **badge:** the tone is the library's four, and the absence is the neutral ([#13](https://github.com/pacit/components/pull/13), [#9](https://github.com/pacit/components/issues/9))
  `PctBadgeTone` is gone and `tone` takes `PctTone | null`,
  default `null`. `tone="neutral"` no longer compiles — a badge with no tone takes
  no `tone` at all — and an untoned badge no longer carries `data-pct-tone` at all,
  where it used to say `neutral`. A stylesheet or a test keyed on
  `[data-pct-tone='neutral']` stops matching: the library's own unit suite had two
  such assertions and this commit rewrites them, and the `ng update` migration
  removes the attribute from templates — but neither can see a consumer's
  selectors, which is why this stands in the footer.
  Not one pixel moves. The old sheet had no `[data-pct-tone='neutral']` rule, so
  that attribute carried no paint and the base tokens on `:host` were the neutral
  all along.
  `PctBadgeTone` named the skin's missing ramps as its condition for growing (0053).
  The ramps landed with the button's tone axis (0082), so the list is spent rather
  than widened: two vocabularies for one idea is the state 0076 exists to end, and
  deleting the union is the honest version of that news — every consumer who wrote
  the type down sees it at compile time instead of learning later that their
  `'neutral'` quietly means something else.
  `neutral` is refused as a member and granted as an absence. A union member
  meaning "none of the above" makes every consumer write it.
  Two things chosen rather than fallen into:
  - **`import type`.** `PctTone` comes in type-only, so the build erases it and
    `./badge` still reaches for no other entrypoint — the internal-deps column of
    `size.snapshot.md` stays `-`. The row moves on its own bytes, 1706 to 2229,
    which is the three extra tone rules in the stylesheet.
  - **The tone rules assign tokens and paint nothing.** Each one sets
    `--pct-badge-bg`/`-fg`/`-border` and declares no `color` and no `border-color`,
    so they never enter the cascade for the two properties the forced-colours block
    paints. That is why one `:host` rule inside the media block is enough here,
    where the button had to repeat all four of its selectors (lesson-70): the
    button's faces paint those properties directly, at a specificity that wins.

## 0.1.0 (2026-09-17)

The first public release of `@pacit/components`: **34 components** for Angular,
standalone and zoneless, on signal forms, rendering on the server, themed through design
tokens — where every promise is held by a gate that runs on every commit.

- 93 features and 24 fixes since the first commit, 12 of them breaking on the way to this shape
- 30 gates, each with a negative control that proves it can fail — the registry of promise → gate → control is [the trust page](https://components.pacit.pl/trust/)
- every component with its live demos, API, parts, tokens and keyboard map: [https://components.pacit.pl/components/](https://components.pacit.pl/components/)
- install: `npm install @pacit/components`, then `ng add @pacit/components` — [get started](https://components.pacit.pl/start/)
