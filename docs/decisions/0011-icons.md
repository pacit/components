# 0011 — Icons through a template and `PCT_ICONS`

**Status:** accepted (the mechanism is not built)
**Implements:** [`req-api-icons`](../requirements/api.md#req-api-icons),
[`req-api-icons-custom`](../requirements/api.md#req-api-icons-custom)
**Evidence:** none — a directional decision, taken before building

## Context

Two promises that are easy to take for contradictory:

- [`req-project-dependencies`](../requirements/project.md#req-project-dependencies) — zero
  runtime dependencies, so **we do not pull in somebody else's icon set**.
- [`req-api-icons`](../requirements/api.md#req-api-icons) — the consumer must be able to
  **swap an icon for their own**.

Today every icon is **written into the template** as SVG in `currentColor` (the checkbox tick,
the select's arrow). It works and adds no dependency, but it is not a mechanism: a consumer
has no way to swap the select's arrow, and every new component adds another inline SVG.

## Decision

**Two levels, satisfying both promises at once:**

1. **`pct-icon` taking a projected SVG** — the lowest level, with no knowledge of names.
2. **A `PCT_ICONS` token mapping semantic names to templates** — `chevron-down`, `check`,
   `close`, `calendar`, with **built-in inline defaults**.

A consumer who does nothing gets working icons. A consumer who supplies their own set swaps
them **globally with one declaration**, not component by component.

The names are **semantic, not visual** (`chevron-down`, not `arrow-down-16`), because they map
onto roles in components, not onto appearance.

## Consequences

- **It ties into [`req-api-templates`](../requirements/api.md#req-api-templates)** — the
  simplest swap mechanism is a template, which does not exist yet. Icons will not move before
  it.
- The default set stays written into the library, so `req-api-icons-custom` (we ship no set)
  holds in the sense of "we do not publish a set as a product", not "there is not a single SVG
  in the package".
- Icon size comes from context (`currentColor`, `1em`), so the size axis
  ([0004](0004-explicit-height.md)) covers icons with no separate configuration.

## What this costs us

- **The list of semantic names is public API** and falls under the same rigour as
  [`req-api-parts`](../requirements/api.md#req-api-parts): once published, a name cannot be
  changed without a migration.
- A consumer swapping **one** icon has to know its name — which means they need an inventory,
  which is one more generated artifact.
- Two levels are two surfaces to document.

## Alternatives considered

| alternative                             | why rejected                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| A dependency on an icon set             | breaks [`req-project-dependencies`](../requirements/project.md#req-project-dependencies) |
| Projected SVG only, without `PCT_ICONS` | forces the consumer to supply an icon at **every** use of every component                |
| `PCT_ICONS` only, without `pct-icon`    | takes away the option of dropping in a one-off icon without registering it under a name  |
| An icon font                            | brings a dependency, scales worse and breaks when external fonts are blocked             |
