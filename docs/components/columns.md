# `PctTimeColumns` — time columns

**Summary:** A time of day as columns of hours and minutes, standing on the page rather than folded into a panel.
**Entrypoint:** `@pacit/components/time`
**Selector:** `pct-time-columns`
**Status:** released
**Category:** Choices
**ARIA APG pattern:** [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) — one per
column, each a single tab stop pointing at its row with `aria-activedescendant`

It ships in the `time` entrypoint and is a component of its own rather than a private half of
[`PctTime`](./time.md), for the reason `PctCalendar` is one: **the datetime field's panel is one
dialog holding a calendar and these columns**, so they are the part it composes, and columns
that lived only inside the time field would be built twice
([0086](../decisions/0086-a-time-of-day-is-a-wall-clock.md) §4).

## Usage

```html
<pct-time-columns [(value)]="time" ariaLabel="Meeting time" />
```

## Contract

|                 |                                                                                                                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `PctTimeOfDay \| null` through `value` (`model`) — `HH:mm`, or `HH:mm:ss` where the step has seconds ([0086](../decisions/0086-a-time-of-day-is-a-wall-clock.md))                                                                                                      |
| **Inputs**      | `value` (`model`), `min`, `max`, `step`, `disabled`, `locale`, `size`, `ariaLabel`, `ariaLabelledby`                                                                                                                                                                   |
| **Outputs**     | `timePicked` — `Enter` or `Space` in a column, a time chosen **by the user**. Every movement writes the value; only this closes a panel                                                                                                                                |
| **Columns**     | hours and minutes; seconds where the step has them; the two halves of the day where the clock has twelve hours — in the order the language writes them, so the day period stands before the hour in Korean and Japanese                                                |
| **Bounds**      | the step decides which rows EXIST — `step="900"` lists the minutes `00 15 30 45`, counted from `min` — and the bounds which of them can be TAKEN: a refused row is drawn, `aria-disabled`, and skipped by the walk. `min` later than `max` is a window across midnight |
| **Naming**      | each column is named from `PCT_TEXTS`; `ariaLabel` / `ariaLabelledby` name the `role="group"` they stand in, and a panel that owns them names itself instead                                                                                                           |
| **Parts**       | `column`, `option`                                                                                                                                                                                                                                                     |
| **Harness**     | `PctTimeColumnsHarness`                                                                                                                                                                                                                                                |
| **Tokens**      | `--pct-time-*` — the same tier as the field, because a token name carries the ENTRYPOINT                                                                                                                                                                               |
| **Strings**     | `timeHours`, `timeMinutes`, `timeSeconds`, `timePeriod` — the columns' names, through `PCT_TEXTS`. The digits and the day-period words come from `Intl`, off the formatter the field writes with, and are nobody's to translate                                        |
| **DI contract** | `PCT_CONFIG`, `PCT_TEXTS`, `LOCALE_ID`                                                                                                                                                                                                                                 |

**A column is a field, not a cursor over a list.** The row the walk stands on IS that field of
the value — the selection follows it, as the native element's own segments change the value
under the arrow keys (0086, A13). A listbox points at its active option rather than moving
focus onto it ([0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)), so the
focus stays on the column and the rows are never tab stops.

**A movement keeps the time on the step and inside the bounds.** It aims at the time composed
from the row and the other columns, and lands on the nearest one the step and the bounds
allow — so stepping the hour back to `09` under `min="09:30"` takes the minutes to `30` with
it, and a `max` that is not on the step is met by the last quarter before it.

## Parts

