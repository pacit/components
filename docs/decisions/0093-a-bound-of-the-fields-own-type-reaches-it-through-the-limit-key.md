# 0093 — A bound of the field's own type reaches it through the platform's limit key, and the module ships the rule

**Status:** accepted
**Implements:** [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-day`](../requirements/api.md#req-api-day),
[`req-api-time`](../requirements/api.md#req-api-time),
[`req-api-datetime`](../requirements/api.md#req-api-datetime) (amended 2026-10-15)
**Evidence:** probes on 2026-10-15 — a throwaway spec beside the library, never tracked, in the
unit suite's environment (`@angular/forms` and `@angular/core` 22.2.1, zoneless) — and a
reading of the package's own declarations and FESM. The durable record is the cases they
became: `libs/components/date/src/date.spec.ts › PctDate — bounds from a signal form` (ten
cases), `libs/components/time/src/time-field.spec.ts › PctTime — bounds from a signal form`
(thirteen), and one case in each of `apps/sandbox-e2e/src/date.spec.ts` and `time.spec.ts`, green
on chromium.

## Context

`PctDate` and `PctTime` take `min` / `max` of their own type — a `PctDay`, a `PctTimeOfDay` —
and a signal form had no way to hand them one. Angular 22.2's `min()` / `max()` take a
number's path; `minDate()` / `maxDate()` take a `Date`'s and read the value with `getTime()`;
and the compiler refuses `min` beside `[formField]` (`NG8022`). 0086 §5 named the way left — a
rule that binds a limit of the field's own type to `MIN` or `MAX` — and left measuring it "for
its own task"; the two cards said no such rule ships.

The platform's `MIN` and `MAX` are `LimitSelectionKey`s: a key whose value is **another key**.
`FieldNode.min` reads `metadata(MIN)()` and then the key it names, and the `[formField]`
directive writes the result into the control's `min` input. The declaration says what the
indirection is for — rules that "bind a `LimitKey` of a specific limit type … matching the
field's type to a generic `MetadataKey`" — and it is `@publicApi 22.0`. Angular's own `min()`
is that: its limit in `MIN_NUMBER`, `MIN` pointed at it, and a validator beside.

## Measurement

| what the form writes                                                 | compiles                                           | reaches the field's `min`                  | grades the value                                        |
| -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `min(p.startsAt, …)`                                                 | no — the path must be a number's                   | —                                          | —                                                       |
| `minDate(p.startsOn, new Date(…))`                                   | no — the path must be a `Date`'s                   | —                                          | forced past the compiler, `errors()` throws `TypeError` |
| `<pct-time [formField] min="09:00">`                                 | no — `NG8022`                                      | —                                          | —                                                       |
| `metadata(p, MIN, () => K)`, `K = createMetadataKey<PctTimeOfDay>()` | no — `TS2322`, a limit key writes `T \| undefined` | —                                          | —                                                       |
| the same, `K = createMetadataKey<PctTimeOfDay \| undefined>()`       | yes                                                | yes, and moves when the rule's signal does | only with a validator written beside it                 |
| `pctTimeBounds`, `pctDayBounds`                                      | yes                                                | yes, and the panel walks inside            | yes                                                     |

And how the shipped rules compose on one path, each reading in either order of the rules:

- **Two rules, 08:00–20:00 and 12:00–14:00** (for the day, the year 2026 and its June): the
  field gets 12:00–14:00. A value outside both carries two errors, one from each rule; a value
  outside the narrow one only, one.
- **`required()` beside them** grades the empty field, which the bounds do not.
- **A side from the rule that has one**: `{ min }`, `{ max }` and a rule whose bound function
  returns `undefined` leave each side to the rules that give it.
- **Days past the year 9999** are compared as days: `10000-01-01` is the later `min` of the two,
  where the strings say otherwise ([`lesson-185`](../lessons.md#lesson-185)).
- **On a clock the sides do not combine one at a time.** The first version handed the field
  the later `min` and the earlier `max`, as Angular's own keys do, and an independent review
  of this change measured where that pair is not what the rules accept:
  `{ min: '18:00' }` and `{ max: '08:00' }` accept no time, and their 18:00 and 08:00 read as
  the night; 08:00–10:00 and 12:00–14:00 accept none either and read as a 22-hour window; the
  night, 22:00–06:00, with `{ min: '23:00' }` handed the field 23:00 to 06:00 and offered
  03:00, which the second rule refuses — the span hands it 23:00 and no `max`; and two
  windows whose gaps do not meet — everything but 06:00–07:00, and everything but
  10:00–23:00 — refused 08:00, which both accept.
- **A bound read off another field can make a pair a window.** One rule with `min` read off
  the opening time and a fixed `max` of 22:00 is, with the opening at 23:00, the stretch from
  23:00 to 22:00 across midnight, and grades a closing at 18:00 inside it. Written as two
  rules, one a side, neither pair is a window, and 18:00 is `minTime`.

## Decision

1. **`./date` ships `pctDayBounds` and `./time` ships `pctTimeBounds`**, each one rule for both
   bounds: `pctTimeBounds(p.startsAt, { min: '09:00', max: '17:00' })`. One rule and not
   Angular's one per side, because the time's window is a property of the pair — `22:00` alone
   is not the night shift — and the day takes the same shape so that the two read alike. A
   side is a value or a function of the field's context, the two shapes `min()` takes; one
   that is not a day or a time is no bound, which is the field's input's own reading.
2. **Through the platform's indirection, not around it.** Each rule binds a key of its own
   type to `MIN` / `MAX`, as `minDate()` binds `MIN_DATE`. The keys are private: the bound is
   read where Angular's are, `f.startsAt().min?.()`.
3. **The rule grades.** `minDay` / `maxDay`, `minTime` / `maxTime`, each carrying the bound it
   broke; a bound is inside, in either shape of a time; a time in a window's gap is both, as the
   native element flags both (0086, A12). Kinds of their own, because Angular's `min` error
   types its `min` as a number. The empty field is `required()`'s, the step is
   `pctTimeOnStep`'s and `dateDisabled` is the calendar's — none of them graded here. The
   `message` is one string or a function of the error, and there is none by default, as with
   Angular's own validators.
4. **Several rules on one path: each grades its own pair.** For the day the field walks the
   later `min` and the earlier `max`, compared as days — the intersection, always; where it is
   empty, `min` is past `max` and the calendar takes no day. For the time the field walks **the
   shortest stretch of the clock that holds every time all the rules accept**: those times
   exactly where they are one run; where they are several, the panel also offers the gaps
   between them but the widest — it never refuses a time the form accepts; where there is no
   time at all, the field has no bounds, because no pair spells "nothing". The span is read
   off every rule's pair at once, so its times are the same in any order of the rules; where
   two rules write one second in two shapes, the field is handed the later spelling.
5. **A bound read off another field goes in a rule of its own** beside a fixed one, so that
   the pair cannot turn into a window when the other field moves. The JSDoc, the example and
   the sandbox say so; the rule cannot, because a window written on purpose looks the same.
6. **The keys are made at the top of the module, marked PURE** — the reason `./core`'s warning
   keys are ([`lesson-252`](../lessons.md#lesson-252)).

## Consequences

- The cards' **Bounds** rows say a signal form gives the bounds through the rule, and the time
  card's "the form's validator alone" goes.
- 0086 §5's open question is closed, and 0086 says so where it asked it.
- `PctDateTime` has the same hole and keeps it: its card still says "the form's validator
  alone". Its value has no window and warns when `min` is later than `max`, so its rule is its
  own to write. _Amended 2026-10-15: written — `pctDateTimeBounds`, below._

## What this costs us

- **Eight exports**, four per module: the rule, its configuration, a bound and the error.
- **Bytes.** An application importing the whole entrypoint pays `./date` +709 B, `./time`
  +1405 B — some 630 of them the span — and `./datetime` +242 B (`size.snapshot.md`). One
  importing `PctTime` alone pays +132 B, and that is the import line of six names from
  `@angular/forms/signals`: the probe keeps it because Angular is external there. The rule's
  code itself is shed.
- **A cast in each rule**, `as unknown as LimitKey<TValue>`: the platform asks for a key of the
  path's value type, and TypeScript cannot equate it with the key's while `TValue` is a
  parameter.
- **A habit broken**: Angular's rules take a side each, these take both — and a pair of them
  becomes a window where a side read off another field passes the fixed one, unless the two
  are written as two rules. Their `message` is a function of the error, not of the context,
  and there is no `when`: `applyWhen()` is the platform's for that.
- **A span on the clock**, some forty lines of interval arithmetic in `time-field.ts`, where the
  day needs two comparisons. Where the times the rules accept are several runs, the panel
  offers the gaps between them but the widest, and the form refuses those; where there are
  none, the panel offers every time.

## What would overturn it

Angular shipping a rule for a limit of any comparable type, or `minDate()` taking the string a
day is. The rule would then become a wrapper or go, through a deprecation. The
`@ts-expect-error` case in `date.spec.ts` turns red the day `minDate()` accepts a `PctDay`'s
path.

## Alternatives considered

| alternative                                                            | why rejected                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A rule per side, `pctMinTime` and `pctMaxTime`, as Angular's           | the window is graded from both bounds at once, so each rule would read the other's key; and the field's pair would then be assembled from sides that may come from different rules                                        |
| The later `min` and the earlier `max` for the time too, as for the day | the first version, and wrong on a clock in both directions: two rules that accept nothing read as a window, a window with a plain rule offers refused times, and two windows refuse accepted ones (the measurement above) |
| The last rule's bounds reach the field                                 | wider than the form in the common case — a reusable office-hours rule written after a narrower one hands the panel the office hours — to be exact only in the rare one                                                    |
| No rule: the card shows the three metadata lines                       | a key typed `T \| undefined` (`TS2322` otherwise), the pointer and a validator that knows the window — three things every application would get right or not                                                              |
| `minDate()` for the day, through a `Date`                              | the path and the value would have to be a `Date`'s — the instant [0043](0043-a-day-is-not-an-instant.md) refused                                                                                                          |

## Amended 2026-10-15: the datetime's rule, and what an empty intersection hands its panel

**`./datetime` ships `pctDateTimeBounds`**, the day's rule for a `PctDateTime`: one rule for
both bounds, a side a value or a function of the field's context, one that is not a datetime
no bound; the keys private, made at the top of the module and marked PURE; `message` a string
or a function of the error. The errors are **`minDateTime` / `maxDateTime`**, each carrying
the bound it broke: kinds of their own because Angular's `minDate` is taken and types its
bound as a `Date`, and the name is the value's, as `minDay` is the day's.

**A pair is never a window.** One rule's reversed pair grades a datetime between its two as
under **and** over, and one past either end as that side alone — the platform's own reading
on a datetime ([0090](0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md), A8). So §5 is
the clock's alone: a bound read off another field may share a rule with a fixed one, and the
sandbox writes the end of a talk that way.

**Several rules: the intersection, as for the day** — the later `min` and the earlier `max`,
compared as datetimes, so a year of five digits is later than one of four and `…T09:00` equals
`…T09:00:00`; where two rules write one instant in two shapes the field is handed the later
rule's spelling, as the time's span hands it.

**What the field's own reading changes.** The day's intersection, where it is empty, is a `min`
past its `max`, and the calendar takes no day — the panel agrees with the form. The datetime
field reads that pair otherwise (0090 §5). Measured by a probe on 2026-10-15, in the
environment above, binding the day's construction by hand — `min` 5 December 09:00, `max`
3 December 17:00: the field received the reversed pair, **the panel offered all 42 days of the
grid and 24 hours**, and dev mode printed `min=… is later than max=…` — a warning written for
a consumer's reversed attributes, raised here by the form's data, a start typed past the
close, once more each time it moves. With `min` 2 December the same probe gave two days and no
warning. No pair spells "nothing" to this field, as none spells it on the clock. So **the rule
hands the field the window the field walks: the intersection where it holds a datetime, no
bounds where it holds none** — the same panel, without the warning. Each rule still refuses
every value outside its own pair, with the bound it broke.

**Evidence:** `libs/components/datetime/src/datetime-field.spec.ts › PctDatetime — bounds from
a signal form (pctDateTimeBounds)` (eleven cases, among them the empty intersection with no
bounds, no warning and a panel open on every day) and
`apps/sandbox-e2e/src/datetime.spec.ts › bounds from a signal form`, green on chromium.

**What it costs.**

- **Four exports** — the rule, its configuration, a bound and the error.
- **Bytes:** an application importing the whole entrypoint pays `./datetime` +930 B
  (`size.snapshot.md`). One importing `PctDatetime` alone keeps the import line of five names
  from `@angular/forms/signals` and none of the rule — read off an esbuild bundle of the built
  FESM, where `minDateTime` is absent.
- **The form's metadata goes quiet where the rules contradict each other:**
  `f.endsAt().min?.()` reads `undefined` on both sides while the start stands past the close,
  though each rule's side is still a bound the form keeps — a hint written from the metadata
  disappears with it.
- **The same cast** as the others, and a reducer over pairs where the day has two keys, because
  the window is read off both sides at once.
