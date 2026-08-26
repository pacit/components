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

| no                                                                    | decision                                                                                   | implements                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [0001](0001-separate-files.md)                                        | Template and styles in separate files                                                      | `req-project-files`, `req-api-names`                                             |
| [0002](0002-skin-in-package.md)                                       | The skin ships in the package                                                              | `req-project-tokens-lib`, `req-token-distribution`, `req-quality-package`        |
| [0003](0003-wrapper-and-control.md)                                   | Wrapper and control                                                                        | `req-api-wrapper`, `req-api-frame`, `req-api-no-wrapper`, `req-api-parts-unique` |
| [0004](0004-explicit-height.md)                                       | Height stated outright, not derived from padding                                           | `req-api-size`                                                                   |
| [0005](0005-signal-forms-without-cva.md)                              | Signal forms without `ControlValueAccessor`                                                | `req-api-signal-forms`, `req-api-container`                                      |
| [0006](0006-overlay.md)                                               | The anchor and inheritance in an overlay                                                   | `req-api-overlay`                                                                |
| [0007](0007-config-and-texts.md)                                      | Configuration apart from texts                                                             | `req-api-config`, `req-api-texts`                                                |
| [0008](0008-motion-axis.md)                                           | The motion axis in tokens                                                                  | `req-a11y-motion`                                                                |
| [0009](0009-number-field.md)                                          | The number field on `type="text"`                                                          | `req-api-number`                                                                 |
| [0010](0010-generic-noinfer.md)                                       | A generic value and `NoInfer`                                                              | `req-api-generic`                                                                |
| [0011](0011-icons.md)                                                 | Icons through a template and `PCT_ICONS` — **accepted (the mechanism is not built)**       | `req-api-icons`, `req-api-icons-custom`                                          |
| [0012](0012-theme-closure.md)                                         | The transitive closure in a theme block                                                    | `req-token-closure`, `req-token-scoped`                                          |
| [0013](0013-no-headless-split.md)                                     | No headless core / skin split                                                              | `req-project-core`, `req-api-parts`, `req-api-attributes`                        |
| [0014](0014-texts-as-signal.md)                                       | Texts as a signal, read at render time                                                     | `req-api-texts`                                                                  |
| [0015](0015-license-and-model.md)                                     | MIT everywhere, rights to the entity, no CLA                                               | `req-release-metadata`                                                           |
| [0016](0016-mit-irreversibility.md)                                   | Releasing under MIT is irreversible, so the order is a decision                            | `req-project-package`                                                            |
| [0017](0017-one-home-per-fact.md)                                     | One home per fact: the concision criterion and its budget                                  | `req-project-concise`                                                            |
| [0018](0018-no-sass-entry-point.md)                                   | No Sass entry point: the token surface is custom properties and types                      | `req-token-artifacts`                                                            |
| [0019](0019-primitives-are-not-the-contract.md)                       | A primitive colour is not the contract; a primitive scale is                               | `req-token-names`, `req-token-tiers`                                             |
| [0020](0020-the-palette-carries-no-spares.md)                         | The palette carries no spare steps                                                         | `req-token-tiers`                                                                |
| [0021](0021-an-index-is-derived-or-measured.md)                       | An index is generated where every column is derivable, measured where one is not           | `req-quality-index`                                                              |
| [0022](0022-one-message-line.md)                                      | One message line, and it is the error that takes it                                        | `req-api-message`, `req-api-no-wrapper`                                          |
| [0023](0023-a-tolerance-is-for-a-wobbling-measurement.md)             | A tolerance is for a measurement that wobbles                                              | `req-project-tree-shaking`                                                       |
| [0024](0024-the-closing-stack-is-the-dependency-s.md)                 | The overlay layer carries what an overlay severs, and borrows the closing stack            | `req-api-overlay`, `req-project-core`                                            |
| [0025](0025-a-panel-says-whether-it-takes-focus.md)                   | A panel says whether it takes focus, and the rest of the focus layer waits for a consumer  | `req-api-overlay`, `req-a11y-built-in`, `req-project-core`                       |
| [0026](0026-one-channel-per-politeness.md)                            | One channel per politeness, and a message with a home announces from it                    | `req-a11y-built-in`, `req-api-texts`, `req-project-core`                         |
| [0027](0027-a-slot-is-a-directive.md)                                 | A slot is a directive of its own, not a name in a string                                   | `req-api-templates`, `req-api-generic`                                           |
| [0028](0028-an-icon-set-is-a-component.md)                            | An icon set is a component, and an icon's box is the contract                              | `req-api-icons`, `req-api-icons-custom`                                          |
| [0029](0029-a-modal-is-an-overlay-not-a-dialog-element.md)            | A modal is an overlay, not a `<dialog>` — the platform's modal is not composable with ours | `req-api-overlay`, `req-a11y-built-in`, `req-api-platform`, `req-project-core`   |
| [0030](0030-a-name-is-an-attribute-a-description-is-a-reference.md)   | A name is an attribute, a description is a reference                                       | `req-a11y-built-in`, `req-a11y-axe`, `req-api-platform`, `req-api-message`       |
| [0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md)            | A panel's tab order belongs to its trigger                                                 | `req-a11y-wcag`, `req-a11y-built-in`, `req-api-overlay`                          |
| [0032](0032-a-menu-moves-focus-a-listbox-points-at-it.md)             | A menu moves focus, a listbox points at it                                                 | `req-a11y-built-in`, `req-a11y-wcag`, `req-api-platform`                         |
| [0033](0033-an-option-is-a-row-of-data.md)                            | An option is a row of data, not a component the consumer projects                          | `req-api-generic`, `req-api-templates`, `req-api-signals`                        |
| [0034](0034-multiplicity-is-a-tag.md)                                 | Multiplicity is a type, so it is a tag                                                     | `req-api-generic`, `req-api-signal-forms`, `req-api-signals`                     |
| [0035](0035-a-filter-is-a-question-not-a-value.md)                    | A filter is a question, not a value                                                        | `req-a11y-built-in`, `req-api-platform`, `req-api-generic`                       |
| [0036](0036-a-clear-takes-back-what-the-trigger-shows.md)             | A clear takes back what the trigger shows                                                  | `req-a11y-built-in`, `req-a11y-touch`, `req-api-platform`                        |
| [0037](0037-loading-is-a-fact-about-the-list.md)                      | Loading is a fact about the list, and a cursor names an option                             | `req-a11y-built-in`, `req-a11y-wcag`, `req-api-signals`, `req-api-texts`         |
| [0038](0038-a-window-is-measured-and-its-spacer-is-not-an-element.md) | A window is measured, and its spacer is not an element                                     | `req-a11y-wcag`, `req-a11y-built-in`, `req-api-signals`                          |
| [0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md)   | A state the platform publishes is not ours to write                                        | `req-a11y-built-in`, `req-a11y-wcag`, `req-api-platform`, `req-api-native-input` |