| part      | what it is                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`  | one listbox — one field of the time, one tab stop, and the element that scrolls                                                                           |
| `option`  | one row of a column; `data-pct-chosen`, `data-pct-active` and `data-pct-disabled` on it                                                                   |
| `label`   | the label of the field's typed input                                                                                                                      |
| `control` | the field's typed input                                                                                                                                   |
| `toggle`  | the button that opens the columns                                                                                                                         |
| `hint`    | the hint under the input                                                                                                                                  |
| `error`   | the message when the value is invalid                                                                                                                     |
| `warning` | the message when the value is allowed and suspect — after the error, before the hint ([0087](../decisions/0087-a-warning-is-a-verdict-without-a-veto.md)) |
| `panel`   | the dialog the columns stand in when the field opens them                                                                                                 |

## Theming

```css
[data-theme='brand'] {
  --pct-time-option-bg-selected: #0f766e;
  --pct-time-option-fg-selected: #ffffff;
  --pct-time-column-height: 192px;
}
```

## Keyboard map

| key                     | effect                                                                                                                                                                                                                                                                                                      | test                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `ArrowDown` / `ArrowUp` | the next / previous row the bounds allow, coming round at the ends                                                                                                                                                                                                                                          | `libs/components/time/src/time-columns.spec.ts` |
| `Home` / `End`          | the first / last row the bounds allow                                                                                                                                                                                                                                                                       | `libs/components/time/src/time-columns.spec.ts` |
| digits                  | the row that writes the number typed — `1` then `3` is thirteen on a twenty-four-hour clock, `9` is `09`; where no row writes it, the first that begins with it (`4` in quarter hours is `45`); a number no row holds leaves the column where it is, and a key after a run that named nothing starts afresh | `libs/components/time/src/time-columns.spec.ts` |
| a letter                | the half of the day the letters typed so far begin — `a` is `AM`, `p` then `m` is `PM`                                                                                                                                                                                                                      | `libs/components/time/src/time-columns.spec.ts` |
| `Enter` / `Space`       | takes the time the columns stand on, and says it was picked                                                                                                                                                                                                                                                 | `libs/components/time/src/time-columns.spec.ts` |
| `Tab`                   | the next column — one stop each                                                                                                                                                                                                                                                                             | `apps/sandbox-e2e/src/time.spec.ts`             |

Every key above that moves the walk moves the VALUE, `Enter` and `Space` included: a column is
a field. A key that moves nothing writes nothing — an arrow at the only row the bounds leave, a
digit or a letter no row answers — and a modified key or one the column has no use for —
`ArrowLeft`, `Tab`, `Escape` — is left to whoever owns it, which in a panel is the field.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/time/src/time-columns.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Keyboard map                    | `libs/components/time/src/time-columns.spec.ts` and `apps/sandbox-e2e/src/time.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/time` view holds inline columns, so the listboxes are audited **attached** and not only inside a panel                                                                                                                                                                                                                                                                                                                                                                                                 |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `time-columns` and `time-columns-rtl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the chosen row takes `SelectedItem`, the keyboard's row a ring in `Highlight` and, on the chosen row, a ring in `SelectedItemText`, and a refused row `GrayText`: three things after the palette swap, the ring compared with the surface under it                                                                                                                                                                                                                                                  |
| `prefers-reduced-motion`        | `tools/check-styles.mjs` point 9 — the row's transition takes `--pct-motion-transition-duration`                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Touch target ≥ 24×24 px         | `libs/components/time/src/time-columns.scss` — a row is `--pct-time-option-height` (32 px at `md`, 28 at `sm`) across a column at least `--pct-time-column-min-width` wide, above the threshold at every size                                                                                                                                                                                                                                                                                                                                      |
| Size axis                       | `--pct-time-option-height-sm` / `-lg` and the font sizes beside them — the rows scale with the field the panel opens from                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Density axis                    | none — gap ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| RTL                             | `apps/sandbox-e2e/src/rtl.spec.ts` — the hour column is drawn on the right; the `time-columns-rtl` baseline                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/time` view is in `SBX_ROUTES`, and the inline columns render on the server                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Forms                           | not applicable — the columns are not a form control. It is `<pct-time>` that implements `FormValueControl`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Message announced               | not applicable — the columns draw no message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Time arithmetic as laws         | `libs/components/time/src/lattice.spec.ts` — which rows a step lists, which the bounds refuse, where a movement lands; `libs/components/time/src/time.property.spec.ts` — the value module's laws                                                                                                                                                                                                                                                                                                                                                  |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — the row, its hover, the chosen pair and the refused row                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — four keys, the columns' names; everything else is `Intl`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Size budget                     | `libs/components/size.snapshot.md` — measured together with the field, one entrypoint                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Screen-reader log               | Read 2026-10-08 from `docs/acr/at/` — three readers, whole sandbox, and the act on `/time` that opens the field's panel, which is how these columns enter the logs: the inline ones stand past the walk's twelve stops. **The column says its name, its size and its row** where the reader speaks: Orca `Heures · List with 24 items · 13`, VoiceOver `13 selected (14 of 24)` — the row's state and place; NVDA says the dialog, `Choisir une heure, dialog`, and none of the column. See [`PctTime`](./time.md) for what Escape does under each |
| docs page                       | `/components/columns` on the published site — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Decisions

[0086](../decisions/0086-a-time-of-day-is-a-wall-clock.md),
[0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)

## Known limitations

- **No spinbuttons.** A segment per field is a tab stop per field unless the library invents a
  walk between them — the native element's defect rebuilt by hand — and a single spinbutton has
  no one number to put in `aria-valuenow` (0086 §4).
- **A step the columns cannot list is read as 60.** A step that does not divide a minute, an
  hour or a day makes the valid minutes depend on the hour, which columns that are fields
  cannot show. Seven-minute slots are a `PctSelect` of times.
- **The window is the column's height, not a count of rows.** The rows scale with the size;
  the column does not, so a smaller field shows a row more and a larger one a row less.
