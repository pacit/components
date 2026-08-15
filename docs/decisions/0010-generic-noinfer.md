# 0010 — A generic value and `NoInfer`

**Status:** accepted
**Implements:** [`req-api-generic`](../requirements/api.md#req-api-generic)
**Evidence:** [`lesson-37`](../lessons.md#lesson-37)

## Context

The first version of `PctSelect` took a `PctSelectOption[]` whose value was a `string`. Real
forms bind numeric ids, union members and whole entities — narrowing to a string pushed
**manual mapping back and forth** onto every application, which is precisely the work the
library is supposed to take away.

## Decision

`PctSelect<T>`, `PctSelectOption<T>` and `PctRadioGroup<T>` are generic, with `T = string` by
default — string lists are written exactly as before.

Three things follow directly:

- **Equality is declared by the application** (`compareWith`, identity by default). An entity
  loaded from a server is not the same reference as the option in the list, so without this the
  selected item would not highlight when the form opens.
- **"Nothing selected" is a separate state.** The value is typed `T | null`, because "nothing
  selected" is reachable for every `T`. An application with a non-nullable field declares an
  empty value of its own (`emptyValue`), so a reset does not write `null` into the model against
  its type.
- **The native radio's `value` attribute describes the option but takes no part in the
  choice**, and for non-primitive values it simply disappears — `[object Object]` in the DOM
  would look like a value while identifying nothing.

### `NoInfer` on bindings that are only meant to be checked

This is the real substance of the decision, and it came out of a probe.

After generalising, it turned out the compiler **lets explicitly contradictory bindings
through**: a `PctSelectOption<number>[]` option list with the value `'a string'`, an
`emptyValue` of a different type than the options, and even `$event` from `(valueChange)`
passed to a method with a mismatched parameter.

Template checking **worked** — an `NG8002` on a made-up input was caught immediately. The
problem was narrower: `T` has several inference sites (`options`, `value`, `emptyValue`), so
TypeScript chose the **union of the candidates** (`string | number`), which both sides of the
conflict fitted.

The fix is to **take away the right to determine `T`** from the bindings that are only meant to
be checked against it: `value` and `emptyValue` are declared as `NoInfer<T>`, so the type comes
from the option list alone.

## Consequences

- The five-case probe: **four closed**, including the typing of `$event`, which had previously
  been silent.
- **The fifth case stays and is a limitation of Angular, not of the API:** `PctRadioGroup` has
  no options input (they are projected content), so the only source of `T` is `value` itself —
  and there `$event` from `(valueChange)` is still unchecked. The generic gives that group
  safety on the TypeScript side (`isSelected`, `select`, reading `value()`) but not on the
  template side.
- **A methodological rule:** with a generic component one has to **check separately whether the
  template really enforces the type**. The mere fact that the build passes on correct usage does
  not tell "the type matches" from "the type is ignored". Only a negative control settles it:
  a deliberately wrong binding that **must** break the build.

## What this costs us

- **The signatures are harder to read.** `NoInfer<T>` needs explaining to anybody opening the
  file for the first time — hence this entry.
- **An inequality between components:** the select has full template checking, the radio group
  partial. That difference cannot be removed today without giving the group an options input —
  that is, without taking away its projected content.
- The negative control for types **is not an automated test** — it is a probe that has to be
  run deliberately. Recorded as the control on
  [`req-api-generic`](../requirements/api.md#req-api-generic).

## Alternatives considered

| alternative                                 | why rejected                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `value: string`, mapping in the application | pushes onto every application the work the library is supposed to take away                              |
| `T` without `NoInfer`                       | measured: the compiler lets 5/5 contradictory bindings through, because it picks the union of candidates |
| `unknown` plus casting in the application   | removes checking exactly where it is needed most — in the template                                       |
