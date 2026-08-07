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
- A consumer on a very old Angular will not install the library — but
  [`req-project-angular`](../requirements/project.md#req-project-angular) rules that out
  anyway.
- The coexistence heuristic with `DefaultValueAccessor` is **subtle** and has already been too
  wide once. It is the most fragile part of this decision.

## Alternatives considered

| alternative                                   | why rejected                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `ControlValueAccessor` alongside the contract | verified by experiment to be **unnecessary** ([`lesson-9`](../lessons.md#lesson-9)) |
| A separate adapter directive                  | the same redundancy, plus a second API surface to document and test                 |
| Every member element as a control             | from the form's point of view a radio group is **one** value, not N booleans        |
