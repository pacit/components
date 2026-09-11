# 0043 — A day is not an instant, and the field that takes one is text the application formats

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-number`](../requirements/api.md#req-api-number),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-logical`](../requirements/tokens.md#req-token-logical),
[`req-api-texts`](../requirements/api.md#req-api-texts)
**Evidence:** eighteen probes over three engines (chromium 149, firefox 151, webkit 26.5),
each on a page the engine really parsed, plus one sweep of node's own ICU — the
"Measurement" section below. In short: `<input type="date">` takes the order it shows a date
in from **`lang` in chromium, from the browser's locale in webkit and from neither in
firefox**; a half-typed date reads `value === ''` in all three and `validity.badInput` is
`false` in webkit; one such control is **four tab stops** in two engines and one in the
third; `Temporal` is in chromium and firefox and **absent from webkit**;
`Intl.Locale.prototype.getWeekInfo()` is in chromium and webkit and **absent from firefox**;
`Intl` resolves `th-TH` to the **buddhist** calendar and `fa-IR` to the **persian** one in
all three; and `my-MM` resolves dates to `latn` in chromium and to `mymr` in the other two

## Context

The fourth control of the field phase is the date picker, and the plan has carried one line about it
since v0: "the date picker forces deep i18n". That line is right and settles nothing. Five questions
do the work, and four of them are questions this repository has already answered the SHAPE of
somewhere else:

1. **What element takes the date?** `<input type="date">`, or a text field the library
   formats and parses — the same fork the switch's element and the slider's were
   ([0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
   [0042](0042-a-slider-is-the-platforms-range.md)), and the one
   [`req-api-number`](../requirements/api.md#req-api-number) has already answered once for
   `<input type="number">`.
2. **What is the value?** A `Date`, a `Temporal.PlainDate`, or a string. This is the question
   [`req-api-generic`](../requirements/api.md#req-api-generic) is about, met on a type the
   platform has opinions about.
3. **Which calendar is the value in?** A question nobody asks until a Thai user opens the
   control.
4. **Which day does the week start on?** A fact about the reader's region that the platform
   knows — in two engines of three.
5. **What is the panel?** A dialog with a grid, walked by a roving tabindex — the fork
   [0032](0032-a-menu-moves-focus-a-listbox-points-at-it.md) settled for menus and listboxes,
   met on a third role.

Every one of the five was settled by a browser before a line of the component was written.

## The measurement

Playwright, `page.setContent` on each of the three engines, `axe-core` 4.12 with the
`wcag2a wcag2aa wcag21a wcag21aa wcag22aa` tags, screenshots compared by pixel where a
rendering rather than a declaration was the question ([`lesson-118`](../lessons.md#lesson-118)
is why).

| #   | probe                                                                                    | chromium 149                                 | firefox 151  | webkit 26.5            |
| --- | ---------------------------------------------------------------------------------------- | -------------------------------------------- | ------------ | ---------------------- |
| A1  | `<input type=date>` rendering under `lang="pl"` vs `lang="en-US"`                        | **differs** (by pixel)                       | identical    | identical              |
| A2  | the same under a browser locale of `pl-PL` vs `en-US`                                    | identical                                    | identical    | **differs** (by pixel) |
| A3  | `.value` after typing `12` into an empty date input                                      | `""`                                         | `""`         | `""`                   |
| A4  | `.validity.badInput` for the same                                                        | `true`                                       | `true`       | **`false`**            |
| A5  | tab stops between two buttons with one date input between them                           | **4**                                        | **4**        | **1**                  |
| A6  | `showPicker()`                                                                           | function                                     | function     | function               |
| B1  | `globalThis.Temporal.PlainDate`                                                          | works                                        | works        | **absent**             |
| B2  | `new Date(2026, 7, 27).toISOString().slice(0,10)` in `Europe/Warsaw`                     | `2026-08-26`                                 | `2026-08-26` | `2026-08-26`           |
| B3  | `new Date(Date.UTC(1, 0, 1)).getUTCFullYear()`                                           | `1901`                                       | `1901`       | `1901`                 |
| C1  | `Intl.Locale.prototype.getWeekInfo`                                                      | function                                     | **absent**   | function               |
| C2  | `Intl.Locale.prototype.weekInfo` (the older spelling)                                    | absent                                       | **absent**   | absent                 |
| C3  | `new Intl.Locale('pl').maximize()`                                                       | `pl-Latn-PL`                                 | `pl-Latn-PL` | `pl-Latn-PL`           |
| C4  | `getWeekInfo().firstDay` over all 676 two-letter regions (node ICU)                      | 596 Monday, 65 Sunday, 14 Saturday, 1 Friday | —            | —                      |
| D1  | `Intl.DateTimeFormat('th-TH').resolvedOptions().calendar`                                | `buddhist` (`01/12/2569`)                    | `buddhist`   | `buddhist`             |
| D2  | `Intl.DateTimeFormat('fa-IR').resolvedOptions().calendar`                                | `persian`                                    | `persian`    | `persian`              |
| D3  | the same with `{ calendar: 'gregory' }`                                                  | `gregory` (`01/12/2026`)                     | `gregory`    | `gregory`              |
| D4  | `Intl.DateTimeFormat('my-MM').resolvedOptions().numberingSystem`                         | **`latn`**                                   | `mymr`       | `mymr`                 |
| D5  | `ar-EG` numeric date, `formatToParts`                                                    | literals are `U+200F /`                      | same         | same                   |
| E1  | axe: `role="dialog"` + `<table role="grid">` + `aria-selected` on `<td role="gridcell">` | clean                                        | clean        | clean                  |
| E2  | axe: the same with `aria-selected` on a `role="button"` inside the cell                  | **`aria-allowed-attr` (critical)**           | same         | same                   |
| E3  | axe: a plain textbox + a button with `aria-haspopup="dialog"`                            | clean                                        | clean        | clean                  |
| E4  | `CSS.supports('selector(:dir(rtl))')`                                                    | `true`                                       | `true`       | `true`                 |

## The decisions

### 1. The value is a calendar day, written `YYYY-MM-DD`

B2 is the whole argument and it is one line: in `Europe/Warsaw`, the three fields a user
picked, put into a `Date` and serialised, come back as **the day before**. No error, no
warning, no red test — one day, in one direction, for half the world.

`Temporal.PlainDate` is exactly this type and does the arithmetic too, and B1 rules it out as
a **public** one: it is absent from webkit 26.5, and a value type cannot be conditional on the
engine. So the value is the string, and the choice of string is not arbitrary either —
`YYYY-MM-DD` is what `<input type="date">.value` carries, what `<time datetime>` takes, what
JSON carries, what SQL `DATE` stores, and what `Temporal.PlainDate.toString()` emits. The day
webkit ships `Temporal` the interop is one call in each direction and **no consumer's stored
value changes**.

The arithmetic that goes with it is UTC-only, in one file, and B3 is why `Date.UTC` is not
called from it: `Date.UTC(1, 0, 1)` is the year **1901** in all three engines, because the
two-digit-year rule of the original ECMAScript is still in it.

### 2. The element is a text field the library formats and parses

`req-api-platform` says a native element wherever the platform has one, and this is the second
written exception to it after `[pctNumber]`. Three measurements make it:

- **A1 and A2 together.** The order a native date input shows a date in comes from `lang` in
  chromium, from the browser's locale in webkit, and from neither in firefox — three engines,
  three sources, and only one of them is something an application can set. An application in
  Polish therefore shows `12/01/2026` to two users in three and has no way of saying
  otherwise. This is the number field's own complaint ("does not know the local decimal
  separator") in its harder form: there, the platform was ignorant; here, the platform is
  ignorant **in three different directions at once**.
- **A3 and A4.** A half-typed date reads `value === ''`, so "empty" cannot be told from
  "junk", and the one flag that would tell them apart is `false` in webkit. `req-api-number`
  refuses `<input type="number">` over exactly this.
- **A5.** One control is four tab stops in two engines and one in the third, so the same form
  is walked differently depending on the browser.

So the field is `<input type="text">` with parsing of its own, the same shape `[pctNumber]`
has — and the same consequence: what a user typed is **kept**. Text that is not a date leaves
the value `null`, leaves the text where it was, and is reported through `aria-invalid` and a
state attribute.

### 3. The calendar is pinned and the numbering system is not

D1 and D2 are the finding nobody looks for: `Intl.DateTimeFormat('th-TH')` resolves to the
**buddhist** calendar in all three engines and writes 1 December 2026 as `01/12/2569`. A
field that formatted with the locale's default would therefore stand beside a grid drawn in
2026 — **the two halves of one control disagreeing about which year it is, in silence**.

D3 says the pin is one option and it works everywhere, so the formatter says
`calendar: 'gregory'` out loud.

The numbering system is deliberately **not** pinned beside it, and the distinction is worth
the sentence it takes: **a numbering system is how a number is written; a calendar is which
number it is.** `٠١‏/١٢‏/٢٠٢٦` is how Egyptian Arabic writes this date and `[pctNumber]`
already respects that; `2569` is a different year. The value is a Gregorian day, so the
calendar is the value's and the digits are the reader's.

D4 is why the digit table is read from `Intl` at runtime and never written down: `my-MM`
resolves to `latn` in chromium and to `mymr` in the other two, so a table would be wrong in
one engine of three whichever way it was filled in. D5 is why the parser strips bidi marks
before it splits.

### 4. The first day of the week is data, and the platform is its gate

C1 is the shape [0041](0041-a-height-the-platform-computes.md) already met — present in two
engines, absent from the third — and the answer here is the opposite one, because a calendar
is not a height. A height the platform computes and a height we measure can be made to agree
to the pixel; a **week that started on Monday in two engines and on Sunday in the third**
would be the same page drawn two ways with nothing to notice, which is
[`req-axis`](../00-axis.md) itself.

So the answer is written down: C4 says 80 of the 676 two-letter regions differ from Monday,
and those 80 live in `locale.ts`. What makes that a decision rather than a liability is the
gate over it — `locale.spec.ts` compares our table with `getWeekInfo()` for **every**
two-letter region code, 676 comparisons and no sample, and it asserts that the platform still
has `getWeekInfo` before it starts, so the day the runtime loses it the check goes red rather
than passing over nothing.

C3 is the other half: a tag with no region gets one from `maximize()` — `pl` is `pl-Latn-PL`
and `en` is `en-Latn-US`, which is exactly the difference between Monday and Sunday.

### 5. The panel is a dialog holding a grid, and the trigger is a button

E1 and E3 say the shape passes; E2 says the obvious variant does not, and it is the useful
one: `aria-selected` on a `role="button"` inside the cell is a **critical**
`aria-allowed-attr` in all three engines, so the state belongs on the `gridcell` and the cell
is a `<td>` with a `tabindex` rather than a button in a box.

Two things follow that a measurement does not settle, and both are read off decisions this
repository already has:

- **The textbox is not a `combobox`.** A combobox promises a popup that helps COMPLETE what
  is being typed; a calendar narrows nothing — it is a second road to the same value. That is
  [0035](0035-a-filter-is-a-question-not-a-value.md) read backwards, and it puts
  `aria-expanded` on the button beside the field rather than on the field.
- **The grid moves focus.** [0032](0032-a-menu-moves-focus-a-listbox-points-at-it.md) forked
  a menu from a listbox; a grid is on the menu's side, so the cell the cursor names IS the
  focused element and `aria-activedescendant` is not needed. The panel is therefore one that
  takes focus ([0025](0025-a-panel-says-whether-it-takes-focus.md)), and Tab out of it is
  spliced back onto the field
  ([0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).

E4 settles the last small thing: the two nav buttons are one chevron turned a quarter each
way, and which way is `:dir()` — the platform's own answer to "whichever way this is
written", supported in all three engines, and not a rule that reads the direction.

### 6. The format hint has two owners, and that is not a bug

`dd.mm.yyyy` is two things at once. The **order and the separators** are a fact about the
date and come from `Intl`, so they follow the field's `locale`. The three **letters** are
words — `d`, `m`, `y` in English, `j`, `m`, `a` in French, `d`, `m`, `r` in Polish — so they
come from `PCT_TEXTS` and follow the application.

The consequence reads oddly written down and is right read aloud: a field told
`locale="pl-PL"` inside a French application shows **`jj.mm.aaaa`** — Polish order, Polish
separators, French letters. The user reads the page's language, and a Polish `r` in a French
form would mean nothing to them. The sandbox is set up to make that visible rather than
hidden: it runs under `fr-FR` and carries fields in three locales, and
`apps/sandbox-e2e/src/date.spec.ts` asserts all three hints.

## What this costs us

- **The value is a `string`,** so the compiler will not stop `'27.08.2026'` being passed to
  it. `isPctDay` is the run-time guard and every read in the entrypoint goes through it; a
  branded type would have bought the check and cost every consumer a constructor.
- **No non-Gregorian calendar.** A Thai user reads `01.12.2026` where their phone's own
  picker would say `01.12.2569`. The value would have to stop being one string for that to
  change, and `Temporal` answers it better than we can.
- **The parser is ours,** so a locale whose format `Intl` describes oddly is ours to be wrong
  about. It is measured by round-trip over ten locales, including `ar-EG` (bidi marks and
  Arabic-Indic digits), `hu-HU` (a trailing separator) and `th-TH` (a pinned calendar).
- **A two-digit year is a guess** — `[today − 80, today + 19]`, the convention every other
  date field a user has met uses. It is the one guess about intent this control makes and the
  number is written where it can be read.
- **The shape has a domain, and since 2026-09-11 it says so out loud.** `YYYY-MM-DD` cannot
  write a year below zero — `pad(-1, 4)` is `'00-1'` — and above `275760-09-13` the
  platform's own `Date` has no more days, so `pctDay` throws a `RangeError` at either edge
  rather than handing back a string the next function crashes on. The cost is real and
  deliberate: a walk that leaves the calendar now raises, where before it returned quietly, and
  the only reason the trade is right is the one that made the value a string in the first place
  — a day this shape cannot write is not a day `<input type="date">`, JSON or SQL `DATE` can
  carry either. A property sweep found both ends; neither had a symptom
  ([`lesson-186`](../lessons.md#lesson-186)).
- **The eighty regions are a copy of somebody else's data** and will drift the day CLDR
  moves. The gate is what makes that a red test instead of a wrong calendar in Cairo.

## The road not taken

**A wrapper around `<input type="date">`, with our own panel over the platform's.** It keeps
the native element and therefore `req-api-platform`, and it fails on A1/A2 anyway: the field
would still SHOW the date in an order the application cannot set, and a second picker over
the browser's own is two pickers on one control — A6 says `showPicker()` exists everywhere, so
there is no way to suppress the platform's and keep the element.

**`Temporal.PlainDate` with a polyfill.** It is the right type. A polyfill in a peer
dependency is a decision about the consumer's bundle taken on their behalf, and
[0013](0013-no-headless-split.md)'s rule is that this library buys machinery it cannot write
better — not that it ships machinery the platform is about to make redundant. The string is
the format `PlainDate` itself serialises to, so nothing has to be migrated when it arrives.

**A brand on the day type** (`string & { readonly __day: unique symbol }`). It would make
`'27.08.2026'` a compile error, and it would make `day = '2026-08-27'` one as well —
every consumer would need a constructor call for a literal the platform already treats as a
date everywhere else. The guard runs at the boundary instead, which is where the wrong
strings actually come from: a server, a query string, a `localStorage` entry.
