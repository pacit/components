# Architectural decisions

Level 2 of the documentation. A [requirement](../README.md#level-1--requirements) says **what
has to be true**; a decision says **why this way and not another** — and what it costs us.

Until the end of 2026-07 that prose sat inside the requirements. The effect: today's
[`req-api-wrapper`](../requirements/api.md#req-api-wrapper) had eight paragraphs while
[`req-project-package`](../requirements/project.md#req-project-package) had one sentence,
although both were entries on the same list. A requirement could no longer be read whole,
because you had to walk through the reasoning.

## Rules

- **A decision is immutable once accepted.** Changing your mind is not an edit — it is a new
  decision that **supersedes** the old one. The old one stays in the repository with the status
  `superseded by NNNN`, because the reason something was once chosen differently is part of the
  knowledge about the project.
- **The number is chronological and does not change** — same as in the
  [lesson log](../lessons.md#why-numbers-when-requirements-have-names) and for the same reason:
  order means something here.
- **A decision without evidence is an opinion.** The "Evidence" section points at a lesson,
  a measurement or an experiment. When there is none, we write that down outright — it is
  information, not a disgrace.
- **Consequences include costs.** A decision with no "What this costs us" section is
  unfinished.

## File shape

```markdown
# NNNN — Title

**Status:** accepted | superseded by NNNN
**Implements:** `req-…`, `req-…`
**Evidence:** `lesson-…`

## Context

## Decision

## Consequences

## What this costs us

## Alternatives considered
```

## Index

| no                                              | decision                                           | implements                                                |
| ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| [0001](0001-separate-files.md)                  | Template and styles in separate files              | `req-project-files`                                       |
| [0002](0002-skin-in-package.md)                 | The skin ships in the package                      | `req-project-tokens-lib`, `req-token-distribution`        |
| [0003](0003-wrapper-and-control.md)             | Wrapper and control                                | `req-api-wrapper`, `req-api-frame`, `req-api-no-wrapper`  |
| [0004](0004-explicit-height.md)                 | Height stated outright, not from padding           | `req-api-size`                                            |
| [0005](0005-signal-forms-without-cva.md)        | Signal forms without `ControlValueAccessor`        | `req-api-signal-forms`                                    |
| [0006](0006-overlay.md)                         | The anchor and inheritance in an overlay           | `req-api-overlay`                                         |
| [0007](0007-config-and-texts.md)                | Configuration apart from texts                     | `req-api-config`, `req-api-texts`                         |
| [0008](0008-motion-axis.md)                     | The motion axis in tokens                          | `req-a11y-motion`                                         |
| [0009](0009-number-field.md)                    | The number field on `type="text"`                  | `req-api-number`                                          |
| [0010](0010-generic-noinfer.md)                 | A generic value and `NoInfer`                      | `req-api-generic`                                         |
| [0011](0011-icons.md)                           | Icons through a template and `PCT_ICONS`           | `req-api-icons`                                           |
| [0012](0012-theme-closure.md)                   | The transitive closure in a theme block            | `req-token-closure`                                       |
| [0013](0013-no-headless-split.md)               | No headless core / skin split                      | `req-project-core`, `req-api-parts`, `req-api-attributes` |
| [0014](0014-texts-as-signal.md)                 | Texts as a signal, read at render time             | `req-api-texts`                                           |
| [0015](0015-license-and-model.md)               | MIT everywhere, rights to the entity, no CLA       | `req-release-metadata`                                    |
| [0016](0016-mit-irreversibility.md)             | Releasing under MIT is irreversible                | `req-project-package`                                     |
| [0017](0017-one-home-per-fact.md)               | One home per fact: the criterion and its budget    | `req-project-concise`                                     |
| [0018](0018-no-sass-entry-point.md)             | No Sass entry point in the package                 | `req-token-artifacts`                                     |
| [0019](0019-primitives-are-not-the-contract.md) | A primitive colour is not the contract; a scale is | `req-token-names`, `req-token-tiers`                      |
| [0020](0020-the-palette-carries-no-spares.md)   | The palette carries no spare steps                 | `req-token-tiers`                                         |
