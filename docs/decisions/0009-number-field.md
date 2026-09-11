# 0009 — The number field on `type="text"`

**Status:** accepted
**Implements:** [`req-api-number`](../requirements/api.md#req-api-number)
**Evidence:** [`lesson-32`](../lessons.md#lesson-32)

## Context

[`req-api-platform`](../requirements/api.md#req-api-platform) says: we do not implement what
the platform gives us. A native `<input type="number">` is exactly what the platform gives for
numbers — and this is a **deliberate exception** to that rule.

Four reasons, each sufficient on its own:

1. **It does not know the local decimal separator** — a comma, in Polish.
2. **It does not group thousands.**
3. **On malformed content it returns an empty `value`** — "empty" cannot be told from
   "garbage", nor can the user be shown what they typed.
4. **The mouse wheel changes the value by accident.**

## Decision

`[pctNumber]` stands on `<input type="text">` with `role="spinbutton"`, `aria-valuenow` /
`aria-valuetext` and parsing of its own built on `Intl.NumberFormat`.

The rules, each with a reason:

| rule                                                                              | reason                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The value is `number \| null`; empty is `null`, never `0` or `NaN`                | "nothing was typed" is a state distinct from "zero was typed"                                                                                                                              |
| Formatting follows `LOCALE_ID`, overridable by the `locale` input                 | the app's default locale, but one field in a form may be an exception                                                                                                                      |
| **Parsing is wider than formatting**                                              | the grouping separator is removed only where it really separates thousands; both the local separator and a dot are accepted as decimal — because the numeric keypad gives a dot            |
| The field is **integer** by default; fractions are enabled by `maxFractionDigits` | the most common case with no configuration                                                                                                                                                 |
| Rounding and clamping to bounds happen **on commit**, not while typing            | otherwise "15" cannot be typed by passing through "1"                                                                                                                                      |
| The field's text **is not rewritten while typing**                                | so the caret does not jump to the end                                                                                                                                                      |
| **The bounds are not repeated in the template**                                   | `min`/`max` belong to `FormUiControl`, so with `[formField]` the directive fills them from the schema's `min()`/`max()` validators — one source of truth for validation, ARIA and clamping |

### The starting point of a step is the signal, not the DOM

`stepBy` took its starting point from `input.value`, and the text is written by an **effect**,
i.e. asynchronously: two arrow presses in one detection pass saw the same starting value and
the second had no effect ([`lesson-32`](../lessons.md#lesson-32)).

The starting point is now **the signal**, and the text only when the user is actually typing
(`typing()`) — a typed but uncommitted value is still respected.

## Consequences

- **The DOM is not the source of truth in a signal-driven component** — a read from it can
  always be one pass behind. That is a rule wider than the number field.
- The regression test deliberately **does not stabilise the fixture between events**; with an
  `await` after each of them the defect is invisible — which explains why the existing keyboard
  test let it through.
- The field has to handle arrow and PageUp/PageDown stepping itself, because the platform no
  longer gives it.

## What this costs us

- **The whole parsing machinery is ours**, its flaws included. The native field was free.
- **The mobile numeric keypad** does not appear from the type alone — it has to be requested
  separately (`inputmode`).
- **Parsing being wider than formatting is a large input space,** and hand-picked examples were
  never going to cover it. Since 2026-09-11 it is swept as a property —
  `parse(format(n)) === n` over 22 locales — and the sweep was right to exist: it broke on six
  locales in three families, one of them silently wrong rather than refused
  ([`req-api-number`](../requirements/api.md#req-api-number), plan 5.1). What the cost buys is
  not a smaller input space but a measured one.

## Alternatives considered

| alternative                                  | why rejected                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `<input type="number">`                      | the four flaws listed in Context, two of which cannot be worked around                      |
| `type="number"` plus a formatting layer      | on malformed content the native field **loses** the typed text — there is nothing to format |
| Separate fields for the integer and fraction | breaks pasting, autofill and keyboard handling                                              |
