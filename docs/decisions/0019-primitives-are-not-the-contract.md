# 0019 — A primitive colour is not the contract; a primitive scale is

**Status:** accepted
**Implements:** [`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-tiers`](../requirements/tokens.md#req-token-tiers)
**Evidence:** the measurements quoted below, all reproducible from this commit

## Context

`PctCssVar` — the typed list of custom property names — excluded `pct.blue.` and `pct.slate.`
and did not exclude `pct.red.`, so a reader of the type saw `--pct-red-600` and did not see
`--pct-blue-600`. That was inherited drift: the exclusion had once been an expression inside
the generator, and moving it into `names.policy.json` made it visible without deciding it.

Deciding it needs the wider question first — **do primitives belong to the public surface at
all?** — and the answer is not one answer, because the tiers are not symmetrical:

| tier above it                                            | primitives concerned                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| colour has a semantic tier (`--pct-danger`, `on-` pairs) | `pct.blue.` (8), `pct.slate.` (7), `pct.red.` (3)                               |
| scales have none — components reference them directly    | `space` (4), `radius`, `target`, `control.height` (3), `motion` (3), `font` (4) |

Measured in this repository: **not one line** of the workspace — no e2e helper, no sandbox
view, no stylesheet — asks for a raw ramp by name; the only occurrences of `--pct-red-*`
outside the skin are in prose. And the red ramp is referenced by exactly two tokens,
`--pct-danger` in the light skin and in the dark one. A third measurement, taken on the way:
of 34 primitives, **two are referenced by nothing at all** — `pct.blue.50` and `pct.red.700`,
one of them public until this decision.

## Decision

**The primitive colour ramps are private; everything else stays public.** `pct.red.` joins
`pct.blue.` and `pct.slate.` in `private.prefixes`, and the rule is written into the policy so
the next ramp does not need this decision again:

> A colour has a tier above it, so a ramp is how this skin happens to be built. A scale has
> none, so `--pct-space-3`, `--pct-control-height-md` and `--pct-target-min` are the only name
> a shared metric has — an application placing its own control beside ours reads them, and
> there is nothing else to read.

The argument for keeping ramps public was that our own e2e and theme code ask the browser for
values and the type is the only protection against a typo
([`lesson-43`](../lessons.md#lesson-43)). It survives untouched: everything that code reads
today is a semantic, component or scale token, and all of those stay in the union.

## What this costs us

- **Reading a ramp from a test loses its type.** `pctTokens` is filtered by the same prefixes,
  so a future e2e that has to assert a raw palette value writes the string by hand. That is
  the intended friction: an assertion about `--pct-blue-600` is an assertion about the skin's
  implementation, and it should be visibly harder than an assertion about `--pct-primary`.
- **The union is 143 names, not 146** — a public API change, and it is visible in review
  because `tokens.snapshot.md` moved three lines from `public` to `private`.
- **Re-theming stays semantic-only in the type.** A consumer who wants our exact red still has
  it in the CSS (`--pct-red-600` is declared in `pct.css` and always will be — a private
  prefix hides a name from the TYPE, not from the stylesheet). What they lose is the promise
  that it will still be there in the next major.

## Consequences

- `libs/tokens/src/names.policy.json` carries the rule and the three prefixes.
- `tokens.snapshot.md` records the three names as private.
- The dead primitives the measurement found are **not** touched here — that is a finding of
  its own (**C12** in the plan), because whether a palette may hold an unused step is a
  question about the skin, not about the type.
