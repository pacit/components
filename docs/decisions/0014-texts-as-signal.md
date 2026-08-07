# 0014 — Texts as a signal, read at render time

**Status:** accepted
**Implements:** [`req-api-texts`](../requirements/api.md#req-api-texts)
**Evidence:** [`lesson-54`](../lessons.md#lesson-54) — a deliberate regression: with the read
done at construction, switching language gives `expected 'Select…' to be 'Wybierz…'`

## Context

[Decision 0007](0007-config-and-texts.md) left one question open and recorded itself that it
had to be **settled before `PCT_TEXTS` grew**:

```ts
export const PCT_TEXTS = new InjectionToken<PctTexts>(…); // a value, not a signal
readonly placeholder = input<string>(this.texts.selectPlaceholder); // read ONCE
```

`providePctTexts` returned `{ provide, useValue }`, i.e. a static object, and the component
read it at construction. An app switching language without reloading the page — a very common
pattern — **would not see the new strings**.

The defect is harder than it looks, because `input()` **is** a signal: a binding from outside
redraws the view normally. What is frozen is only the **default** value, and nobody reads that
in a diff as „a read" ([`lesson-54`](../lessons.md#lesson-54)).

## Decision

**`PCT_TEXTS` carries `Signal<PctTexts>`, and a component reads a string at render time.**

```ts
export const PCT_TEXTS = new InjectionToken<Signal<PctTexts>>('PCT_TEXTS', {
  factory: () => signal(PCT_DEFAULT_TEXTS).asReadonly(),
});

export function providePctTexts(texts: Partial<PctTexts> | Signal<Partial<PctTexts>>): Provider;
```

Three supplementary rules:

- **The read goes through `computed()`**, never through an input's default value. An input that
  has a library string as its fallback is declared with no value (`input<string>()`), and the
  fallback is added by
  `computed(() => this.placeholder() ?? this.texts().selectPlaceholder)`.
- **No value and an empty value mean different things.** `placeholder=""` stays an empty
  placeholder; only the absence of a binding hands the string back to the library. The opposite
  convention („empty means default") would take away a decision the view's author cannot
  express any other way.
- **Merging is always against `PCT_DEFAULT_TEXTS`**, never against the texts from a parent
  injector: a subtree declares a language, not a difference from its neighbour — otherwise the
  same `providePctTexts` would mean different things depending on where it sits in the tree.

A factory as the argument (the second option considered) is not enough: DI resolves a provider
once, so `useFactory` gives exactly the same frozen object, only computed lazily.

## Consequences

- An app switching language passes a signal:
  `providePctTexts(computed(() => DICTIONARIES[language()]))` — and the library's strings move
  with the rest of the interface, without a reload.
- Passing a plain object still works and is still the shortest road — the signal is an
  extension of the signature, not a replacement.
- A read in a template has parentheses (`texts().selectEmpty`). That is **a visible price**: the
  notation says outright that the string is read every time.
- The [`check-texts`](../../tools/check-texts.mjs) gate watches this with the
  `napis-przy-konstrukcji` rule — the default value of an `input`/`model`/`signal` may not read
  `PCT_TEXTS`. Without it the same notation would come back with the first component written on
  autopilot, again with no red test.

## What this costs us

- **A breaking change in a public type.** `inject(PCT_TEXTS)` now returns a signal, so consumer
  code reading the token directly stops compiling. The price is paid now, because the library
  has no first release yet — after one, the same change would need a codemod and a major.
- **One more indirection in every read.** `texts().selectEmpty` instead of `texts.selectEmpty` —
  a cost measured in nothing, but visible in every template.
- **The „not in a default value" rule is easy to break on autopilot** and invisible in review.
  That is why it is a point of a gate rather than a sentence in a guide.

## Alternatives considered

| alternative                                      | why rejected                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Write down „changing language requires a reload" | defensive and cheap, but it moves the cost onto every app with a language switch — and that is a pattern, not an exotic case |
| `providePctTexts` takes a factory                | DI resolves a provider once, so the result is just as frozen — what changes is when it is computed, not that it happens once |
| `Subject`/`Observable` like `MatPaginatorIntl`   | a second axis of reactivity in a library that has not one `Observable` in its public API                                     |
| An empty string (`''`) means „take the default"  | takes away the view author's ability to switch the placeholder off, which cannot be expressed any other way                  |
