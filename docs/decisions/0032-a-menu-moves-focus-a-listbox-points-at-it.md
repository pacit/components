# 0032 — A menu moves focus, a listbox points at it

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** [`lesson-18`](../lessons.md#lesson-18) — a panel that keeps focus on its trigger
has to refuse the press that would move it, or every key the control owns loses its handler;
[`lesson-95`](../lessons.md#lesson-95) — a row that answers `Enter` only because it is a
`<button>` is a row whose `disabled` the platform enforces too

## Context

This library now draws two panels of options and they walk them differently. `pct-select` keeps
DOM focus on the trigger and names the active option with `aria-activedescendant`; `pct-menu`
gives DOM focus to the row itself and moves it with the arrows — the roving pattern.

Two patterns for what looks like one problem is the kind of thing that becomes an accident
nobody can explain a year later, so it is written down here as a choice with a reason.

The APG specifies both, one per pattern, and the reason is what the two roles **are**:

- a **combobox** is a value being edited with a list behind it. Focus belongs to the thing being
  edited — the user is typing, and a filtering combobox is typing into the very control the
  panel hangs off. Moving focus into the list would take the caret out of the field;
- a **menu** is a list of commands and nothing else. There is no value, no caret and nothing
  behind the panel that focus belongs to more than the row does. The row **is** where the user
  is standing.

Each road brings its own bill, and both bills have already been paid here:

**Pointing at it** costs the press. A panel focus never enters is a surface the user clicks
without it taking anything — and the browser disagrees by default, so `PctFocusStays` exists to
refuse the `mousedown` that would move focus to `body` and kill every key the trigger owns
([`lesson-18`](../lessons.md#lesson-18)). It also costs an id per option, because
`aria-activedescendant` is a reference and a reference needs something to point at.

**Moving it** costs the tab order. Focus inside a panel that is a child of `body` is focus at the
end of the document, so Tab has to be answered rather than allowed
([0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md)), and every row has to carry
`tabindex="-1"` so that none of them is a stop of its own. In exchange it buys the keyboard back
from the component: a row is a `<button>`, so `Enter` and `Space` are the platform's, and so is
`disabled`.

## Decision

**The role decides, and neither pattern is the library's default.** A panel whose items are
commands moves focus; a panel that is the list half of a control keeps focus on the control and
points at the active item.

The rule generalises to what is coming: the multiple-selection and filtering select stay on
`aria-activedescendant`, and a command palette — a list of commands with a filter above it — is the
interesting case, because it is a combobox by construction and its items are commands. It will point
rather than move, because the filter is a text field and the caret has to stay in it.

## Consequences

- Two walks over one machinery. `pctListNavigation` in `core` owns what both roles share — the
  reachable set, the edges, the typed prefix — and what differs is a parameter (`wrap`) or the
  control's own key map. The walk deliberately does not know whether the index it holds is a
  DOM focus or an `aria-activedescendant`.
- `PctFocusStays` stays what its own JSDoc says it is: the declaration that a panel does **not**
  take focus. The menu does not carry it, and that is now a documented difference rather than an
  omission.
- The menu's rows need no ids at all, where the select's options each need one. A menu built from a
  hundred-row `@for` therefore costs a hundred fewer strings than the equivalent select — not the
  reason for the decision, but worth knowing when virtualisation comes up.
- A disabled row is genuinely unpressable rather than politely ignored, because the platform's
  own `disabled` is what a menu row has and an `aria-activedescendant` option has not
  ([`lesson-95`](../lessons.md#lesson-95)).

## What would overturn it

A screen-reader log showing that a roving menu announces worse than an `activedescendant` one
in the readers people actually use — the gap in every component card here is exactly that log,
and this decision is one of the things it would be measuring.
