# 0012 — The transitive closure in a theme block

**Status:** accepted
**Implements:** [`req-token-closure`](../requirements/tokens.md#req-token-closure),
[`req-token-scoped`](../requirements/tokens.md#req-token-scoped)
**Evidence:** [`lesson-17`](../lessons.md#lesson-17)

## Context

The tiered token model ([`req-token-tiers`](../requirements/tokens.md#req-token-tiers))
assumes that overriding a semantic token re-themes everything below it. So a theme block
emitted only the overridden semantic tokens — which looks frugal and correct.

A probe in the browser showed that **it is incorrect**: in a `[data-theme="dark"]` panel the
semantic token `--pct-surface` had the correct dark value, while `--pct-button-bg` and
`--pct-select-panel-bg` still returned light ones
([`lesson-17`](../lessons.md#lesson-17)).

The cause is in the mechanics of CSS, not in the build: **custom properties are substituted at
the point of declaration, not of use.** A token `--a: var(--b)` declared in `:root` inherits an
**already-expanded** value, so overriding `--b` in a nested scope will not change it.

## Decision

**In a theme block the build emits not only the overridden semantic tokens but every token
that depends on them** — directly or through a chain of references.

That requires walking the reference graph and computing the transitive closure of the set of
overrides.

## Consequences

- **A scoped theme works on every tier**, not just the semantic one.
- The gate has to compare a **component token** in `:root` and in a scope. A test on the
  semantic token alone passed despite a broken component layer — and passed **for a long
  time**, because the difference between `blue-600` and `blue-500` is visually subtle.
- The same mechanics forced a `[data-theme="light"]` block to be emitted: as long as the light
  theme was merely the absence of an attribute, a light card inside a dark page had nothing to
  undo the inherited values with
  ([`req-quality-stage`](../requirements/quality.md#req-quality-stage)).
- The same holds for automatic dark mode
  ([`req-token-system`](../requirements/tokens.md#req-token-system)) — the
  `prefers-color-scheme` block is an ordinary theme block and obeys the same rule.

## What this costs us

- **A theme block is much bigger** than the list of actual overrides — it carries the whole
  tail of dependent tokens. The cost is in CSS size, paid for every theme and every scope.
- The „emit only what changed" saving is **unreachable** while references are kept as `var()`
  ([`req-token-references`](../requirements/tokens.md#req-token-references)). That is the price
  of cascading, and we pay it deliberately.

## Alternatives considered

| alternative                                  | why rejected                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Emitting the overridden semantic tokens only | measured: the component layer stays frozen ([`lesson-17`](../lessons.md#lesson-17))          |
| Expanding references to values at build time | takes away the ability to override a single variable in any scope — i.e. the whole mechanism |
| A JS engine recomputing tokens at runtime    | breaks CSS-first, zero-runtime: FOUC and hydration mismatches                                |
