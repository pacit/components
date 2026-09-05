# `PctDate` — date field

**Summary:** A date typed into a field or picked from a calendar the field opens.
**Entrypoint:** `@pacit/components/date`
**Selector:** `pct-date`
**Status:** released
**Category:** Text & numbers
**ARIA APG pattern:** [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) —
a plain textbox with a button beside it that opens a `role="dialog"` holding a
[`role="grid"`](./calendar.md). The textbox is deliberately **not** a `combobox`: a combobox
promises a popup that helps complete what is being typed, and a calendar narrows nothing —
it is a second road to the same value ([0035](../decisions/0035-a-filter-is-a-question-not-a-value.md)
read backwards)

## Usage

```html
<pct-date label="Starts on" [(value)]="startsOn" />
```

## Contract

|                 |                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**       | `PctDay \| null` through `value` (`model`) — a calendar day written `YYYY-MM-DD`, never a `Date` ([0043](../decisions/0043-a-day-is-not-an-instant.md))                                                                                          |
| **Inputs**      | `value` (`model`), `min`, `max`, `dateDisabled`, `locale`, `firstDayOfWeek`, `showFormat`, `size`, `panelAlign`, `label`, `hint`, `ariaLabel`, `ariaLabelledby`, plus `FormUiControl`                                                            |
| **Outputs**     | `touch`                                                                                                                                                                                                                                          |
| **Bounds**      | `min` / `max` belong to the `FormUiControl` contract, so `[formField]` fills them from the schema's validators. They clamp the calendar's **walk** and never rewrite a date typed in full — a bound clamps a movement, and a sentence is not one |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are **inputs and not attributes on the tag**: the textbox sits inside this template, the host carries no role, and an ARIA name on a roleless element is ignored                                                  |
| **Parts**       | `control`, `toggle`, `panel`, `label`, `hint`, `error`                                                                                                                                                                                           |
| **Harness**     | `PctDateHarness`                                                                                                                                                                                                                                 |
| **Tokens**      | `--pct-date-*` — one tier for the field **and** the calendar, because the name carries the ENTRYPOINT and `PctCalendar` ships inside this one                                                                                                    |
| **Strings**     | `dateOpen`, `datePreviousMonth`, `dateNextMonth`, `dateDayLetter`, `dateMonthLetter`, `dateYearLetter` — through `PCT_TEXTS`                                                                                                                     |
| **DI contract** | `PCT_FIELD`, `PCT_CONFIG`, `PCT_TEXTS`, `LOCALE_ID`; `fieldCursor: 'text'` — the control is typed into, so a click anywhere on the field places the caret                                                                                        |

