# 0022 — One message line, and it is the error that takes it

**Status:** accepted
**Implements:** [`req-api-message`](../requirements/api.md#req-api-message),
[`req-api-no-wrapper`](../requirements/api.md#req-api-no-wrapper)
**Evidence:** [`lesson-76`](../lessons.md#lesson-76) — a run over the four components that
draw messages, before and after

## Context

`pct-field` lights exactly one line below the control: `@if (showError()) … @else if (hint())`.
A template comment held the reason, and no requirement held the rule.

`pct-checkbox`, `pct-radio-group` and `pct-select` each wrote two independent `@if` blocks, so
standing on their own they showed the hint AND the error at once and named both in
`aria-describedby`. Measured rather than read off, because the finding
([C13](../plan.md#c-open-findings)) named one component and was written from a template:

| component         | hint only | hint + error, before         | after         |
| ----------------- | --------- | ---------------------------- | ------------- |
| `pct-field`       | `hint`    | `error`                      | `error`       |
| `pct-checkbox`    | `hint`    | `hint` + `error`             | `error`       |
| `pct-radio-group` | `hint`    | `group-hint` + `group-error` | `group-error` |
| `pct-select`      | `hint`    | `hint` + `error`             | `error`       |

`aria-describedby` followed the DOM in every row, so the divergence was two answers about what
a screen reader says, not only about a row of layout.

## Decision

**One message at a time, everywhere: the error takes the line, the hint gives way, and the one
that gives way leaves the DOM.**

The question the finding asked — is a group different, because its message describes a set
rather than a control? — is answered by the measurement: the checkbox and the select are single
controls and they behaved like the group. What the two shapes really divide is **the chrome
against a control's own footer**, and that division is the defect: the same `pct-select` shows
one message inside `pct-field` and two outside it, so a wrapper documented as optional
([`req-api-no-wrapper`](../requirements/api.md#req-api-no-wrapper)) changes behaviour it was
supposed to leave alone.

Of the two answers we kept the chrome's, because it is the one with a reason written down, two
gates and a rendered page behind it; the controls' answer is what fell out of two `@if` blocks
written next to each other, in a state no page ever rendered.

## Consequences

- `aria-describedby` names exactly what is on the screen, in every mode. The alternative — the
  hint hidden by CSS and still cited — is a dangling description, and the alternative to that
  is a control that grows by a row on an error.
- The rule is gated in two independent ways: as behaviour, per control
  (`field-controls.spec.ts`), and as structure, over every template
  (`check-aria.mjs`, point 6 — a hint part and an error part must be branches of one
  conditional). The second is what covers a component nobody has written yet.
- The library agrees with Angular Material, Carbon and Fluent, and disagrees with GOV.UK, which
  keeps both.

## What this costs us

**The hint disappears exactly when the user is trying to fix the value** — and a hint is often
the instruction they need ("at least 8 characters", "format DD-MM-YYYY"). WCAG 2.2 AA is then
held up by the consumer's own text: 3.3.3 (Error Suggestion) requires the suggestion to be
provided when it is known, and after this decision the only place left for it is the error
message. That is a promise we cannot measure — the error text comes from the consumer's schema
validators — so it is written here as a cost and not up there as a gate.

The escape hatch is unequal between the modes: inside `pct-field` the `[pctMessageAux]` slot
stays lit whichever message is showing, and a control on its own has no such slot.

## Alternatives considered

- **Both messages, everywhere** (GOV.UK's answer): structurally safer for 3.3.3, since the
  instruction survives the error without depending on a text nobody measures. Rejected because
  it makes the field grow by a row exactly when the form below it must not move, and because it
  would reverse the one answer here that had a reason, a test and a page — on the strength of
  no measurement.
- **Keep the hint, hide it with CSS**: keeps the height and breaks the description —
  `aria-describedby` would point at something the user cannot see.
- **Let a group differ, because its message describes a set**: the shape the finding proposed.
  The measurement killed it: the checkbox and the select are not sets and behaved the same way.
