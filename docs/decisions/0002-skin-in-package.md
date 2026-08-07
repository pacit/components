# 0002 — The skin ships in the package

**Status:** accepted
**Implements:** [`req-project-tokens-lib`](../requirements/project.md#req-project-tokens-lib),
[`req-token-distribution`](../requirements/tokens.md#req-token-distribution),
[`req-quality-package`](../requirements/quality.md#req-quality-package)
**Evidence:** [`lesson-36`](../lessons.md#lesson-36)

## Context

Tokens live in a separate library (`libs/tokens`) and are compiled from DTCG to CSS. The
`@pacit/components` package refers to them only through `var(--pct-*)` in stylesheets — **not
one TypeScript import**.

That was enough for `dist/libs/components` to contain FESMs, types and an `exports` map, and
**zero CSS files**. The bundle referred to `var(--pct-field-bg)`, whose definition was nowhere
in the package.

The failure was **silent in both directions**: with `libs/tokens/dist` deleted,
`nx build sandbox` ended in **success** without a warning, and CI passed only thanks to
a manual `node libs/tokens/build.mjs` step before `run-many` — a workaround masking a missing
edge in the graph instead of exposing it.

## Decision

The fix has **three parts**, because three different things could fail independently.

1. **The graph knows the edge.** `implicitDependencies: ["tokens"]` in `components` and
   `sandbox` plus an explicit `dependsOn` on `serve`. The Nx graph infers from imports, and
   this dependency is unusual — a CSS artifact and nothing else, zero TS.
2. **The skin is an input of the package, not an asset from outside.** It is copied into
   `libs/components/themes` and taken from there by `assets` in `ng-package.json` — ng-packagr
   **does not read assets from outside the project directory**, so the staging is forced, not
   cosmetic. Plus a `./themes/*` entry in `exports`, because the `exports` map is closed and
   a file with no entry is invisible to the consumer.
3. **The gate examines the artifact**, not the sources (`nx check-package components`).

## Consequences

- `libs/components/themes` is **generated and gitignored** — the only source of truth remains
  the DTCG files in `libs/tokens/src`.
- The gate checks **token closure** (every `var(--pct-*)` used has a declaration in the
  package), not the presence of a file. Presence would also be satisfied by an empty file, or
  by a skin somebody stripped the component layer out of.
- The manual CI step is gone.

## What this costs us

- A generated directory inside a published project — one has to remember that `themes/` is
  not a source even though it sits in `libs/components`.
- The graph edge is **declared by hand**, so a new project depending on tokens in the same
  unusual way will again not get it automatically.

## Alternatives considered

| alternative                                     | why rejected                                                                                   |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `assets` pointing straight at `libs/tokens`     | ng-packagr does not read assets from outside the project directory — not a choice              |
| A TS import of the tokens, so the graph sees it | it would bring runtime JS into the package, against CSS-first, zero-runtime                    |
| Relying on the manual CI step                   | that was **the state before** this decision; it masked the missing edge instead of exposing it |
