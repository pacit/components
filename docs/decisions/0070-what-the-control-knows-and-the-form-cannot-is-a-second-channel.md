# 0070 — What the control knows and the form cannot is a second channel

**Status:** accepted
**Implements:** [`req-api-message`](../requirements/api.md#req-api-message),
[`req-api-number`](../requirements/api.md#req-api-number),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)
**Evidence:** `libs/components/core/src/core.spec.ts › "the control's own error comes first, and
is gated by nothing"`; `libs/components/date/src/date.spec.ts › PctDate — junk in the field` —
the sentence, the application's wording of it, and the form's own message standing again once a
date is typed over the junk; `libs/components/field/src/number.spec.ts` — junk kept, named,
taken back by a keystroke and by a value from outside, and the chrome's line saying it;
`apps/sandbox-e2e/src/date.spec.ts` and `number.spec.ts` — the same in three engines, in the
sandbox's French

## The question

A required date typed as `31.02.2026` leaves the value `null`, so the form says **"this field is
required"** while three numbers stand in front of the user. The red border and the ARIA flag are
true; the sentence is wrong, and it is the form's. Not a wording decision: `errors` is an `input`
the form owns, and `PctFieldControl.errors` is the signal the chrome reads, so a control could
not add an error of its own without shadowing the member the `FormValueControl` contract
requires — two members cannot share one name (plan 4.12). `[pctNumber]` had the same want and
answered it worse: it **cleared** junk on blur, which is `<input type="number">`'s own failing
committed one floor up ([`req-api-number`](../requirements/api.md#req-api-number)).

## The decision

**The contract carries a second channel.** `PctFieldControl.ownErrors` is an optional signal of
what the control knows and the form cannot: text in the field that is not a date, not a
number. `pctFieldMessages` reads it **first** — ahead of the form's `errors`, because the
sentence about what is on the screen beats the sentence about what the model holds — and gates
it by **nothing**: a form's error waits for `touched` so an empty form does not open red, but
a control's own is written on commit, which is the field being left. The chrome (`pct-field`)
merges the channel the same way, so a control drawing its own message line and one wrapped in
the chrome say the same thing in the same place ([0022](0022-one-message-line.md)).

The date field says `Not a date` and keeps `aria-invalid` and its state attribute as before.
The number field now **keeps the text** it cannot parse, says `Not a number`, and takes the
report back on the first keystroke or on a value arriving from outside — the date field's
reading of the same three moments. Both sentences are `PctTexts` keys (`dateMalformed`,
`numberMalformed`), so an application that translates the library is not told in English.

## What it costs

- `./core` +112 B, `./date` +192 B, `./field` +515 B — and **+58 B on every entrypoint**,
  because the default texts travel with `core` and two keys joined them. That is the price of
  every text key, paid by every bundle; it was paid here twice and is written down once.
- An order, not a choice: a control with a sentence of its own says it before the form's,
  always. A consumer who wanted the form's "required" to win over "not a date" has no knob.
- The number field's blur no longer clears junk. A consumer who relied on the clearing sees
  the text stay, red, with a sentence under it — which is what the same consumer's users get
  from the date field already.

## What it does not decide

- Whether the form should SEE the rejection. The value stays `null` and the form's verdict is
  reached beside the control's; a validator reading the control's state would be a third
  channel, and nobody has asked for it.
- The other controls. A text field, a select and a checkbox know nothing the form does not;
  the channel is optional so that they say so by leaving it out.
