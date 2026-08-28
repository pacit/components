# 0020 — The palette carries no spare steps

**Status:** accepted
**Implements:** [`req-token-tiers`](../requirements/tokens.md#req-token-tiers)
**Evidence:** the runs quoted below, all reproducible from this commit

## Context

[0019](0019-primitives-are-not-the-contract.md) measured, on its way to another question,
that **two of the 34 primitives are referenced by nothing at all** — `pct.blue.50` and
`pct.red.700` — and deliberately left them alone: whether a palette may hold an unused step is
a question about the skin, not about the type.

The gate already rejects the same shape one tier up in three places — a dead word in the name
dictionary (point 4), a private prefix covering no token (point 2), an `on-` pair nothing uses
(point 7) — and had nothing to say one tier down. The argument for the silence is real: a
colour ramp is a designer's artefact, and a designer keeps 50–950 whether or not today's
components paint with every step.

Three measurements decide it, and none of them is about taste:

- **The ramps here are already gapped.** Blue has no 100 and no 900, slate no 300, 400 or 600,
  red no 500. Whatever this palette is, it is not a ramp kept whole — every step in it was
  added because something asked for it.
- **The two were never used, ever.** `git log -S` over `libs/tokens/src` finds no commit that
  adds or removes a `{pct.blue.50}` or `{pct.red.700}` reference, and none over the
  stylesheets for `var(--pct-blue-50)` or `var(--pct-red-700)`. They are not the residue of a
  redesign; `pct.blue.50` was born unused in the first commit of the workspace and
  `pct.red.700` in the one that added the input.
- **No existing rule would ever have named them.** Since 0019 the ramps are private, so they
  stand in no type; they parse, they sit in the snapshot, they point at a literal — faultless
  by every rule the gate had, and invisible to the only reader who might have missed them.

## Decision

**A primitive that nothing reads is a defect, and the two go.** `check-tokens` gains
**point 9 (`palette`, rule `primitive-dead`)**: every token of the primitive tier has to be
read by another token or by a stylesheet of `libs/components`.

**A reader is either kind, and the rule needs both halves.** Measured with the second half
disarmed: a rule reading token references alone condemns `--pct-motion-transition-duration`,
`--pct-motion-transition-easing` and `--pct-motion-loop-duration` — the whole motion axis,
which has no semantic tier and no component token above it and is read by the stylesheets
directly ([`lesson-74`](../lessons.md#lesson-74)).

The rule covers the scales as well as the colours, and for the reason 0019 gave them their
public place: a scale is "the only name a shared metric has" **because our components use it**.
A step nothing measures with is not a shared metric, it is a number.

## What this costs us

- **A step cannot be parked in advance.** A designer who knows the next component will want
  `blue.50` adds it with the first token or stylesheet that reads it, in one diff. The
  friction is the point: the palette stops being a place where a name can arrive unnoticed.
- **The exported palette is gapped.** Whatever the Figma bridge sends out is the ramp as it really
  is, holes and all — a designer reading it sees the components' palette rather than a full scale.
- **A one-off experiment costs a gate run.** Painting something with `--pct-blue-50` for an
  afternoon now needs the token back in the sources, not merely in the browser.

## Consequences

- `libs/tokens/src/primitive.json` loses `pct.blue.50` and `pct.red.700`;
  `tokens.snapshot.md` is two rows shorter, the public union is unchanged (both were private).
- `tools/check-tokens.mjs` gains point 9, and `tools/check-tokens.fixtures/dead-primitive/`
  is its negative control.
- The promise in [`req-token-tiers`](../requirements/tokens.md#req-token-tiers) said "colour
  ramps 50–950". It described a palette this repository never had, and now says what the
  gate measures.
