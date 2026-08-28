# 0034 — Multiplicity is a type, so it is a tag

**Status:** accepted
**Implements:** [`req-api-generic`](../requirements/api.md#req-api-generic),
[`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-signals`](../requirements/api.md#req-api-signals)
**Evidence:** the probe in the "Measurement" section — fifteen bindings against three shapes
of the same control, run through the real template compiler;
[`lesson-99`](../lessons.md#lesson-99) — a two-way binding is checked in one direction, which
is why the union road is silent where it matters;
[`lesson-100`](../lessons.md#lesson-100) — the gates that read one class body went blind the
moment two components shared a base

## Context

The next item of the select family is **multiple selection**, and every library writes it the same
way:

```html
<pct-select multiple [(value)]="countries" />
```

One component, one flag. It is the shape a consumer expects, and it is one line of code —
`multiple` is an input like `disabled`. What it is not is a type: `value` would then be
`T | T[] | null`, and [`req-api-generic`](../requirements/api.md#req-api-generic) says the
option list decides what a value may be. So the question is not which shape is prettier but
**what the compiler still checks under each of them**, and that was measured before anything
was written — the same move as [0033](0033-an-option-is-a-row-of-data.md) one item earlier.

## The measurement

Three shapes of the same probe control, fifteen bindings in one host template, compiled by
`nx build sandbox` (Angular 22.0.6, TypeScript 6.0.3, `strictTemplates`):

- **A — the flag**: `multiple` an input, `value` typed `T | readonly T[] | null`;
- **B — the marker**: `multiple` a second generic (`M extends boolean`), `value` a conditional
  type on it;
- **C — the tag**: two controls, one value shape each.

| what was asked                                           | A — the flag |              B — the marker |     C — the tag |
| -------------------------------------------------------- | -----------: | --------------------------: | --------------: |
| an array value where nobody wrote `multiple`             |   **silent** |                      TS2322 |      **TS2322** |
| `multiple` written as the plain HTML attribute           |     it works | **TS2322**, or typed single |      not needed |
| the flag decided at runtime (`[multiple]="flag()"`)      |     it works |      **silently the union** | not expressible |
| the single-choice consumer's own `(valueChange)` handler |   **TS2345** |                       green |           green |
| a string value against a list of numbers                 |       TS2322 |                      TS2322 |          TS2322 |

Read down the column, road A says: **the compiler never objects to a wrong value and always
objects to a right handler.** The union accepts an array on a control nobody told to be
multiple — the defect the flag exists to prevent — while a consumer who never wanted
multiplicity and writes `(valueChange)="onChange($event)"` has to widen their own handler to
a shape their form will never hold. The two-way binding says nothing either way, because its
write-back is not type-checked at all ([`lesson-99`](../lessons.md#lesson-99)).

Road B fails at the authoring site rather than at the type. A generic can only be inferred
from what is written, and `multiple` — the bare attribute, the way HTML spells a boolean — is
the string `''`: without a transform that is `TS2322: Type 'string' is not assignable to type
'boolean'`, and with the `booleanAttribute` transform every consumer writes into an `unknown`,
so `M` is never inferred and the value is typed **single** while the control behaves multiple.
A flag whose value is decided at runtime distributes the conditional and lands back on road A.

## Decision

**A control that returns many values is a different tag.** `pct-select` keeps
`value: T | null`; `pct-multi-select` has `value: T[]`, and nothing in either can disagree
with itself, because the tag is the one thing in a template the compiler ties to a type.

The second half of the decision is that this is **one implementation and not two**. The two
controls share:

- one template file and one stylesheet — the panel, the trigger, the groups, the empty
  message. What the many-choice one adds is drawn from `multiple`, a constant of the class:
  `aria-multiselectable` on the listbox and a check on the chosen rows;
- one base, `PctSelectBase`, holding the fifteen inputs, the overlay, the walk, the ids, the
  chrome contract and the key map. It is **not exported** — nobody's template but ours sits
  on it.

The subclass owns four things, and each is the value in another guise: what `value` is, which
rows it marks, what the trigger reads, and what a pick does.

## Why a base class, when [0013](0013-no-headless-split.md) refused one

0013's rule is about `core`: behaviour reaches components **by composition** — functions
returning signals, and directives — and not through a base class **underneath somebody else's
templates**. That is a rule about an extensibility mechanism offered outwards, and it is
untouched here: `PctSelectBase` is internal, unexported and sits under a template of ours.

What made composition the wrong tool for this one is that Angular declares an input in exactly
one way: as a field on the class the consumer's tag resolves to. A kit function would have
moved the plumbing and left the fifteen input declarations behind — that is, left exactly the
half that drifts. The parity is now measured instead of hoped for: a unit case reads
`ɵcmp.inputs` off both classes after a build and expects one difference, `emptyValue`.

## Consequences

- **`emptyValue` has no counterpart on the many-choice control.** The empty list is `[]`,
  which is reachable for every `T` and means the same thing in every application — the reason
  `emptyValue` exists for `null` does not arise.
- **The value type is `T[]` and not `readonly T[]`.** A control whose value type is stricter
  than the model bound to it cannot be bound at all: `FieldTree<string[]>` is invariant, and
  `signal<string[]>` is how an application declares such a field. Nothing in the control
  mutates an array; every change sets a new one.
- **The value comes back in the list's order**, so the same set of choices is the same array
  however the picking went. A value no option carries is kept — the list cannot order it, so
  it stands ahead of the ones it can.
- **The bytes are real and are recorded**: one template compiled twice, one stylesheet emitted twice
  — `./select` went 29058 → 46749 B and is now the library's largest entrypoint. That number is what
  an application importing the WHOLE entrypoint carries; whether a consumer who imports only
  `PctSelect` sheds the other half is a question about tree-shaking that **nothing here measures**,
  and it is written down as a finding of its own rather than assumed.
- **Two gates had to learn what inheritance is** — `check-aria` read a component's inputs from
  one class body and reported a combobox that "declares no `ariaLabel`", `check-texts` found a
  class in the sources that no entrypoint exports
  ([`lesson-100`](../lessons.md#lesson-100)).

## What would overturn it

An Angular release where an input can carry a type into the class — a literal-typed input
whose attribute form (`multiple`) infers `true` rather than `''`. Road B would then check
everything road C checks, and one tag could carry both value shapes. The runtime flag
(`[multiple]="flag()"`) would still distribute into the union, so even then a control whose
multiplicity is decided at runtime would be the unchecked case.
