# 0008 — The motion axis in tokens

**Status:** accepted
**Implements:** [`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)
**Evidence:** [`lesson-38`](../lessons.md#lesson-38)

## Context

The standard approach to `prefers-reduced-motion` is an `@media` rule in every component's
stylesheet. It has two flaws, both from the [`req-axis`](../00-axis.md) family: a new component
**starts without** that rule, and its absence gives no signal.

## Decision

**Motion duration is a token, and reduction is a separate set of values for those tokens.**

`motion.reduced.json` is to the motion axis what `semantic.dark.json` is to the theme: the
build emits it inside a `@media (prefers-reduced-motion: reduce)` block.

The preference governs **all** components from one rule, and a new component inherits it
**just by using the token** instead of starting without it.

### The split follows the kind of motion, not its speed

Because reduction does two different things to them:

| token                              | no preference | with preference | why                                     |
| ---------------------------------- | ------------- | --------------- | --------------------------------------- |
| `--pct-motion-transition-duration` | 150 ms        | **0.01 ms**     | a state transition should disappear     |
| `--pct-motion-loop-duration`       | 600 ms        | **1500 ms**     | a continuous indicator should only slow |

Two details, each with a reason:

- **`0.01ms`, not `0s`** — so the `transitionend` event is not lost.
- **The spinner slows, it does not stop.** A stopped spinner would stop saying that the button
  is working. **„Less motion" must not mean „less information".**

## Consequences

- A component that wants to respect reduced motion does not have to know about it.
- A component that does **not** take its duration from the token is findable by grepping for
  `@media` in a stylesheet — one of the rows in the
  [component DoD](../components/_template.md).
- The gate has to compare a **pair** of values. A reduction test alone, asserting „the
  transition duration is small", would pass on the base value of `150ms` read as „small
  enough", and nobody would notice that the media query never fired
  ([`lesson-38`](../lessons.md#lesson-38)).
- Emulation goes through `page.emulateMedia()` in the `visit()` helper rather than through
  `test.use({ reducedMotion })` — the latter **silently does nothing** in Playwright 1.61.1.

## What this costs us

- **Reduction is global, not per component.** A component needing a rule other than
  „transitions vanish, loops slow down" has to step off the axis — and that is then
  a departure to be justified.
- Two tokens **model motion in two categories**. A third kind (say, motion that transports
  attention, like a dialog entering) will need a third axis; it will not fit into the existing
  ones.

## Alternatives considered

| alternative                              | why rejected                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@media` in every component's stylesheet | a new component starts without the rule, and the absence gives no signal                                |
| One duration token for all motion        | reduction does **two different things** to a transition and to a loop; one token would stop the spinner |
| `0s` instead of `0.01ms`                 | loses `transitionend`, which breaks code waiting for the transition to end                              |
