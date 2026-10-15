# 0092 — A control's reset takes back what the form cannot see, and the value stays the form's

**Status:** accepted
**Implements:** [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-release-support`](../requirements/release.md#req-release-support)
**Evidence:** a probe on 2026-10-15 — a throwaway spec beside the library, never tracked, in
the mutation run's environment (`@angular/forms` and `@angular/core` 22.2.1, Vitest 4.1.11,
jsdom 22.1.0, zoneless) — which reset a signal form over every control that has a `reset()`,
and over Angular's own native bindings as the reference, and read the model, the DOM and the
field's `dirty` after each; its rows are the "Measurement" section below. The durable record
is the cases it became, in the eleven spec files of those controls — 38 of them red on the
sources before this decision, all green after. Angular's own reading is quoted in the context
below, from the declarations of the package this library pins — `FieldState.reset` and
`FormUiControl.reset`.

## Context

A review of [#94](https://github.com/pacit/components/pull/94) found it on `[pctNumber]`:
`form().reset({ seats: 4 })` over a field holding 12 ended with the model `{ seats: null }` and
an empty input. The order inside Angular is the whole of it. `FieldState._reset(value)` sets the
value, then calls `reset()` on every control bound to the field, and only on the next pass does
the binding write the new value into the control's `value` model. The control's `reset()` was
`commit(null)`: it wrote `null` into a model that still held 12, the write reached the form as
the user's, and it won over the 4.

Every control here had the same shape, because every `reset()` wrote the control's idea of an
empty value: `''`, `null`, `false`, `[]`, `emptyValue`, or the slider's midpoint. And Angular
says, in the declarations this library builds against, that none of them should have:

- `FieldState.reset(value?)` — "Note this does not change the data model", and of the argument,
  "If not passed, the value will not be changed."
- `FormUiControl.reset()` — "Resets the UI control to its pristine state."
- What Angular's own bindings do when called: a native `<input [formField]>` throws away its
  parse errors and writes the model's value back into the element; `transformedValue` does
  the same for a raw text it formats; a `ControlValueAccessor` is handed the model's value. A
  reset is the UI catching up with the model, never the model catching up with the UI.

The library's controls read their own JSDoc instead — "Empties the field, text and value
alike" — and that sentence was a second contract, ours, standing on top of Angular's and
contradicting it.

## Measurement

Each case starts from a model holding a value, does one thing a user does, and resets the form
the way an application does. "Kept" is the value the model held before the reset; "given" the
one handed to `reset(value)`.

| control                         | `reset()` before | `reset(v)` before | `dirty` after, before | after this decision, all three |
| ------------------------------- | ---------------- | ----------------- | --------------------- | ------------------------------ |
| native `<input>`, `type=number` | kept             | given             | `false`               | (the reference)                |
| native `type=checkbox`          | kept             | given             | `false`               | (the reference)                |
| `[pctText]`                     | `''`             | `''`              | `true`                | kept · given · `false`         |
| `[pctNumber]`                   | `null`           | `null`            | `true`                | kept · given · `false`         |
| `pct-checkbox`, `pct-switch`    | `false`          | `false`           | `true`                | kept · given · `false`         |
| `pct-slider`                    | the midpoint     | the midpoint      | `true`                | kept · given · `false`         |
| `pct-radio-group`               | `emptyValue`     | `emptyValue`      | `true`                | kept · given · `false`         |
| `pct-select`                    | `emptyValue`     | `emptyValue`      | `true`                | kept · given · `false`         |
| `pct-multi-select`              | `[]`             | `[]`              | `true`                | kept · given · `false`         |
| `pct-date`, `pct-time`          | `null`           | `null`            | `true`                | kept · given · `false`         |
| `pct-datetime`                  | `null`           | `null`            | `true`                | kept · given · `false`         |

Two readings sit under the table. The `dirty` column is a second defect nobody had reported: the
control's write after the reset arrived through the same channel as a keystroke, so a form came
out of its own reset **dirty**, every time the value moved. And `reset(v)` worked in exactly one
situation — when the model already held the empty value the control would write, as after junk
(`null`), because a model that does not change emits nothing. That is why it went unseen: the
cases written so far reset a field after junk.

What the user left in the field and the form cannot see was taken back before and is taken back
after — junk with its report, `42,` on its way to `42,5`, a date half typed, a day with no
time. After, it is taken back **to the model's value**, written in the field's language, and not
to nothing.

## Decision

**A control's `reset()` takes back what the control holds and the form does not, and shows the
value again. It never writes the value.** The value is the form's: Angular has already set it,
or left it, before the call arrives.

What each control holds of its own is therefore the whole of its `reset()`:

| control                                      | what its `reset()` takes back                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `[pctNumber]`                                | junk and its report; a number half typed                                         |
| `pct-date`, `pct-time`                       | junk and its report; a date or time half typed; the open panel                   |
| `pct-datetime`                               | junk in either half; a half filled with the other empty; both texts; the panel   |
| `pct-select`, `pct-multi-select`             | the open panel, and the question typed into it                                   |
| `[pctText]`, checkbox, switch, slider, radio | nothing — the text, the tick, the thumb and the checked option **are** the value |

The datetime's halves are split again from the value the field holds, through the same method a
value from outside takes, and never composed back: composing is a write to the value. A panel
that holds focus hands it back to the field as it closes, as Escape does — one taken out of the
tree under focus would drop it to `body` — and focus anywhere else stays where it is, because a
reset is usually pressed somewhere else. The select's panel never holds focus, so closing it
moves nothing.

**The five with nothing to take back keep the method, with an empty body.** Every control of
the library answers the same contract member, and taking it away from five of them would be a
removal without the two minors of notice [the support policy](../support.md) promises. Signal
forms would not notice either way: `reset` is optional on `FormUiControl`.

**Emptying a form is the form's verb, not the control's.** `form().reset(emptyModel)`, or the
model set and then `form().reset()`, as Angular's own sentence says — "the data model, which
can be reset directly if desired".

## Consequences

- `form().reset()` keeps the values, as Angular documents, and a form leaves its reset
  **pristine**. `form().reset(value)` shows that value in every control.
- A direct `ctrl.reset()` no longer empties a control. It is a **breaking change of behaviour**,
  `fix(forms)!`, so the next release is a minor
  ([`req-release-semver`](../requirements/release.md#req-release-semver)).
- A change of behaviour cannot be rewritten by a machine, so the `ng update` migration for it,
  `control-reset`, **writes nothing and names the places**: each call of `reset()` with no
  argument in a workspace that binds one of these controls — asked of the whole tree, because a
  component gets its controls from an NgModule, a barrel or a parent, and its template is often
  a file of its own — and each `emptyValue` on a `pct-radio-group`. It is the CHANGELOG's line
  pointed at the consumer's own files ([`docs/support.md`](../support.md), "A codemod is not a
  guarantee of a silent upgrade").
- `pct-radio-group`'s `emptyValue` existed for the reset alone and is read by nothing now. It
  is **deprecated since 0.3.0**, and still binds, so a template carrying it keeps compiling
  through the notice — the one exception to "keeps working, unchanged", which the support
  policy now names. `pct-select`'s `emptyValue` keeps its job: it is what the cross writes
  ([0036](0036-a-clear-takes-back-what-the-trigger-shows.md), amended), and
  [0010](0010-generic-noinfer.md)'s "so a reset does not write `null`" reads "so a clear does
  not" now (amended).
- A limitation the cards of the date, the time and the number name stands, and is not this
  decision's: a classic form's `ctrl.reset()` is `setValue(null)`, it never calls the
  control's `reset()`, and over junk it writes the `null` the model already holds.

## What this costs us

- **An application that emptied a form with `form().reset()` has to say what empty is** — one
  line, `form().reset(emptyModel)`, which the migration points at and does not write.
- **Five public methods with empty bodies.** A reader of the class meets a method that does
  nothing and has to read the comment inside it to learn why it is there at all.
- **A deprecated input that does nothing for two minors.** `emptyValue` on the radio group still
  binds and is ignored; the deprecation says so where an editor shows it and the migration names
  it, and nothing in a running application does.
- **The date, the time and the datetime close their panel on a reset**, which nobody had asked
  for. It is the rule applied to the three — an open panel is the control's own state — and
  the select did it from the start.

## What would overturn it

Angular changing what `FormUiControl.reset()` means — to "set the control to its empty value"
— or adding an empty-the-form verb that calls into the controls. Either would be a contract to
implement rather than one to contradict, and this decision would follow it.

## Alternatives considered

| alternative                                                      | why rejected                                                                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep emptying, and have `reset()` write the form's value instead | the control would inject the field and write back what the form already holds — a write all the same, so the form comes out dirty; and a value from outside reaches the control anyway, one pass on |
| Empty on `reset()` and keep the value on `reset(value)`          | the control cannot tell the two apart: `reset()` and `reset(theSameValue)` leave the same state behind, and Angular promises the first one does not touch the model                                 |
| Take `reset()` away from the five with nothing to take back      | a public method removed without the deprecation window, and a contract that differs from control to control                                                                                         |
| A separate `clear()` for a direct call, `reset()` for the form   | nothing in the library calls it, and Angular's form is what an application resets; a second verb for the same empty value is a second thing to keep in step                                         |
