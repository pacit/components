# 0086 — A time of day is a wall clock, and the field that takes one is text the application formats

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-number`](../requirements/api.md#req-api-number),
[`req-api-day`](../requirements/api.md#req-api-day),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-project-entrypoints`](../requirements/project.md#req-project-entrypoints)
**Evidence:** forty-one probes over the three engines this repository runs (chromium 153,
firefox 155, webkit 26.6 — Playwright 1.63.0) and again over the three
[0043](0043-a-day-is-not-an-instant.md) measured (chromium 149, firefox 151, webkit 26.5 —
Playwright 1.61.1), each on a page the engine really parsed, plus one sweep of node's own ICU
(78.3, CLDR 48) — the "Measurement" section below. In short: `<input type="time">` draws its
clock in the **browser's interface language in chromium, its own in firefox and the browser's
locale in webkit — in `lang` in none of them**, and the same holds for the date input, which
corrects 0043's A1; a half-typed time reads `""` in two engines and **`"13:00"`** in the third;
the same five keys are `01:30` in one engine and `13:30` in another; one control is three or
four tab stops in chromium **depending on the system's locale**, four in firefox and one in
webkit; `Temporal.PlainTime` is in all three engines and **absent from webkit 26.5**, which
Angular 22 still supports; and chromium formats the language of **44** of the 280 regions
`Intl` names in `en-US`

## Context

The date field closed its card with one line about the next control: "No time. A day has
none, by construction. A datetime control is a different value type and therefore a different
control." Nothing in the plan or the decisions said more. The questions are the date's, met on
a type the platform treats differently, and two of them the date never had to ask:

1. **What is the value?** A `Date`, a `Temporal.PlainTime`, a number of seconds or a string —
   and what does a time do at midnight, which a day never meets?
2. **What element takes it?** `<input type="time">`, or text the library formats and parses.
   0043 refused the date's native element on three measurements; a time input is a different
   control in every engine, so the answer is measured again rather than inherited.
3. **Who decides the clock?** Twelve hours or twenty-four, the words of the day period —
   `PM`, `오후`, `م` — and where they stand.
4. **What is the panel,** and is there one at all?
5. **What does the contract carry?** `min`, `max`, `step` — and a predicate like
   `dateDisabled`.
6. **Where does it live?** In `./date`, or an entrypoint of its own — with the datetime field
   after it.

## The measurement

Playwright, `page.setContent` on each of the three engines, `axe-core` 4.13 with the
`wcag2a wcag2aa wcag21a wcag21aa wcag22aa` tags and every probed target drawn at least 24 px,
screenshots compared byte for byte and read by eye where a rendering was the question. "Browser
locale" is Playwright's `locale` — what `navigator.language` and `Accept-Language` say;
"system locale" is the browser process's `LANG` and `LC_*`.

| #   | probe                                                                                                                    | chromium 153                                                  | firefox 155                              | webkit 26.6                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| A1  | `<input type=time value="13:05">` under `lang="pl"` vs `lang="en-US"` — on the root or the input, filled or empty        | identical                                                     | identical                                | identical                                |
| A2  | the same under a browser locale of `pl-PL` vs `en-US`                                                                    | identical                                                     | identical                                | **differs** (`13:05:00` / `1:05:00 PM`)  |
| A3  | the same under a system locale of `pl_PL` vs `en_US`                                                                     | **differs** (`13:05` / `01:05 PM`)                            | identical (`01:05 PM`)                   | identical                                |
| A4  | A1 with Blink's `LangAttributeAwareFormControlUI` switched on — the time input and the date input                        | **differs**                                                   | —                                        | —                                        |
| A5  | `.value` after typing `13`, then `130`, into an empty input                                                              | `""`, then **`"13:00"`**                                      | `""`, `""`                               | `""`, `""`                               |
| A6  | `.validity.badInput` after `1`, then after `13`                                                                          | `true`, `true`                                                | **`false`**, `true`                      | **`false`**, **`false`**                 |
| A7  | `.value` after the same five keys, `0130P`                                                                               | `01:30`                                                       | **`13:30`**                              | `""`                                     |
| A8  | tab stops between two buttons with one time input between them: default · `step="1"` · `step="0.001"`                    | **3** · 4 · 5 under `pl_PL`; **4** by default under `en_US`   | 4 · 5 · 6                                | **1** · 1 · 1                            |
| A9  | `showPicker()`                                                                                                           | function                                                      | function                                 | function                                 |
| A10 | seconds on screen for `13:05`: default · `step="1"`                                                                      | none · a segment                                              | none · a segment                         | **always** (`1:05:00 PM`)                |
| A11 | `.validity.stepMismatch`: `13:05` at `step="900"` · the same with `min="00:05"` · `13:05:30` with no `step`              | `true` · `false` · **`true`**                                 | same                                     | same                                     |
| A12 | `min="22:00" max="06:00"`: `23:00` · `05:00` · `12:00`                                                                   | valid · valid · under **and** over                            | same                                     | same                                     |
| A13 | `ArrowUp` on the minutes of `23:59` · on its hours                                                                       | `23:00` · `00:59`                                             | `23:00` · **`12:59`**                    | nothing · nothing                        |
| A14 | `ArrowUp` on the minutes of `13:05` at `step="900"`                                                                      | **`13:20`**                                                   | **`13:06`**                              | nothing                                  |
| A15 | `stepUp()` at `23:59` · `stepDown()` at `00:00`                                                                          | stops · stops                                                 | **wraps** · **wraps**                    | stops · stops                            |
| A16 | `.value =` `'24:00'` · `'13:05:60'` · `'13:05:00'` · `'13:05:30.5'`                                                      | `""` · `""` · kept · kept                                     | same                                     | same                                     |
| B1  | `globalThis.Temporal.PlainTime` and `.PlainDateTime`                                                                     | works                                                         | works                                    | works                                    |
| B2  | `Temporal.PlainTime.from('13:05').toString()` · with `{ smallestUnit: 'minute' }`                                        | `13:05:00` · `13:05`                                          | same                                     | same                                     |
| B3  | `PlainTime.from('24:00')` · `PlainTime.from({ hour: 24 })` · `PlainTime.from('23:59:60')`                                | `RangeError` · **`23:00:00`** · `23:59:59`                    | same                                     | same                                     |
| B4  | `23:30` plus 45 minutes as a `PlainTime` · as a `PlainDateTime` on 5 October · `PlainTime` `23:00` until `01:00`         | `00:15:00` · `2026-10-06T00:15:00` · `-PT22H`                 | same                                     | same                                     |
| B5  | `valueAsDate` of `13:05` in `Europe/Warsaw`, read back through `getHours()`                                              | **`14`**                                                      | **`14`**                                 | **`14`**                                 |
| B6  | `new Date(2026, 2, 29, 2, 30)` in `Europe/Warsaw`, read back                                                             | **`03:30`**                                                   | **`03:30`**                              | **`03:30`**                              |
| C1  | `resolvedOptions().hourCycle` for `{ hour: '2-digit', minute: '2-digit' }` over 38 locales, against node                 | equal but `my-MM`, `ne-NP`: **`h12`**, `en-US`                | equal                                    | equal                                    |
| C2  | `new Intl.Locale('ja-JP').getHourCycles()` · the older `hourCycles` getter                                               | `h23` · absent                                                | **`h23 h11 h12`** · absent               | `h23` · absent                           |
| C3  | `getHourCycles()[0]` of `und-XX` over all 676 two-letter regions                                                         | 561 `h23`, 115 `h12` — node's own                             | the same but `ZZ`                        | node's own                               |
| C4  | the formatter's cycle in each region's own language, over the 211 regions all four sources resolve                       | 211 equal                                                     | 211 equal                                | 211 equal                                |
| C5  | regions `Intl.DisplayNames` names (280) whose language the engine formats in **another** locale                          | **44**, all in `en-US`                                        | 14                                       | 14                                       |
| C6  | `{ hour12: true }` in `ja-JP` · `{ hour12: false }` · `hour12: false` with `hourCycle: 'h12'`                            | **`h11`** (`午前0:05`) · `h23` · `h23`                        | same                                     | same                                     |
| C7  | `en-US-u-hc-h23` · `pl-PL-u-hc-h12` · `en-US-u-hc-h24` with `hour12: false`                                              | `h23` · `h12` · **`h24`**                                     | `h23` · `h12` · `h23`                    | `h23` · `h12` · `h23`                    |
| D1  | where the day period stands in the 12-hour form                                                                          | before the hour in `ja`, `ko`, `zh`, `tr`; after it elsewhere | the same, and `my` before                | the same, and `my` before                |
| D2  | the day-period words of `ko-KR`                                                                                          | `오전` / `오후`                                               | `오전` / `오후`                          | **`AM` / `PM`**                          |
| D3  | the separator of `fi-FI` · `da-DK` · `fr-CA`                                                                             | `.` · `.` · `h`                                               | same                                     | same                                     |
| D4  | the character before `PM` in `en-US`                                                                                     | U+0020                                                        | U+0020                                   | U+0020 — node's ICU writes U+202F        |
| D5  | `numberingSystem` of the time formatter: `ar-EG` · `fa-IR` · `mr-IN` · `my-MM`                                           | `arab` · `arabext` · `deva` · **`latn`**                      | `arab` · `arabext` · `deva` · **`mymr`** | `arab` · `arabext` · `deva` · **`mymr`** |
| E1  | axe: `role="dialog"` holding three named `role="listbox"` columns, focus on the column, `aria-activedescendant`          | clean (3 stops in the panel)                                  | clean                                    | clean                                    |
| E2  | the same with focus on the option, by a roving `tabindex`                                                                | clean                                                         | clean                                    | clean                                    |
| E3  | a column of plain `<button>`s inside `role="listbox"`                                                                    | **`aria-required-children` (critical)**                       | same                                     | same                                     |
| E4  | `aria-selected` on a `<button>` inside the option                                                                        | **`aria-allowed-attr` (critical)**                            | same                                     | same                                     |
| E5  | a column with no name                                                                                                    | **`aria-input-field-name` (serious)**                         | same                                     | same                                     |
| E6  | three named `role="spinbutton"` segments in a `role="group"`, and the same with an empty one carrying no `aria-valuenow` | clean — **a tab stop per segment**                            | same                                     | same                                     |
| E7  | a plain textbox and a button with `aria-haspopup="dialog"`                                                               | clean (2 stops)                                               | clean                                    | clean                                    |

The engines 0043 measured give every row the same answer but three: firefox 151 is three tab
stops where 155 is four (A8), `getHourCycles()` is absent from firefox 151 (C2), and `Temporal`
from webkit 26.5 (B1). Firefox moves at A3 for one user only — the one who ticked the setting
that hands formats to the operating system (`intl.regional_prefs.use_os_locales`), who then
reads `13:05` on a Polish system.

### What this corrects in 0043

0043's A1 says a date input takes its order from `lang` in chromium. **It does not reproduce**,
on chromium 149 — the build 0043 measured — or on 153: with `lang` on the root or on the input,
filled or empty, under a Polish system or an English one, the date input's pixels do not move,
in a harness that sees them move with the system's locale in chromium and with the browser's in
webkit. They move only with Blink's `LangAttributeAwareFormControlUI` switched on (A4), a
runtime switch that is off in the browser a user runs. A5 of 0043 reproduces (four stops, four,
one).

The decision 0043 took stands, and stands on firmer ground: three engines, three sources, and
**none** of them is one an application can set. The two cards that repeated the row are
corrected beside this decision; the class comment in `libs/components/date/src/date.ts` and
the comment over the first case of `apps/sandbox-e2e/src/date.spec.ts` repeat it too, and are
corrected in a commit allowed to touch code.

## The decisions

### 1. The value is a wall-clock time, written `HH:mm` — and its own arithmetic wraps

B5 and B6 are the date's B2 met twice. The platform's own `valueAsDate` turns `13:05` into an
instant at 13:05 UTC on 1 January 1970, and read back through `getHours()` in Warsaw it is
**14**. A local `Date` cannot even hold every wall-clock time: 02:30 on 29 March 2026 does not
exist in Warsaw, and `new Date(2026, 2, 29, 2, 30)` answers `03:30` without a word. A time of
day is what a clock on the wall shows — no date, no zone — and an instant is neither.

`Temporal.PlainTime` is exactly that type, and B1 is the date's B1 a year on: in all three
engines the run has, and absent from webkit 26.5. By
[0084](0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)'s rule
the library may not require what an engine Angular 22 supports lacks, and Angular 22's policy
reaches back to chromium 111, firefox 112 and safari 16.4, none of which has it. So the value
is a string, and `PctTime` names it:

- **`HH:mm`, or `HH:mm:ss` when the field's step has seconds in it** — two digits each, a
  24-hour clock, no fraction, no zone. It is what `<input type="time">.value` carries (A16
  keeps both forms as written), what `<time datetime>` and SQL `TIME` take, and what
  `Temporal.PlainTime.from` reads. B2 corrects a common reading: `PlainTime.toString()` writes
  `13:05:00`, seconds always, and `HH:mm` is `toString({ smallestUnit: 'minute' })`. Both are
  `PctTime`s, so the interop is one call each way, and the day `Temporal` is everywhere no
  stored value changes.
- **`null` is empty**, as `PctDay | null` is.
- **The domain is `00:00` to `23:59:59`, and `24:00` is refused.** ISO 8601 allows it as the
  end of a day; the platform sanitises it to `""` and `PlainTime.from('24:00')` throws (A16,
  B3). B3 has a trap beside it: `PlainTime.from({ hour: 24 })` does not throw, it **constrains
  to `23:00`**, so a guard built on `from` and an object accepts the very value the string
  refuses. `isPctTime` is the guard, as `isPctDay` is for the day, and it refuses `23:59:60`
  too — the platform refuses it, `Temporal` quietly makes it `:59`.
- **A fraction of a second is refused.** The native element carries one (`13:05:30.5`, A16)
  because its `step` may be `0.001`. A field a person types a time into is not a stopwatch, and
  a third form would be a third way for two equal times to be two strings.

**The arithmetic wraps, and only the time's own.** `23:30` plus 45 minutes is `00:15`: a time
has nowhere to put the day it ran into, so it comes round or it throws, and a clock comes
round. That is `PlainTime`'s answer (B4) and the one the platform's segments give a single
field (A13: minute `59` comes round to `00` and leaves the hour where it was, in two engines of
three), while the platform's `stepUp()` cannot agree with itself (A15: firefox wraps, chromium
and webkit stop) — so there is no single platform answer to borrow, and the type this string
serialises has one. **The datetime field does not compose its arithmetic out of the time's**:
it adds on the pair, so the day carries, which is `PlainDateTime`'s answer in the same row. Nor
does a difference wrap — `PlainTime` says `23:00` to `01:00` is `-PT22H` — because a span that
crosses midnight belongs to a day, and only the datetime value has one.

