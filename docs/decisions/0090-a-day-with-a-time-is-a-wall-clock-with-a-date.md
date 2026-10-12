# 0090 — A day with a time is a wall clock with a date, and the field that takes one is two texts under one label

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-number`](../requirements/api.md#req-api-number),
[`req-api-day`](../requirements/api.md#req-api-day),
[`req-api-time`](../requirements/api.md#req-api-time),
[`req-api-container`](../requirements/api.md#req-api-container),
[`req-api-message`](../requirements/api.md#req-api-message),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-project-entrypoints`](../requirements/project.md#req-project-entrypoints)
**Evidence:** thirty rows of readings over the three engines this repository runs
(chromium 153.0.8010.12, firefox 155.0, webkit 26.6 — Playwright 1.63.0), each on a page the
engine really parsed and every reading written down with the conditions it was taken under,
plus node's own ICU (78.3, CLDR 48) — the "Measurement" section below. In short:
`<input type="datetime-local">` takes a whole day with no time for **no value at all** in the
two engines that took the keys, and in the third no typed digit reached it; it accepts
**02:30 on 29 March 2026** and **02:30 on 25 October** in Warsaw, a minute that does not
exist and one that exists twice, and its `valueAsNumber` is the fields
read in UTC — the input knows no zone; its own `stepUp()` at `23:59` **carries the day** in all
three where the time input's stops or wraps; a reversed pair of bounds is **no window** on a
datetime where it is one on a time; a local `Date` answers 02:30 on 29 March with **03:30**
and `Temporal.PlainDateTime.from` **drops an offset** it is handed, in silence, in all three;
52 locales write a day and a time as the day's own text, a literal and the time's own text in
**52 of 52**, the time first in one, and the literal is a **word** in Finnish already in the
numeric form; and axe passes two textboxes under one named group whether or not each carries
a word of its own, and refuses them only **with no name at all** — so the word is this
record's rule, not the gate's

## Context

The date field's card has named the next control since its first version: "No time. A day has
none, by construction. A datetime control is a different value type and therefore a different
control." [0086](0086-a-time-of-day-is-a-wall-clock.md) measured the native element for it
(F1 to F7), called the field "the same exception, measured rather than assumed", left its value
"to answer that difference" — the datetime input drops a `:00` the time input keeps — and
deferred one predicate to it: "taken slots, which are taken on a **day**, so the question has
a whole answer only in the datetime field". [0089](0089-one-value-more-than-one-control-and-the-consumer-chooses.md)
settled that it composes the columns in their `list` shape and takes `picker` when 1.7 lands.
What is left is the questions a day alone and a time alone never had to meet together:

1. **What is the value?** A day and a time — and what of the zone, which a day never met and
   a time met only to refuse: the minute a switch skips and the hour it repeats are now a
   value with a date on it.
2. **What element takes it?** The third native input the library measures, and a question the
   first two never had: one text for the pair, or two.
3. **What is a day without a time?** A value, a half, or nothing.
4. **What is the panel,** when one dialog holds a grid that closes on a pick and columns that
   close on a pick, and what does the walk through both look like.
5. **What does the contract carry** — bounds on a pair, a step, the day's predicate and the one
   0086 deferred.
6. **Where does it live.**

## The measurement

Playwright, `page.setContent` on each of the three engines, `axe-core` 4.13 with the
`wcag2a wcag2aa wcag21a wcag21aa wcag22aa` tags and every probed target given a 24 px floor,
screenshots compared byte for byte and read by eye where a rendering was the question. Every
reading was taken under **one** set of conditions, recorded beside it: browser locale `en-US`,
`lang="en-US"` on the root, `Europe/Warsaw`, the browser process started under an English
system locale (`LANGUAGE=en_US:en`), focus on a button before the control — and a row says
so where it moved one of them. "System locale" is the browser process's `LANGUAGE`, `LANG` and
`LC_*`; `pl_PL` below is the same harness with the four switched together.

| #   | probe                                                                                                                                                                                                                | chromium 153                                                                                                                                             | firefox 155                                                                      | webkit 26.6                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A1  | `<input type="datetime-local" value="2026-12-01T13:05">` under `lang` · a browser locale · a system locale of `pl` against `en-US`                                                                                   | identical · identical · **differs** (`12/01/2026, 01:05 PM` / `01.12.2026, 13:05`)                                                                       | identical · identical · identical                                                | identical · **differs** (`…, 1:05:00 PM` / `…, 13:05:00`) · identical                                                  |
| A2  | a whole day typed and nothing of the time: `.value` · `badInput` · whether the keys drew anything, by the pixels against the focused empty input                                                                     | `""` · `true` · the day drawn                                                                                                                            | `""` · `true` · the day drawn                                                    | `""` · **`false`** · **nothing drawn**                                                                                 |
| A3  | the day, a Tab onto the hour, then `1305` · `0105P` · `130` · `0130P`                                                                                                                                                | `…T13:05` · `…T13:05` · **`…T13:00`** · `…T13:30`; under `pl_PL` **`2026-01-12T13:05`** · **`…T01:05`** · `…T13:00` · `…T01:30`                          | `""` — the Tab does not land on the hour                                         | `""` — the Tab leaves the control                                                                                      |
| A4  | `1305` · `0130P` · `130505` typed straight on from the day's eight digits                                                                                                                                            | `""` · `""` · `""`; under `pl_PL` `""` · **`202601-01-12T03:00`** · **`202613-01-12T05:05`**                                                             | `…T13:05` · `…T13:30` · `…T13:05`                                                | `""` · `""` · `""`                                                                                                     |
| A5  | tab stops between two buttons with one input between them: default · `step="1"` · `step="0.001"`                                                                                                                     | **7** · 8 · 9; **6** under `pl_PL`                                                                                                                       | 7 · 8 · 9                                                                        | **1** · 1 · 1                                                                                                          |
| A6  | `showPicker()`                                                                                                                                                                                                       | function                                                                                                                                                 | function                                                                         | function                                                                                                               |
| A7  | `.value =` `'…T13:05:00'` · `'…T13:05:30'` · `'2026-12-01 13:05'` · `'…T24:00'` · `'2026-02-30T13:05'` · `'…T13:05Z'` · `'…T13:05+01:00'` · `'2026-12-01'` · `'0001-01-01T00:00'`                                    | **`…T13:05`** · `…T13:05:30` (`stepMismatch`) · `…T13:05` · `""` · `""` · `""` · `""` · `""` · kept                                                      | same                                                                             | same                                                                                                                   |
| A8  | `min="…T09:00" max="…T17:00"` with `…T18:00`; `min="…T22:00" max="…T06:00"` of one day with `23:00` · `05:00` · `12:00`                                                                                              | over; **over · under · both**                                                                                                                            | same                                                                             | same                                                                                                                   |
| A9  | `.validity.stepMismatch`: `13:05` at `step="900"` · `12-02T09:00` and `12-02T10:00` at `step="86400" min="12-01T09:00"` · `13:05` at `step="420"`                                                                    | `true` · `false`, **`true`** · `true`                                                                                                                    | same                                                                             | same                                                                                                                   |
| A10 | `ArrowUp` with the input just focused, at `…T23:00` · on the hour (three Tabs in) · on the minute of `…T23:59` · `stepUp()` at `…T23:59` · `stepDown()` at `…T00:00`                                                 | `2026-01-01T23:00` (the month) · `…01T00:00` · `…01T23:00` · **`…02T00:00`** · **`11-30T23:59`**                                                         | `2026-01-01T23:00` · **`…01T12:00`** · `…01T23:00` · `…02T00:00` · `11-30T23:59` | nothing, with focus on the input (it has no segments, and a Tab leaves it) · — · nothing · `…02T00:00` · `11-30T23:59` |
| A11 | `.value = '2026-03-29T02:30'` · `'2026-10-25T02:30'` in `Europe/Warsaw`: `valid` · `valueAsNumber` · `valueAsDate`                                                                                                   | `true` · `Date.UTC` of the fields · `null`                                                                                                               | same                                                                             | same                                                                                                                   |
| B1  | `new Date(2026, 2, 29, 2, 30)` · `new Date(2026, 9, 25, 2, 30)` in Warsaw, read back                                                                                                                                 | **`03:30`** (+02:00) · `02:30` **+02:00**, the earlier of two                                                                                            | same                                                                             | same                                                                                                                   |
| B2  | `new Date('2026-12-01T13:05').toISOString()` · `JSON.stringify` of it · `new Date('2026-12-01').toISOString()`                                                                                                       | `2026-12-01T12:05:00.000Z` · the same · **`2026-12-01T00:00:00.000Z`**                                                                                   | same                                                                             | same                                                                                                                   |
| B3  | `globalThis.Temporal.PlainDateTime` · `.ZonedDateTime`                                                                                                                                                               | function · function                                                                                                                                      | function · function                                                              | function · function — **absent from 26.5** (0086, B1)                                                                  |
| B4  | `PlainDateTime.from('…T13:05').toString()` · with `{ smallestUnit: 'minute' }` · the same from `'…T13:05:30'` · `from('…T13:05').equals(from('…T13:05:00'))`                                                         | `2026-12-01T13:05:00` · `2026-12-01T13:05` · **`2026-12-01T13:05`**, truncated · `true`                                                                  | same                                                                             | same                                                                                                                   |
| B5  | `from('…T24:00')` · `from('2026-02-30T13:05')` · `from({ …, month: 2, day: 30 })` · `from({ …, hour: 24 })` · `from('…T13:05Z')` · `from('…T13:05+01:00')`                                                           | `RangeError` · `RangeError` · **`02-28`** · **`23:00`** · `RangeError` · **`…T13:05:00`, the offset dropped**                                            | same                                                                             | same                                                                                                                   |
| B6  | `from('2026-03-29T02:30').toZonedDateTime('Europe/Warsaw')` by default · `earlier` · `reject`; `from('2026-10-25T02:30')…` by default · `later` · `reject`                                                           | `03:30+02:00` · `01:30+01:00` · `RangeError`; `02:30+02:00` · `02:30+01:00` · `RangeError`                                                               | same                                                                             | same                                                                                                                   |
| B7  | `from('…T23:30').add({ minutes: 45 })` · `from('2026-01-31T13:05').add({ months: 1 })` · `from('…T23:00').until(the next day's `01:00`)`                                                                             | **`2026-12-02T00:15:00`** · `2026-02-28T13:05:00` · `PT2H`                                                                                               | same                                                                             | same                                                                                                                   |
| B8  | `PlainDateTime.from('2026-03-29T02:30').toLocaleString('pl-PL')` · `new Date(2026, 2, 29, 2, 30).toLocaleString('pl-PL')`                                                                                            | `29.03.2026, 02:30:00` · **`29.03.2026, 03:30:00`**                                                                                                      | same                                                                             | same                                                                                                                   |
| B9  | `Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', … }).format(new Date(Date.UTC(2026, 2, 29, 2, 30)))` · `PlainDateTime.toLocaleString(locale, { hour: '2-digit', … })` against it over 52 locales                    | `29.03.2026, 02:30` · **differs in 22** — every 12-hour locale, `1:05 PM` for `01:05 PM`                                                                 | `29.03.2026, 02:30` · 52 equal                                                   | `29.03.2026, 02:30` · 52 equal                                                                                         |
| C1  | `formatToParts` of a day and a time, numeric fields, over 52 locales: which half comes first                                                                                                                         | the day in 51, the time in 1 (`vi-VN`: `13:05 01/12/2026`)                                                                                               | same                                                                             | same — and node's own                                                                                                  |
| C2  | the combined text against the day's own text, a literal and the time's own text                                                                                                                                      | **52 of 52** compose; the literal `, ` in 34, a space in 15, `، ` in 2 and a **word** in 1 (`fi-FI`: `01.12.2026 klo 13.05`)                             | same                                                                             | same — node writes U+2009 in `zh-TW` and `zh-HK`, every browser a space                                                |
| C3  | the same with `dateStyle: 'long', timeStyle: 'short'`: what stands between the halves                                                                                                                                | a word in **39** of 52 (`at`, `um`, `à`, `kl.`, `в` …) — six of them chromium's English — and in `hi-IN`, `mr-IN` and `vi-VN` the time inside a sentence | a word in 35                                                                     | a word in 35                                                                                                           |
| C4  | locales the engine writes in the browser's default                                                                                                                                                                   | **6** (`my-MM`, `ne-NP`, `ka-GE`, `hy-AM`, `is-IS`, `sq-AL`: `12/01/2026, 01:05 PM`) — 0086's C5; `az-AZ` a CLDR apart                                   | 0                                                                                | 0                                                                                                                      |
| E1  | axe: `role="group"` named by the label; two textboxes each named by the label **and** a word of its own; a button `aria-haspopup="dialog"`; a `role="dialog"` holding a `role="grid"` and two named `role="listbox"` | clean — 3 tab stops with the panel closed, 6 open                                                                                                        | clean                                                                            | clean                                                                                                                  |
| E2  | the two textboxes named by the label alone                                                                                                                                                                           | clean                                                                                                                                                    | clean                                                                            | clean                                                                                                                  |
| E3  | the two textboxes with no name of their own, the group named                                                                                                                                                         | **`label` (critical)** on both                                                                                                                           | same                                                                             | same                                                                                                                   |
| E4  | one textbox for the pair, the button and the same dialog                                                                                                                                                             | clean — 5 stops with the panel open, one fewer than E1                                                                                                   | clean                                                                            | clean                                                                                                                  |
| E5  | E1 with `<fieldset>` and `<legend>` for the group · with `aria-modal="true"` on the dialog                                                                                                                           | clean · clean                                                                                                                                            | same                                                                             | same                                                                                                                   |
| F1  | node: a predicate over a `Set` of taken slots asked for every minute of one day on the default step, every question counted, the hour rows derived afterwards                                                        | 1 440 questions, answered in **0.4 ms** on the first run, then 0.2 and 0.1                                                                               | —                                                                                | —                                                                                                                      |

A3 and A4 are 0086's F2, F6 and F7 met again under one harness: in chromium the same eight
digits are 1 December under an English system and 12 January under a Polish one, a Tab after
the year is the only way onto the hour, `130` is `13:00`, and without the Tab the year takes the
digits, six of them. They stand here because the row that this record needs is A2, and A2 is
only readable beside them: a whole day with no time is **no value** in chromium and firefox,
where the keys drew the day. Webkit's input took no typed digit in this harness at all — not
in A2, where no pixel moved against the focused empty box, nor in A3 or A4 — so its `""` with
`badInput` false is the control's silence and not a half-typed day; it is one stop that a Tab
leaves (A3, A5), and 0043's A3 and 0086's F2 read the same `""` off it.

## The decisions

### 1. The value is a day and a time, written `YYYY-MM-DDTHH:mm` — and its arithmetic carries the day

B1 is 0086's B6 met again, with the overlap beside the gap, and the pair does not fare better
than the time did. A local
`Date` cannot hold 02:30 on 29 March 2026 in Warsaw — `new Date(2026, 2, 29, 2, 30)` answers
**03:30** without a word — and it holds 02:30 on 25 October **twice** and picks the earlier
without one either. B2 is the day's B2 with an hour: the string the native input itself writes,
put into a `Date` and serialised, comes back as `12:05Z` — an hour off for every user east of
Greenwich — while the day-only string beside it is read as UTC: two rules in one constructor.
And A11 says the platform's own input never asks: both minutes are valid, `valueAsNumber` is
the fields counted in UTC, `valueAsDate` is `null`. A day with a time is what a clock on the
wall shows, with the date beside it — no zone — and an instant is neither.

`Temporal.PlainDateTime` is exactly that type, and B3 is 0086's B1 again: in all three engines
of this run and absent from webkit 26.5, which Angular 22 still supports
([0084](0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)). So the
value is a string, and `PctDateTime` names it:

- **`YYYY-MM-DDTHH:mm`, or `…:ss` where the field's step has seconds in it** — a `PctDay`, a
  `T`, a `PctTimeOfDay`. It is what `<input type="datetime-local">.value` carries, what
  `PlainDateTime.from` reads and, asked for minutes, writes (B4), and what SQL stores as a
  timestamp without a zone. The `T` and not a space: the input accepts a space and writes a
  `T` (A7), `Temporal` reads both and writes one (B4). The two shapes are one value, as the
  time's are: the input drops a `:00` (A7), `PlainDateTime.toString()` writes one and
  `PlainDateTime` calls the two equal (B4) — so the value keeps the shape it was
  given, compares equal across the two, and widens to seconds only where a result has seconds
  the shape could not carry. B4's third reading is why the value module never rounds: asked for
  minutes, `Temporal` **truncates** `13:05:30` to `13:05`.
- **`null` is empty**, as `PctDay | null` and `PctTimeOfDay | null` are.
- **The guard is a parser, not a `from`.** `isPctDateTime` refuses `24:00`, 30 February, a
  fraction, a `Z` and an offset — and B5 says why the last two are listed out loud:
  `PlainDateTime.from('2026-12-01T13:05+01:00')` does not throw, it **drops the offset** and
  answers `13:05`, so a guard built on `from` would admit a string that names an instant as if
  it named a wall clock. The object forms constrain as 0086 found (`hour: 24` is `23:00`;
  `day: 30` in February is the 28th) where the string forms throw.
- **The module composes the two it stands on.** `pctDateTime(day, time)` joins a `PctDay` and
  a `PctTimeOfDay`; `pctDateTimeParts` splits one back into the two; the day's domain is the
  pair's (A7 keeps `0001-01-01T00:00`, and the far end
  [0043](0043-a-day-is-not-an-instant.md) refuses at the day). Nothing a `pctDay` or a
  `pctTimeOfDay` already does is written a second time
  ([0017](0017-one-home-per-fact.md)).

