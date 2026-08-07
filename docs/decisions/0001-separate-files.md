# 0001 — Template and styles in separate files

**Status:** accepted
**Implements:** [`req-project-files`](../requirements/project.md#req-project-files),
[`req-api-names`](../requirements/api.md#req-api-names)
**Evidence:** no measurement — a decision from expected scale, deliberately taken early

## Context

Angular's official guide says it outright: _prefer inline templates for smaller components_.
Most of this library's components are small.

## Decision

**Template and styles always in separate files** — a deliberate departure from the guidance.
The per-component structure is fixed: `button.ts`, `button.html`, `button.scss`,
`button.spec.ts`, `button.types.ts`, `index.ts`, `ng-package.json`.

The reason is quantitative, not aesthetic: in a library of dozens of components **the cost of
inconsistency grows faster than the cost of one more file**. „Small component" is not
a permanent state — `PctSelect` started as a trigger with a list.

## Consequences

- The path to any of a component's artifacts can be predicted without opening the directory.
- A script gating the entrypoint layout is trivial to write — it does not have to decide
  whether a missing `.html` is a defect or a choice.
- A component's styles are an SCSS file, so they fall under the same lint rules as everything
  else ([`req-token-logical`](../requirements/tokens.md#req-token-logical)).

## What this costs us

- More files in the tree and more switching between them while working on one component.
- The departure from official guidance has to be explained to every new collaborator — hence
  this entry.

## Alternatives considered

| alternative                               | why rejected                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| Inline for small ones, separate for large | the „small" boundary is fuzzy and moves over time; it forces a decision per file |
| Inline everywhere                         | component stylesheets run to dozens of rules today — inline would be unreadable  |