**Why not `<input type="date">`,** despite
[`req-api-platform`](../requirements/api.md#req-api-platform). Three measurements, three
engines each:

- **the order it shows a date in comes from a different place in each engine** — chromium 149
  reads `lang` on the element, webkit 26.5 reads the browser's locale and ignores `lang`,
  firefox 151 reads neither. An application in Polish therefore shows `12/01/2026` to two
  users in three and has no way of saying otherwise;
- **a half-typed date reads `value === ''`** in all three, and `validity.badInput` — the one
  flag that would tell junk from empty — is `false` in webkit. That is the very complaint
  [`req-api-number`](../requirements/api.md#req-api-number) already refuses
  `<input type="number">` over, met a second time;
- **one control is four tab stops** in chromium and firefox (three segments plus the picker
  button) and one in webkit, so the same form is walked differently by engine.

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
  --pct-date-border-focus: #0f766e;
  --pct-date-day-bg-selected: #0f766e;
  --pct-date-day-fg-selected: #ffffff;
}
```

## Keyboard map

| key                    | effect                                            | test                                |
| ---------------------- | ------------------------------------------------- | ----------------------------------- |
| any text               | typed into the field, parsed on commit            | `apps/sandbox-e2e/src/date.spec.ts` |
| `Tab`                  | field → calendar button → out                     | native                              |
| `Enter` on the button  | opens the panel, focus lands on the cursor's cell | `apps/sandbox-e2e/src/date.spec.ts` |
| `Escape` in the panel  | closes it, focus back to the field                | `apps/sandbox-e2e/src/date.spec.ts` |
| `Tab` out of the panel | closes it, focus **spliced back** onto the field  | `apps/sandbox-e2e/src/date.spec.ts` |

The grid's own map is on [`PctCalendar`](./calendar.md). The field itself adds **no** key of
its own: what a user types is text, and the platform's own editing keys are the whole of it.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/date/src/date.ts` — the pattern is named and linked in the class comment                                                                                                                                                                                                                                                                                                |
| Keyboard map                    | `apps/sandbox-e2e/src/date.spec.ts` — the panel's map in three engines; the field's editing keys are the platform's                                                                                                                                                                                                                                                                      |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/date` view and `/all`, in both directions, and separately **the open calendar with the field it belongs to**, whole-page: the toggle's `aria-expanded`/`aria-controls` pointing into the overlay container and the roving cell that takes focus, a stage the derived list asked for (plan 4.28) and the one panel the audit had never opened |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `date-field`, `date-calendar` and `date-calendar-rtl`                                                                                                                                                                                                                                                                                            |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the chosen day takes the mode's own `Highlight` pair, today keeps a **shape** — chromium and firefox force `box-shadow` to `none` there and webkit leaves it, so the block writes both halves ([`lesson-119`](../lessons.md#lesson-119))                                                                                                  |
| `prefers-reduced-motion`        | `tools/check-styles.mjs` point 9 — the day cell's transition takes `--pct-motion-transition-duration`, which the token build switches off                                                                                                                                                                                                                                                |
| Touch target ≥ 24×24 px         | `libs/components/date/src/date.scss` — the calendar button is `max(--pct-date-toggle-size, --pct-date-target-min)`, a floor on the DRAWING and not a zone laid over it                                                                                                                                                                                                                   |
| Size axis                       | `apps/sandbox/src/app/views/size/size-view.html` — the `/size` view puts the field on the shared `sm`/`md`/`lg` axis beside a text field and a button                                                                                                                                                                                                                                    |
| Density axis                    | none — gap ([`req-token-density`](../requirements/tokens.md#req-token-density) has not one token in the sources; the day cell is the number a density axis would move)                                                                                                                                                                                                                   |
| RTL                             | `apps/sandbox-e2e/src/date.spec.ts` — the grid mirrors as geometry AND the arrows mirror with it; plus `apps/sandbox-e2e/src/rtl.spec.ts` over the `/date` view                                                                                                                                                                                                                          |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/date` view is in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                           |
| Forms                           | `libs/components/date/src/date.spec.ts` — signal forms and `[(value)]`; classic forms are warned about in dev mode, as on `[pctNumber]`                                                                                                                                                                                                                                                  |
| Message announced               | `tools/check-aria.mjs` (point 7, target `check-aria`) — the error part carries `role="alert"`                                                                                                                                                                                                                                                                                            |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                      |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — 23 pairs for the field and the calendar together                                                                                                                                                                                                                                                                                                |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — six keys, and the three letters are texts because they are **words**: `dd.mm.yyyy` reads as language, and a `y` in a Polish field means nothing                                                                                                                                                                                                                |
| Size budget                     | `libs/components/size.snapshot.md`, `tools/check-bundle.mjs` (target `check-bundle`)                                                                                                                                                                                                                                                                                                     |
| Screen-reader log               | none — gap. Relevant: every grid cell carries the whole date as its accessible name, because the number in it is not one                                                                                                                                                                                                                                                                 |
| docs page                       | `/components/date` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                    |

## What the control knows and cannot say

Type `not a date` into the field and leave it. The value goes `null`, the text **stays**, and
the control reports `aria-invalid="true"` with a `data-pct-malformed` state — which is the
opposite of what `<input type="date">` does and the whole reason this control is not one.

What it does **not** do is put a sentence in the message line, and the reason is structural rather
than a decision about wording: `errors` is an `input`, so the message line belongs to the form, and
a form that sees `null` for a required field reports "this is required" while the user is looking at
three numbers they typed. The state attribute and the ARIA flag are what the control has; a channel
of its own is an open finding in the work plan.

## Decisions

[0043](../decisions/0043-a-day-is-not-an-instant.md) (a day is not an instant, and the field
that takes one is text the application formats),
[0035](../decisions/0035-a-filter-is-a-question-not-a-value.md) (read backwards, for why the
textbox is not a combobox),
[0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md),
[0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md),
[0009](../decisions/0009-number-field.md) (the locale plumbing, met again),
[0005](../decisions/0005-signal-forms-without-cva.md),
[0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **One day, not a range.** A booking's two ends are `[PctDay, PctDay]`, which by
  [0034](../decisions/0034-multiplicity-is-a-tag.md) is a question about the tag rather than
  about an input. Two `PctDate`s with `min` / `max` bound to each other is what a consumer
  composes today.
- **No time.** A day has none, by construction. A datetime control is a different value type
  and therefore a different control.
- **The Gregorian calendar only.** `Intl` resolves `fa-IR` to the persian calendar and
  `th-TH` to the buddhist one, and the value is a Gregorian day — so the formatter is pinned
  and a user in Bangkok reads `01.12.2026` rather than `01.12.2569`. Supporting the others
  means the value stops being one string, which `Temporal` will answer better than we can.
- **No message of its own** for malformed text — see above.
- **A two-digit year is a guess.** `01.12.26` lands in `[today − 80, today + 19]`, the
  convention every other date field a user has met uses. It is the only guess about intent
  this control makes, and the number is written down in `locale.ts` where it can be read.
