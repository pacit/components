# 0007 — Configuration apart from texts

**Status:** accepted
**Implements:** [`req-api-config`](../requirements/api.md#req-api-config),
[`req-api-texts`](../requirements/api.md#req-api-texts)
**Evidence:** no measurement — a decision from the difference in rhythm and reach of an
override

## Context

The library needs two things set globally: **configuration** (default `size`, locale, ripple)
and **strings** (the list's placeholder, the empty-list message). The natural reflex is one DI
token with a `texts` field.

## Decision

**Two separate tokens: `PctConfig` (through `providePctConfig`) and `PCT_TEXTS` (through
`providePctTexts`).**

The reason is in the **rhythm and reach of an override**:

|                        | `PctConfig`           | `PCT_TEXTS`                                          |
| ---------------------- | --------------------- | ---------------------------------------------------- |
| when it is set         | once, at app start    | in a subtree as well                                 |
| what it is swapped for | changing the defaults | a section in another language, a translation preview |

A separate token makes it possible to override **the strings alone** in a subtree without
repeating the rest of the configuration.

Two supplementary rules:

- **An override is partial.** The fields supplied override the defaults, the rest stay — a new
  string in the library does not knock over an app that translates only part of them.
- **The defaults are English**, and developer warnings (`console.warn`) **do not belong** in
  that channel: they are permanently English, because a programmer reads them and not a user,
  and they go dark outside `isDevMode()`.

## Consequences

- An app may have one `providePctConfig` and several `providePctTexts` in different subtrees.
- Adding a string to the library is a non-breaking change.

## What this costs us

- **Two places to configure instead of one** — the consumer has to know there are two.
- **~~`PCT_TEXTS` will not survive a runtime language change.~~** Closed by
  [0014](0014-texts-as-signal.md): the token carries `Signal<PctTexts>` and a string is read at
  render time. The entry stays here because this decision created it: the static `useValue` was
  its price and stood in the library from `a4794a4` (2026-07-27) until 2026-08-06, with CI
  green ([`lesson-54`](../lessons.md#lesson-54)).

- **The shape of `PctConfig` is unfinished.** It has one field (`defaultSize`). The open
  question is not "which fields to add" but **whether per-component defaults go through the
  configuration (`providePctConfig({ button: { variant: 'outline' } })`) or through tokens**.
  Material and PrimeNG both ended up with default providers. To be settled before the
  fifteenth component — after that it is a breaking change in every one of them.

## Alternatives considered

| alternative                       | why rejected                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| One token with a `texts` field    | forces the whole configuration to be repeated to override one string in a subtree       |
| Strings through `$localize`       | ties the library to Angular's native i18n; worth considering **alongside**, not instead |
| Developer warnings in `PCT_TEXTS` | a programmer reads them, not a user — translating them helps nobody                     |
