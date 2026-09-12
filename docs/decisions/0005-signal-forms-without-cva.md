# 0005 — Signal forms without `ControlValueAccessor`

**Status:** accepted
**Implements:** [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms),
[`req-api-container`](../requirements/api.md#req-api-container)
**Evidence:** [`lesson-9`](../lessons.md#lesson-9), [`lesson-20`](../lessons.md#lesson-20),
[`lesson-26`](../lessons.md#lesson-26), [`lesson-12`](../lessons.md#lesson-12)

## Context

The starting assumption was: compatibility with reactive forms and template-driven forms
**requires** `ControlValueAccessor`. We were considering a separate adapter directive.

An experiment on a control implementing only `FormValueControl` from
`@angular/forms/signals` showed that `[formControl]` and `[(ngModel)]` synchronise the value
both ways **with no compatibility code at all** ([`lesson-9`](../lessons.md#lesson-9)).

## Decision

**Controls implement the signal-forms contracts only** — `FormValueControl` (or
`FormCheckboxControl`), i.e. `value = model<T>()` plus the optional `FormUiControl` fields
(`disabled`, `readonly`, `invalid`, `errors`, `required`, `name`, `touch`).

**`ControlValueAccessor` is implemented nowhere.** The library's core does not import the
classic forms API.

In composite components the contract is implemented **by the container only** — from the
form's point of view one value is being edited, and the member elements talk to the container
through DI.

### Coexistence with a native element

Two cases only emerged in use and are conditions in the code today:

- **`[formControl]` on `<input pctText>`** is handled by the built-in `DefaultValueAccessor`,
  which writes to the DOM itself. Two authors of one value is a conflict — the control detects
  an `NgControl` on the same element and gives up ownership of the value, keeping the wrapper
  and the state ([`lesson-20`](../lessons.md#lesson-20)).
- **That heuristic was too wide.** `FormField` registers an interop `NgControl` itself for
  compatibility with old accessors — and with **our own** control it does not write to the
  DOM. So the condition distinguishes an `NgControl` **without** a `FormField`
  ([`lesson-26`](../lessons.md#lesson-26)).

## Consequences

- We will be ~2 years ahead of Material on this one dimension.
- Zero compatibility layer to maintain — one fewer layer in which something can drift.
- **Tests have to start from a non-empty initial value.** The defect in
  [`lesson-26`](../lessons.md#lesson-26) survived because every test and the sandbox started
  from an empty model.
- `FormCheckboxControl` requires `checked`, not `value` (defining `value` is forbidden), and
  `model()` does not accept `booleanAttribute` — hence `[checked]="true"` in brackets
  ([`lesson-12`](../lessons.md#lesson-12)).

## What this costs us

- **A bet on Angular's future.** Signal forms are younger than the classic API; if their
  contract changed, we have no intermediate layer to absorb it.
  - _Re-read on 2026-08-31, and the bet has partly settled:_ `FormValueControl` ships
    `@publicApi` in the Angular this library pins, so the risk is no longer "an experimental
    contract changes under us" but the smaller "type evolution across majors ripples through
    eight public signatures with no absorbing alias". And the interop is **wider than the
    value, measured**: `ctrl.disable()` / `enable()` reaches the real control element and
    validity arrives as `aria-invalid`, asserted per composite (select, checkbox, switch,
    radio group, slider) in the same classic-forms suites the requirement's Gate names. The
    two boundaries that remain are written where they bite: an integration resolving
    `NG_VALUE_ACCESSOR` directly finds nothing to resolve, and `<pct-date>` warns outright
    under classic forms, because the bridge writes what `PctDay`'s type forbids
    ([`lesson-117`](../lessons.md#lesson-117)).
- A consumer on a very old Angular will not install the library — but
  [`req-project-angular`](../requirements/project.md#req-project-angular) rules that out
  anyway.
- The coexistence heuristic with `DefaultValueAccessor` is **subtle** and has already been too
  wide once. It is the most fragile part of this decision.

## Alternatives considered

| alternative                                   | why rejected                                                                                                                                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ControlValueAccessor` alongside the contract | verified by experiment to be **unnecessary** ([`lesson-9`](../lessons.md#lesson-9))                                                                                                                                                                |
| A separate adapter directive                  | the same redundancy, plus a second API surface to document and test                                                                                                                                                                                |
| Every member element as a control             | from the form's point of view a radio group is **one** value, not N booleans                                                                                                                                                                       |
| A host directive carrying the state block     | its inputs would still be named in every component that takes it, so the duplication moves into a list of strings while eight public classes change shape; `tools/check-forms.mjs` holds the transforms, the defaults and the member names instead |