**The arithmetic is on the pair, and the day carries.** `23:30` plus 45 minutes is `00:15 the
next day` — `PlainDateTime`'s answer (B7), and the platform's own: `stepUp()` on a datetime
input at `23:59` is **the next day's `00:00` in all three engines** (A10), where the same call
on a time input stops in two and wraps in the third (0086, A15). The segment arrows are no
counter-reading — chromium rolls the hour from 23 to 00 on the same day, firefox from 11 PM to
12 PM, and webkit's input, which has no segments, moves nothing on an arrow — because a segment
is a field and a field has nowhere to carry to;
the value does. A month added to 31 January lands on the 28th of February, which is the day's
own `pctAddMonths` (B7's middle reading); a difference is signed and does not come round,
because a span between two dated clocks has a sign.

**The value knows no zone, so the field refuses neither the gap nor the overlap.** 02:30 on
29 March 2026 is a `PctDateTime`, as it is a value of the native input (A11): the control cannot
know whether the event is in Warsaw, and in Lisbon the minute exists. Turning the pair into an
instant belongs to the application, which knows where the event is, and B6 is what it has to
decide there: `toZonedDateTime` moves the gap forward and takes the earlier of the overlap by
default, and `reject` throws on both — a **policy**, with a parameter, that a form control has
no business choosing. The value module ships `pctDateTimeAsUtc` — the pair as a `Date` in UTC,
which is how the field formats it (B9's first reading, exact in all three engines, and
[0043](0043-a-day-is-not-an-instant.md)'s `pctDayAsUtc` with an hour) — and no helper to an
instant in a zone: where `Temporal` is, `PlainDateTime.from(value).toZonedDateTime(zone, …)`
is one call and names its policy; where it is not, `new Date(y, m, d, h, mi)` is the
application's, and B1 is what it answers.

**Not an instant.** [0043](0043-a-day-is-not-an-instant.md)'s B2 argument, with an hour on it:
a `Date` built from the five fields a user picked and serialised with a `Z` is `12:05Z` in
Warsaw (B2); stored so, and read on a machine in another zone, it is another wall clock — a
meeting at 13:05 that the calendar in Lisbon shows at 12:05 and the one in Kiev at 14:05, with
no error, no warning and no red test.

### 2. The field is two texts under one label, one button and one dialog — and the container is the control

[`req-api-platform`](../requirements/api.md#req-api-platform) names "the time and datetime
fields to come" among its exceptions on 0086's word; this record is the measurement behind the
second of them, and it is the time field's case met a third time:

- **A1: three engines, three sources, and the application owns none.** The clock and the order
  move with the browser's interface language in chromium, with the browser locale in webkit and
  with neither in firefox — `lang` moves none of them.
- **A2 to A4: what is typed is not what is read.** A whole day with no time is `""` in the two
  engines that took the keys, and webkit took none; `130` is `13:00` in chromium; the same
  eight digits are two days by the system's locale; and the year takes six digits in chromium, so a day and a time typed
  in one run are the year 202613.
- **A5: one control is seven stops, or nine, or six, or one.**

So the field is text the library formats and parses, and the question the first two fields
never had is **how many** texts. One is clean in axe and is two tab stops (E4). Two it is, and
for three reasons the measurement reaches and one it does not:

- **The two parsers exist, and a third would read a literal.** The day's parser is measured
  over ten locales and the time's over 38 — and C2 says what a parser of the pair would have to
  read between them: a comma in 34 locales, a space in 13, an Arabic comma, and in Finnish the
  **word** `klo`, already in the plainest numeric form; in the long styles (C3) it is a word in
  35 of 52 and in three languages the time stands inside a sentence. Two texts read the two
  halves with the two parsers the library has, and the literal is never written, parsed or
  translated. The hint, likewise, is the day's hint and the time's hint — two texts with the
  two owners [0043](0043-a-day-is-not-an-instant.md) §6 gave them — and not a third with a
  comma that is a word in Helsinki.
- **What a user typed is kept.** A day picked in the panel rewrites the day's text and leaves
  the time's as the user wrote it; in one text the pick would rewrite the whole line and
  reformat the half the user typed, which is the rule the date field was built on broken by the
  field's own panel.
- **A half is reported as a half.** `31.02.2026` beside a good time says `dateMalformed`, keeps
  the time, and opens the calendar on the typed month; one text would be junk whole. The two
  sentences are the ones the date field and the time field already own, so no key is added for
  them, and when both halves are junk the day's sentence stands — one message line
  ([`req-api-message`](../requirements/api.md#req-api-message)), the day's half first.
- **Each text has a name of its own.** E3 is the row that decides it: two textboxes under a
  named group with no name of their own are a **critical** `label` violation in all three
  engines — the group's name does not reach the inputs. E2 says axe is content when both carry
  the field's label alone, and that is exactly why the rule is written here rather than left to
  the gate: a reader arriving on the second textbox has to be told it is the time. So each text
  is named by the field's label **and** a word of its own — `datetimeDay` and `datetimeTime`
  in `PCT_TEXTS`, two keys — and the hint describes both.

**The container is the control** ([`req-api-container`](../requirements/api.md#req-api-container)):
`pct-datetime` implements the contract once, for one value, with one label, one message line,
one `touch` on leaving the whole, and the two textboxes are two halves of it and not two
controls — the radio group's shape, on text. Each half commits on its own blur, as the date and
the time fields do, so a day typed and left for the time half already moves the calendar's
cursor; the sentences that need the whole — the incomplete one of §3 — wait for the control to
be left. Both texts are `<input type="text" inputmode="numeric" autocomplete="off">`, the shape
the two fields have, and they stand **in the formatter's order**: the day first in 51 of the 52
locales and the time first in Vietnamese (C1), read off a `formatToParts` of the pair beside
the two formatters that write the halves, so the field agrees with what its language writes.
The toggle is one button, `aria-haspopup="dialog"`, named by a key of its own
(`datetimeOpen`), and E1 is the
whole shape clean in all three engines: three tab stops with the panel closed, against the
native element's seven, nine, six or one (A5).

### 3. A day without a time is no value yet, and the field says so

A2 is the platform's own reading and this record keeps it: a whole day with nothing of the
time is `""` — no value — in both engines that took the keys. The pair's value is `null` until both halves
hold one, and nothing is filled in on the user's behalf: a `T00:00` nobody entered would be
chromium's `13:00` (A3) rebuilt on purpose.

What the platform does not do is **say so**. A required field with a day in it and no time
has a `null` value, and the form says "required" over a date the user can see — the sentence
[0070](0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md) was written
for, since the control knows the pair is half and the form cannot tell a half from an empty.
So the second channel carries a third sentence, `datetimeIncomplete`, one `PCT_TEXTS` key,
written when focus leaves the whole control with one half holding a value and the other empty,
ahead of the form's errors and gated by no touch, and taken back on the first keystroke in the
empty half or a value arriving from outside — 0070's three moments. It is a sentence about what
is on the screen, so it stands whether the field is required or not: a day alone is not a
value of this field, and the user either completes it or clears it. One half junk and the other
empty is the junk's sentence, not this one: text on the screen that is not a value comes before
a value that is missing, and the incomplete sentence waits until both halves parse.

The panel follows the same rule from the other side. A day picked with the time half empty
writes the day's text and no value; the columns stand on the current hour, active and not
chosen, as 0089 has them open with no value; a time picked with the day half empty, the
mirror. The value appears the moment both halves hold one, whichever was last.

### 4. The panel takes focus on the grid, a pick in the grid moves on, a pick in the columns closes

One `role="dialog"` holding `PctCalendar` and `PctTimeColumns` — E1 says the shape passes,
and E5 that neither a `fieldset` for the group nor `aria-modal` on the dialog changes the
reading. The panel takes focus ([0025](0025-a-panel-says-whether-it-takes-focus.md)), and the
date field's rule says where: on the grid's cell — the held day, or today — because the day is
the first half. Tab walks the grid, then the columns one stop each, and off the last it closes
and is spliced back onto the field ([0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md));
Escape closes it with the value as the halves left it, the time field's reading, since the
columns write as they walk.

The two halves close differently on a pick today — the calendar's `Enter` takes the day and the
date field closes; the columns' `Enter` takes the time and the time field closes — and one
panel cannot do both. So: **a pick in the grid writes the day and hands focus to the hour
column; a pick in the columns writes the time and closes the panel.** The day is the first
half, and a pick on it is an answer to the first question with the second one next; the time is
the last, and a pick on it is the pair complete. Shift+Tab from the hour column is the way back
to a day picked wrong, and a click on a day is the same move as `Enter` on it, so the pointer
and the keyboard tell one story. The outside click and `Escape` are the overlay's own, one
owner each ([0024](0024-the-closing-stack-is-the-dependency-s.md)).

**What this does not decide: how many Escapes.** Plan finding 4.82 binds here: under NVDA the
time field's panel took two Escapes, because a `role="listbox"` puts the reader in focus mode
and focus mode keeps the first, while the date's grid let its Escape through. The panel of this
record holds both, so a reader may close it one way from one half and another from the other.
No probe on this desk reaches a reader, so the record names the measurement instead of
guessing: the three readers walk the built panel from the grid and from a column, and if the
columns keep their second Escape there, 0086's E2 — the option focused by a roving `tabindex`
rather than the column — is the other reading axe passed, to be measured in the columns' own
entrypoint, and the datetime card says what was found either way.

### 5. The contract: bounds on the pair, the time's step, the day's predicate — and the one 0086 deferred

- **`min` and `max` are `PctDateTime`s**, on the `FormUiControl` contract as the day's and the
  time's are, with the caveat the time card carries, and the date card in part: Angular
  22.2's `min()` and `max()` take numbers, no rule binds a limit of this type, and the
  compiler refuses the attribute beside
  `[formField]`. They **clamp the walk and never rewrite what was typed** — a bound clamps a
  movement, and a sentence is not one. Their **cast** is what is new: the calendar gets the day
  of each bound, and the columns get the time of a bound **only on the bound's own day** — on
  1 December from 09:00 the hours before nine are refused when the chosen day is 1 December and
  on no other day — so a day on the edge narrows the hours, and a day inside the window leaves
  them whole.
- **A reversed pair is not a window.** The time field reads `min="22:00" max="06:00"` as the
  night shift, because a time without a date has no other way to say it; a datetime has — the
  shift is `22:00` on one day to `06:00` on the next, and A8 says the platform reads a reversed
  pair on a datetime as what it is, a contradiction: `23:00` over, `05:00` under, `12:00` both.
  So `min` later than `max` is a dev-mode warning, and the field behaves as if it had no bounds.
- **`step` is the time's** — seconds, 60 by default, the same whole numbers a column can list
  ([0086](0086-a-time-of-day-is-a-wall-clock.md) §5), deciding the seconds column and whether
  the value carries `:ss`, and nothing about typed text. **It counts from midnight, on every
  day.** The time field counts its step from `min` (0086 §5, the platform's own reading for a
  time), and the platform counts a datetime's from `min` across days too (A9) — which, for a
  step that divides a day, is one set of minutes on every day, the bound's own: `min` at 09:05
  with a quarter-hour step would make `:05`, `:20`, `:35` and `:50` the minutes of the whole
  year. A bound is a day and a time of it, not a phase, so the lattice is the day's, and a bound
  that is not on it is moved **inward** onto it before the columns see it — the first on-step
  time at or after `min`'s, the last at or before `max`'s — so that the columns, which count
  from the bound they are handed, list the same rows on the bound's day as on every other with
  the ones outside the bound removed. When the move crosses — the window on that day holds no
  on-step time, as `min` 09:05 with `max` 09:10 at a quarter-hour step, or a `min` at 23:50 —
  the columns are handed no pair at all but every row refused, never a reversed pair, which
  they read as a window across midnight; that day has no row to pick, and the typed text,
  which no bound rewrites, is the way to a time there, for the form to judge. A9's
  `step="86400"`, one valid minute a day, is a lattice over days and a different control; the
  time's refusal of a step the columns cannot list covers it. A value off the step is kept and
  the form's to refuse, with `pctTimeOnStep` on the time half, counted from `00:00`.
- **`dateDisabled` is the day's predicate, handed to the calendar as it is.** A day it refuses
  is refused whole, hours included.
- **`datetimeDisabled` is the predicate 0086 deferred, and this is the control that needed it.**
  A slot is taken on a day, so the question `(value: PctDateTime) => boolean` has a whole
  answer here: the field closes it over the chosen day and asks the columns' rows — every
  on-step minute of the day, with an hour row refused when every minute of it is. 0086's "one
  hour row is sixty questions" is answered by F1: on the default step it is 1 440 questions
  per day, every one asked, and a `Set` answers them in under half a millisecond. A typed value
  the predicate refuses is kept and the form's to refuse, the bounds' own rule. The predicate
  never reaches the calendar: a day whose every slot it refuses is still a day the grid offers,
  and a consumer who wants that day greyed says so through `dateDisabled`. This gives
  `PctTimeColumns` the input 0086 said it would get once a consumer had said what it needs —
  `timeDisabled`, a predicate on a `PctTimeOfDay`, with the hour rule above — and gives `PctTime` nothing: its three reasons
  stand, and its card's limitation with them.

### 6. The entrypoint is `./datetime`, and the field is painted `--pct-datetime-*`

`@pacit/components/datetime` holds `PctDatetime` and the value module, and imports `./date`,
`./time`, `./core` and `./icon` — the order [0086](0086-a-time-of-day-is-a-wall-clock.md) §6
wrote down, for the reason it gave: a token names the **entrypoint**
([`req-token-names`](../requirements/tokens.md#req-token-names), `check-tokens` point 3), so a
field shipped inside `./time` would be painted `--pct-time-*` with no tier and no card of its
own, and inside `./date` the same in the other colour. The field's own boxes — the two texts,
the button, the dialog — take the new tier; the calendar and the columns inside the dialog keep
theirs, so a theme that restyles the calendar restyles it here too, which is the point of
borrowing it. What the entrypoint costs in bytes is `check-bundle`'s to say in the task that
builds it.

The value and the field are one letter's case apart — `PctDateTime` the string,
`PctDatetime` the class, as `pct-datetime` names it — and the record says so rather than
hiding it: the two are a type and a class, so each of the two mistakes is a compile error
(a class in the signal's type position admits no string; a type in `imports` is no value).
0086's rename, which gave the time's value a name of its own, was forced by a barrel exporting
one name twice; here the barrel exports two names, and a third spelling for the value would be
a name nobody else uses for this string.

### 7. The card's pattern is the Date Picker Dialog, bare

The field holds the APG example whole, through `PctCalendar` exactly as `PctDate` does, so its
head is the bare link the date card carries — what
[0086](0086-a-time-of-day-is-a-wall-clock.md) §7 already said of it — and the columns are
claimed where they live, on their own card, as the listbox they are. The class JSDoc names the
pattern as every card's does.

## What this costs us

- **The value is a `string`,** so the compiler will not stop `'01.12.2026, 13:05'` being
  passed to it. `isPctDateTime` guards every read, as the day's and the time's guards do; the
  brand 0043 refused is refused a third time for the same reason.
- **The field refuses neither the gap nor the overlap of a switch.** A meeting typed for 02:30
  on 29 March in Warsaw is a valid value of this field and does not exist on that wall; the
  application that knows the event's zone is the one that can say so, and B6 is the policy it
  chooses. A field that knew the zone would have to be told it, and would then be wrong in
  Lisbon.
- **Two names, one label heard twice.** A reader walks "Starts, Day" and then "Starts, Time";
  the word is the price of E3, and two more keys travel with `core` on every entrypoint —
  three with the incomplete sentence and four with the button's name, 0070's price paid four
  times here and written down once.
- **A half-filled field says so, always.** There is no knob to let "required" win over "add a
  time", and no way to leave a day alone in this field: a form that wants a day with an
  optional time is a date field and a time field.
- **A reversed bound is an error, not a night shift.** The shift is two datetimes, or a time
  field; a consumer who ported `min="22:00" max="06:00"` from the time field gets a warning
  and no bounds.
- **`datetimeDisabled` is asked per row, per day.** 1 440 questions on the default step every
  time the day changes; cheap for a `Set` and the consumer's problem for a predicate that
  fetches.
- **The clock is the engine's.** In chromium a Burmese, Nepali, Georgian, Armenian, Icelandic or
  Albanian field is written in the browser's default locale (C4) — the same engine's own `Intl`
  on the same page, 0086's cost, paid here on the day half as well.
- **One letter's case between the value and the field.** `PctDateTime` and `PctDatetime` are
  told apart by the compiler, not by the eye.
- **The panel's two halves may close two ways under one reader.** 4.82 is measured on the
  built field, not settled here.

## The road not taken

**`<input type="datetime-local">`.** A1 to A5: three sources for its clock and none the
application's, a whole day with no time indistinguishable from nothing, keys that mean two days
by the system's locale, a year that eats the time, and one control that is seven stops or one.
A6 says `showPicker()` exists in all three engines, so a panel of ours over the platform's would
be two pickers on one control.

**One text for the pair.** Clean in axe and one stop fewer (E4). It would need a third parser
and a third hint, both over a literal that is a comma in Berlin, a space in Paris, a word in
Helsinki and a sentence in Delhi (C2, C3); a pick in the panel would reformat what the user
typed; and a half that is junk would be junk whole.

**Two independent fields under one label** — a `pct-date` and a `pct-time` the application
composes. Two values in the form where there is one; two message lines, two buttons and two
panels; bounds that cannot be cast, because the hour's bound depends on the day the other
control holds; and a half-filled pair the form sees as a filled date and an empty time, with
nobody to say "add a time".

**`Temporal.PlainDateTime` as the value.** The right type, in every engine of the run (B3) and
in none of the oldest Angular 22 supports; a polyfill in a peer dependency is a decision about
the consumer's bundle taken on their behalf ([0013](0013-no-headless-split.md)), and the string
is what `PlainDateTime` reads and, asked for minutes, writes.

**An instant** — a `Date`, or ISO with a `Z`. B1 and B2: a wall clock the user picked, shifted
by whatever zone the machine happened to be in, and shifted back by another on the way out.

**A `timeZone` input, with the field refusing the gap and resolving the overlap.** It would
need the event's zone, which the application has and the control does not, and it would choose
between `compatible` and `reject` (B6) on the application's behalf; and the platform's own
input does neither (A11).

**`T00:00` when a day is picked and no time.** A value nobody entered — A3's `13:00`, made a
feature.

**The reversed pair as a window across midnight,** the time field's reading. A8 says the
platform refuses it on a datetime, and a dated pair has a plainer way to say "the night shift":
two dates.
