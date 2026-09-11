# `PctCalendar` — calendar

**Summary:** One month of days as a grid, standing on the page rather than folded into a panel.
**Entrypoint:** `@pacit/components/date`
**Selector:** `pct-calendar`
**Status:** released
**Category:** Choices
**ARIA APG pattern:** the grid of
[Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) —
a `<table role="grid">` walked by a roving tabindex

It ships in the `date` entrypoint and is a component of its own rather than a private half of
[`PctDate`](./date.md), for one reason: **a calendar standing on the page, always visible, is
a real control and not a degenerate date field.** `<pct-date>` puts this one in a panel; a
booking screen puts it in a column.

## Usage

```html
<pct-calendar [(value)]="day" ariaLabel="Pick a day" />
```

## Contract

|                 |                                                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `PctDay \| null` through `value` (`model`) — `YYYY-MM-DD` ([0043](../decisions/0043-a-day-is-not-an-instant.md))                                                                   |
| **Inputs**      | `value` (`model`), `min`, `max`, `dateDisabled`, `disabled`, `locale`, `firstDayOfWeek`, `size`, `ariaLabel`, `ariaLabelledby`                                                     |
| **Outputs**     | `dayPicked` — a day chosen **by the user**, which is not the same event as `value` changing. That difference is what closes a panel: a value written from outside must not         |
| **Bounds**      | `min` / `max` clamp where the keyboard can GO; `dateDisabled` marks days inside them that still cannot be taken. **The bounds are the range and the predicate is the holes in it** |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are inputs, bound on the grid. With neither, the grid is named by the month caption above it                                                        |
| **Parts**       | `nav`, `caption`, `grid`, `weekday`, `week`, `day`                                                                                                                                 |
| **Harness**     | `PctCalendarHarness`                                                                                                                                                               |
| **Tokens**      | `--pct-date-*` — the same tier as the field, because a token name carries the ENTRYPOINT and a `--pct-calendar-…` name would promise a package that does not exist                 |
| **Strings**     | `datePreviousMonth`, `dateNextMonth` — through `PCT_TEXTS`. The month, the weekday names and the day numbers come from `Intl` and are nobody's to translate                        |
| **DI contract** | `PCT_CONFIG`, `PCT_TEXTS`, `LOCALE_ID`                                                                                                                                             |

**The cursor moves focus, it does not point at it.** A grid is the menu's half of
[0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md), not the listbox's:
the cell the user is on IS the focused element, which is what makes `aria-activedescendant`
unnecessary and a `<td>` with `tabindex` sufficient.

**The grid is always six weeks.** A month spans four to six depending on where it starts, and
a panel that changed height between March and August would move the page under the pointer
mid-walk.

## Parts

| part      | what it is                                |
| --------- | ----------------------------------------- |
| `label`   | the label of the typed input              |
| `control` | the typed input                           |
| `toggle`  | the button that opens the calendar        |
| `hint`    | the hint under the input                  |
| `error`   | the message when the value is invalid     |
| `panel`   | the calendar, floating or inline          |
| `caption` | the month and the year over the grid      |
| `nav`     | the previous-month and next-month buttons |
| `grid`    | the grid of days                          |
| `week`    | one row of the grid                       |
| `weekday` | a heading over a column of days           |
| `day`     | one day cell                              |

## Theming

```css
[data-theme='brand'] {
  --pct-date-day-bg-selected: #0f766e;
  --pct-date-day-fg-selected: #ffffff;
  --pct-date-day-border-today: #0f766e;
}
```

## Keyboard map

| key                               | effect                                        | test                                        |
| --------------------------------- | --------------------------------------------- | ------------------------------------------- |
| `ArrowRight` / `ArrowLeft`        | one day along the **inline** axis             | `libs/components/date/src/calendar.spec.ts` |
| `ArrowDown` / `ArrowUp`           | one week                                      | `libs/components/date/src/calendar.spec.ts` |
| `Home` / `End`                    | the first / last day of the week it stands in | `libs/components/date/src/calendar.spec.ts` |
| `PageDown` / `PageUp`             | one month                                     | `libs/components/date/src/calendar.spec.ts` |
| `Shift+PageDown` / `Shift+PageUp` | one year                                      | `apps/sandbox-e2e/src/date.spec.ts`         |
| `Enter` / `Space`                 | takes the day the cursor is on                | `libs/components/date/src/calendar.spec.ts` |

`ArrowRight` moves to the **next** day in an LTR grid and to the **previous** one in an RTL
grid, because a grid's arrows are about the cell to the side and which side that is depends
on the direction it is written in — `req-token-logical` read on the keyboard rather than in a
stylesheet. Measured as geometry and as behaviour in `apps/sandbox-e2e/src/date.spec.ts`.