### 2. The element is a text field the library formats and parses

[`req-api-platform`](../requirements/api.md#req-api-platform) says a native element wherever
the platform has one. `[pctNumber]` was the first written exception and the date field the
second; the time field is the **third**, and it goes into the requirement's **Exceptions**
field with the date beside it, where the date was missing. The measurement decides it, and
harder than it decided the date:

- **A1–A4: three engines, three sources, and the application owns none.** chromium draws the
  clock in the language of the browser's own interface — the system locale moves it, `lang`
  and the browser locale do not; firefox in its own interface language (`en-US` in the build
  measured); webkit in the browser locale. A Polish application therefore shows `01:05 PM` to
  a Polish user of an English-language Firefox and cannot say otherwise — the date's complaint
  again, without the one source an application could have set, which A4 says was never there.
- **A5–A7: what was typed is not what is read.** A half-typed time reads `""` in firefox and
  webkit, so junk and empty are one value again, and `badInput` — the flag that would tell
  them apart — is `false` in webkit whatever was typed and in firefox after one digit.
  chromium is worse in a new way: `130`, a minute half typed, reads **`13:00`**, a valid value
  nobody entered. And the same five keys, `0130P`, are `01:30` in chromium and `13:30` in
  firefox, because each engine drew a different clock to type them into.
- **A8: one control is a number of tab stops the application cannot see.** Three in chromium
  under a Polish system and four under an English one, where the day period is a stop of its
  own; four in firefox 155 and three in 151; one in webkit; and a `step` with seconds adds a
  stop, one with milliseconds another.

So the field is `<input type="text" inputmode="numeric" autocomplete="off">` with a parser of
its own, the date field's shape, and with the same consequence: what a user typed is **kept**.
Text that is not a time leaves the value `null` and the text where it was, and is reported
through `aria-invalid`, `data-pct-malformed` and the second channel
([0070](0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md)), in a
`timeMalformed` sentence. The parser accepts more widely than it writes, as the date's does:

- any run of non-digits separates — `13:05`, `13.05`, `13 h 05` (D3) and the space before a
  day period, which node's ICU writes as U+202F and every browser as U+0020 (D4);
- the locale's own digits count beside the ASCII ones (D5);
- a single run of three or four digits is read by width — `905` is `09:05`, `1305` is `13:05`
  — because the keypad `inputmode="numeric"` raises on a phone may offer digits and nothing
  else;
- a 24-hour time is accepted in a 12-hour field, which is how such a keypad reaches the
  afternoon.

### 3. The language decides the clock, and one formatter answers for all of it

The hour cycle, the day-period words and where they stand are facts about the language the
field is in — `en-US` writes `1:05 PM`, `en-GB` `13:05`, `en-CA` `1:05 p.m.` and `fr-CA`
`13 h 05` — so they come from `Intl` for the field's `locale`, the way the date's order does,
and never from `PCT_TEXTS`. C1 says the reading is the same in all four sources for every
locale measured but two; C3 says no region prefers `h11` or `h24`; C4 says the formatters agree
in every region all four can format. Nothing here has to be written down, which is the
opposite of the first day of the week.

What has to be decided is **which** `Intl` answer, because there are two now and they part.
`getHourCycles()` (C2) answers for the region, is absent from firefox 151, and returns the
preferred cycle alone in two engines and every allowed one in the third. The formatter's
`resolvedOptions().hourCycle` answers for the language it actually resolved — and C5 is where
the two disagree: chromium does not carry the language of 44 of the 280 regions — Icelandic,
Armenian, Georgian, Burmese and Nepali among them — and formats them in `en-US`, so in chromium
`my-MM` is `h23` by `getHourCycles()` and `1:05 PM` by the formatter.

**The formatter wins, and it is the only source.** The cycle, the period words and their place,
the separators and the digits are all read off one `formatToParts`, so the field, its hint and
its panel cannot disagree with one another — the date's rule that the two halves of one control
never argue about the year, applied to the hour. 0043's D4 (`my-MM` in `latn` in chromium) is
this same fallback, seen through the numbering system.

- **No `hourCycle` input.** A clock the application wants forced is a locale:
  `en-US-u-hc-h23` is the platform's own spelling of "this reader counts to 24", and C7 says
  all three engines honour it. The field never passes `hour12`: C6 says it means `h11` in
  Japanese and overrides `hourCycle` when both are given, and the one place the engines still
  part is `-u-hc-h24` under `hour12: false`.
- **The four cycles are four labels on one value.** `h11` writes the first hour `0`, `h12`
  writes it `12`, `h24` writes it `24`; the value is `00:05` under all of them, and the panel's
  hour column lists the labels the cycle writes.
- **The format hint has the date's two owners**
  ([0043](0043-a-day-is-not-an-instant.md) §6). The order, the separators and the period's
  place are the formatter's; the letters are words — `h`, `m`, `s` in English, `g`, `m`, `s`
  in Polish — and come from `PCT_TEXTS` (`timeHourLetter`, `timeMinuteLetter`,
  `timeSecondLetter`). The period slot is written with the field's own two words, `AM/PM` or
  `오전/오후`, because unlike a letter they are what the field shows and what it reads back.

### 4. The panel is a dialog of listbox columns, and the columns are a component of their own

E1 and E2 say both readings of a column pass, and E3 to E5 say what does not: a column of plain
buttons is not a listbox, the selected state belongs on the option and not on a button inside
it — the date's E2 again — and a column needs a name of its own. Between E1 and E2 axe does not
choose, and [0032](0032-a-menu-moves-focus-a-listbox-points-at-it.md) does: a listbox points at
its active option.

- **The panel is a `role="dialog"` holding one `role="listbox"` per field** — hour and minute,
  and second and day period where the step and the cycle have them — each named, each one tab
  stop, focus on the column and `aria-activedescendant` on the option. The walk is
  `pctListNavigation` from `core`, which 0032 left not knowing which of the two its index is;
  its `wrap` is on, because a column is a ring. Minute `59` comes round to `00` and leaves the
  hour where it was — what the platform's own segments do in two engines of three (A13), and
  what makes a column a field rather than an arithmetic.
- **The panel takes focus** ([0025](0025-a-panel-says-whether-it-takes-focus.md)), and Tab walks
  the columns and then leaves, spliced back onto the field
  ([0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md)). The trigger is a button with
  `aria-haspopup="dialog"` beside a plain textbox (E7), not a combobox, for the date's reason
  ([0035](0035-a-filter-is-a-question-not-a-value.md) read backwards).
- **The columns are a component of their own, `PctTimeColumns`, exported beside the field** —
  what `PctCalendar` is to `PctDate`. The datetime field's panel is one dialog holding a
  calendar and the columns, so the columns are the part it composes; a panel that lived only
  inside `PctTime` would be built twice.

**Not chosen: no panel, and the arrows stepping the segment under the caret.** The platform's
own stepping has no answer to borrow — at `23:59`, `ArrowUp` on the hour gives `00:59` in
chromium and `12:59` in firefox; at `step="900"` the minute goes to `13:20` in one and `13:06`
in the other; webkit steps nothing (A13, A14). Stepping a textbox changes text a reader is
never told has a value. The role that has one, `spinbutton`, is a tab stop per segment (E6) —
A8 again, the very defect the text field is here to remove — and a single spinbutton has no
one number to put in `aria-valuenow`. And the datetime field needs a panel for its day in any
case: a time half with keys of its own in the text would be the only such field in the library,
where the date's card says the field adds no key at all.

### 5. The contract: bounds and a step, both in the value's own terms

- **`min` and `max` are `PctTime`s** through the `FormUiControl` contract, as the date's are
  `PctDay`s, so with `[formField]` the directive fills them. They clamp the panel's walk — an
  option outside them is disabled — and **never rewrite what was typed**: a bound clamps a
  movement, and a sentence is not one. **`min` later than `max` is a window across midnight**,
  `22:00` to `06:00`. The HTML specification gives a time input that reading and A12 says all
  three engines implement it — `12:00` is under **and** over. A time without a date has no
  other way to say "the night shift".
- **`step` is in seconds**, like the native attribute and like `[pctNumber]`'s, which is in its
  value's own unit: 60 by default, a positive whole number, counted from `min` when there is
  one (A11). It decides what the columns offer — `step="900"` is the minutes `00 15 30 45` —
  whether a seconds column exists and the value carries `:ss`, and nothing about typed text.
- **A time off the step is a time, and the form's to refuse.** `13:05` in a quarter-hour field
  is not junk: the native element keeps the value and flags `stepMismatch` beside it (A11), and
  so does this field — the value is written, nothing is snapped, and no sentence goes on the
  second channel, which 0070 opened for text that is **not a value at all**. The module exports
  the predicate (`pctTimeOnStep`), so that a validator and the columns agree about what "on the
  step" means. A11's third reading is the reminder that the step is never absent: with none
  written, the platform calls `13:05:30` a mismatch, because its default step is a minute.
- **No `timeDisabled` in the first version**, for three reasons. A predicate asked of every row
  is cheap over a month of 42 cells and is not over 1440 minutes; the cases it would serve —
  opening hours, taken slots — are a window, which the bounds already are, or a short list of
  slots, which is a `PctSelect` with times as options rather than a free time; and a slot is
  taken on a **day**, so the question has a whole answer only in the datetime field. A predicate
  shipped on the time now would fix its signature before the control that needs it has said
  what it needs.

### 6. The entrypoint is `./time`, and `./datetime` comes after it

`@pacit/components/time` holds `PctTime`, `PctTimeColumns` and the value module, and
`@pacit/components/datetime` follows it, importing both its neighbours. Not a growth of
`./date`, and the hard reason is the token name: `--pct-{component}-…` names the
**entrypoint** ([`req-token-names`](../requirements/tokens.md#req-token-names), `check-tokens`
point 3 — the `$comment` in `libs/tokens/src/component.date.json` says it of the calendar), so
a time field shipped inside `./date` would be painted with `--pct-date-*`, with no tier of its
own and no card to say so. The datetime field's panel will in turn be painted by the tiers of
the entrypoints it borrows from: a theme that restyles the calendar restyles it there too,
which is the point of borrowing it.

**The digits move to `./core`.** `digitsOf` and `numberFormat`, private in
`libs/components/date/src/locale.ts`, are the reader's-digits fact the time needs as well, and
`[pctNumber]` already holds a third spelling of it (`digits` in
`libs/components/field/src/number.ts`), read off the number formatter's numbering system where
the date reads the date formatter's — C5 and D5 say why the two can differ. One home
([0017](0017-one-home-per-fact.md)) is `core`, with the numbering system as a parameter. What
the move costs is `check-bundle`'s to say, in the task that builds the value module: `./core`
is paid for by every entrypoint, so the move is measured before it is merged rather than
assumed free.

### 7. The card's pattern is the textbox and dialog of the Date Picker Dialog

The APG has no time picker, and a card's head has three shapes to say what it implements
([`_template.md`](../components/_template.md)). `none` would claim that no pattern applies and
none was invented, and two apply. A bare link to the Date Picker Dialog would claim the grid
this field does not have. The qualified link is the honest one —
**`the textbox and dialog of [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)`**
for `PctTime`, and for the datetime field, whose dialog holds both; and
**`[Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)`** for `PctTimeColumns`, one
per column. The content pass keeps a qualifier before the link
(`apps/docs/tools/build-content.mjs`), so the sentence the page builds claims the part
implemented and no more.

## What this costs us

- **The value is a `string`,** so the compiler will not stop `'1:05 PM'` being passed to it.
  `isPctTime` guards every read, as `isPctDay` does; the brand 0043 refused for the day is
  refused here for the same reason.
- **The clock is the formatter's, also where the engine is wrong.** In chromium a Burmese,
  Nepali, Icelandic or Armenian field is a 12-hour field in English (C5), and in webkit a Korean
  one says `AM`/`PM` (D2). That is what the same engine's own `Intl` writes on the same page;
  the field agrees with the page rather than with a table this repository would have to keep
  against three engines.
- **The unit suite and the browsers read two ICUs.** Node's 78.3 writes U+202F before `PM`
  where all three browsers write a space (D4), so a unit case that compares formatted text
  compares node's, and the parser's tolerance of both is a rule rather than a courtesy.
- **The parser is ours** — a period word, a run of digits read by width, four cycles — and it
  is measured by round trip over the locales of C1, as the date's is over ten.
- **The step is not snapped,** so a typed `13:05` in a quarter-hour field stands until the
  form says otherwise; an application with no validator for it keeps a value off its own step.
- **`24:00` is not a `PctTime`.** A shift that runs to midnight is written `max="23:59"` or as
  a window, and an end-of-day boundary in a server's data is translated on the way in.

## The road not taken

**`<input type="time">` with the field setting `lang`.** That is what 0043's A1 promised
chromium honoured; A4 says chromium follows `lang` on a form control only behind a switch that
is off in every browser a user runs.

**A wrapper around the native element, with our panel over the platform's.** It fails on
A1–A3 anyway — the field would still show a clock the application cannot choose — and A9 says
`showPicker()` exists in all three engines, so there would be two pickers on one control.

**`Temporal.PlainTime` as the value.** The right type, in every engine of the run (B1) and in
none of the oldest engines Angular 22 supports. A polyfill in a peer dependency is a decision
about the consumer's bundle taken on their behalf ([0013](0013-no-headless-split.md)), and
`HH:mm` is what `PlainTime` reads and, asked for minutes, writes.

**A number of seconds since midnight** (`valueAsNumber` is `47100000` for `13:05`). It would let
the numeric `min()` and `max()` validators of signal forms work unchanged, which is the one
real argument for it; and it is a number nobody can read in a payload, a query string or a log,
while the date's bounds already travel through the same contract as strings.

**The region's own cycle where the engine lacks the language** — `getHourCycles()` for the 44
regions of C5 in chromium. It would give a Burmese reader 24 hours in English digits, at the
price of a cycle from one source and words from another: the field disagreeing with itself in
exactly the engine the patch was for, through a method firefox 151 does not have.

**An `hourCycle` input.** The tag already carries one (`-u-hc-`, C7), and an input would be a
second way of saying it that could disagree with the first.

**A `spinbutton` per segment.** Clean in axe (E6), and three tab stops — the native element's
defect, rebuilt by hand.
