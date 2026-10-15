# 0093 — A bound of the field's own type reaches it through the platform's limit key, and the module ships the rule

**Status:** accepted
**Implements:** [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-day`](../requirements/api.md#req-api-day),
[`req-api-time`](../requirements/api.md#req-api-time)
**Evidence:** probes on 2026-10-15 — a throwaway spec beside the library, never tracked, in the
unit suite's environment (`@angular/forms` and `@angular/core` 22.2.1, zoneless) — and a
reading of the package's own declarations and FESM. The durable record is the cases they
became: `libs/components/date/src/date.spec.ts › PctDate — bounds from a signal form` (ten
cases), `libs/components/time/src/time-field.spec.ts › PctTime — bounds from a signal form`
(ten), and one case in each of `apps/sandbox-e2e/src/date.spec.ts` and `time.spec.ts`, green
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
- **Two windows whose gaps do not meet** — everything but 06:00–07:00, and everything but
  10:00–23:00: the field gets 23:00 to 06:00, and 08:00, which both rules accept, is outside
  the panel's walk. Typed, it is accepted.

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
4. **Several rules on one path: each grades its own pair, and the field walks the tighter.**
   The later `min` and the earlier `max`, compared as days or as times. That is the
   intersection for the day always, and for the time while at most one rule is a window. Two
   windows whose gaps do not meet leave two arcs no single pair spells, and the panel walks
   less than the form accepts; the form still grades right.
5. **The keys are made at the top of the module, marked PURE** — the reason `./core`'s warning
   keys are ([`lesson-252`](../lessons.md#lesson-252)).

## Consequences

- The cards' **Bounds** rows say a signal form gives the bounds through the rule, and the time
  card's "the form's validator alone" goes.
- 0086 §5's open question is closed, and 0086 says so where it asked it.
- `PctDateTime` has the same hole and keeps it: its card still says "the form's validator
  alone". Its value has no window and warns when `min` is later than `max`, so its rule is its
  own to write.

## What this costs us

- **Eight exports**, four per module: the rule, its configuration, a bound and the error.
- **Bytes.** An application importing the whole entrypoint pays `./date` +709 B, `./time`
  +777 B and `./datetime` +220 B (`size.snapshot.md`). One importing the tag alone pays
  +110 B, and that is the import line of five names from `@angular/forms/signals`: the probe
  keeps it because Angular is external there. The rule's code itself is shed.
- **A cast in each rule**, `as unknown as LimitKey<TValue>`: the platform asks for a key of the
  path's value type, and TypeScript cannot equate it with the key's while `TValue` is a
  parameter.
- **A habit broken**: Angular's rules take a side each, these take both.
- **The two windows** of point 4, a panel narrower than the form.

## What would overturn it

Angular shipping a rule for a limit of any comparable type, or `minDate()` taking the string a
day is. The rule would then become a wrapper or go, through a deprecation. The
`@ts-expect-error` case in `date.spec.ts` turns red the day `minDate()` accepts a `PctDay`'s
path.

## Alternatives considered

| alternative                                                  | why rejected                                                                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A rule per side, `pctMinTime` and `pctMaxTime`, as Angular's | the window is graded from both bounds at once, so each rule would read the other's key; and the field's pair would then be assembled from sides that may come from different rules |
| The last rule's bounds reach the field                       | wider than the form in the common case — a reusable office-hours rule written after a narrower one hands the panel the office hours — to be exact only in the rare one             |
| Reduce the pairs into the smallest arc holding their meet    | exact for two windows too, at the price of interval arithmetic on a circle, every edge a mutant, for a case nobody has asked for; the form grades right without it                 |
| No rule: the card shows the three metadata lines             | a key typed `T \| undefined` (`TS2322` otherwise), the pointer and a validator that knows the window — three things every application would get right or not                       |
| `minDate()` for the day, through a `Date`                    | the path and the value would have to be a `Date`'s — the instant [0043](0043-a-day-is-not-an-instant.md) refused                                                                   |