**A walk is not a choice.** Moving the cursor never writes the value; only `Enter`, the space
bar or a press does.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/date/src/calendar.ts`                                                                                                                                                                                                                                                                                                                                |
| Keyboard map                    | `libs/components/date/src/calendar.spec.ts` and `apps/sandbox-e2e/src/date.spec.ts`                                                                                                                                                                                                                                                                                   |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/date` view holds an inline calendar, so the grid is audited **attached** and not only inside a panel                                                                                                                                                                                                                      |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `date-calendar` and `date-calendar-rtl`                                                                                                                                                                                                                                                                                       |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the chosen day, today and a refused day stay three different things after the palette swap                                                                                                                                                                                                                             |
| `prefers-reduced-motion`        | `tools/check-styles.mjs` point 9 — the day cell's transition takes `--pct-motion-transition-duration`                                                                                                                                                                                                                                                                 |
| Touch target ≥ 24×24 px         | `libs/components/date/src/calendar.scss` — the day cell is `--pct-date-day-size` (32 px at `md`, 28 at `sm`), above the threshold at every size                                                                                                                                                                                                                       |
| Size axis                       | `--pct-date-day-size-sm` / `-lg` — every box in the grid is derived from the day cell, so one number moves the whole month                                                                                                                                                                                                                                            |
| Density axis                    | none — gap ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                       |
| RTL                             | `apps/sandbox-e2e/src/date.spec.ts` — geometry and arrows; the `date-calendar-rtl` baseline                                                                                                                                                                                                                                                                           |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/date` view is in `SBX_ROUTES`, and the inline calendar renders on the server                                                                                                                                                                                                                                         |
| Forms                           | not applicable — the calendar is not a form control. It is `<pct-date>` that implements `FormValueControl`                                                                                                                                                                                                                                                            |
| Message announced               | not applicable — the calendar draws no message. The month caption is `aria-live="polite"`, because it is the one thing that changes without the user moving anything they can see                                                                                                                                                                                     |
| Day arithmetic as laws          | `libs/components/date/src/day.property.spec.ts` — the grid's own laws among them: six rows of seven, 42 consecutive days, the first column always `firstDayOfWeek`, and the month's 1st inside the first row. The bound test this panel reads a cell's disabling from went through `<` on two day strings until that sweep ([`lesson-185`](../lessons.md#lesson-185)) |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs`                                                                                                                                                                                                                                                                                                          |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — the day, its states and the weekday headings                                                                                                                                                                                                                                                                                 |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — two keys; everything else is `Intl`                                                                                                                                                                                                                                                                                                         |
| Size budget                     | `libs/components/size.snapshot.md` — measured together with the field, one entrypoint                                                                                                                                                                                                                                                                                 |
| Screen-reader log               | none — gap                                                                                                                                                                                                                                                                                                                                                            |
| docs page                       | `/components/calendar` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                             |

## The two names of a column, and why there are two

A column heading carries the **narrow** weekday name for the eye and the **long** one for a
screen reader, in a clipped box. That is not belt and braces: `narrow` is ambiguous by design
— English has `S` for Saturday and `S` for Sunday — and an ambiguous column heading is a grid
nobody can navigate by ear. Both names come from `Intl`; neither is abbreviated by us.

The same reading gives every **cell** the whole date as its accessible name. A grid a user has
arrowed into another month says `27`, and `27` is not a date.

## Decisions

[0043](../decisions/0043-a-day-is-not-an-instant.md),
[0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md),
[0026](../decisions/0026-one-channel-per-politeness.md) (the caption is a live region, and
`polite` because the user is still walking)

## Known limitations

- **One month at a time.** Two months side by side is what a range picker wants, and a range
  is a question about the tag ([0034](../decisions/0034-multiplicity-is-a-tag.md)).
- **No month or year view.** The nav steps a month at a time and `Shift+PageUp`/`PageDown`
  steps a year; a distant date is reached by **typing it in the field**, which is the whole
  reason the field is typable. A three-view picker is a feature waiting for the consumer who
  needs one without a field beside it.
- **The Gregorian calendar only** — see [`PctDate`](./date.md).
- **The first day of the week is a table where the platform is silent.**
  `Intl.Locale.prototype.getWeekInfo()` is absent from firefox 151, so 80 regions are written
  down in `locale.ts` and checked against the platform's own CLDR for **every** two-letter
  region code in `locale.spec.ts`. A consumer can override it outright with
  `firstDayOfWeek`.
