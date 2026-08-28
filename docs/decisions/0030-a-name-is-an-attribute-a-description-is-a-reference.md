# 0030 — A name is an attribute, a description is a reference

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-axe`](../requirements/a11y.md#req-a11y-axe),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-message`](../requirements/api.md#req-api-message)
**Evidence:** [`lesson-92`](../lessons.md#lesson-92) — the two roads audited in their **closed**
state, which is where a tooltip spends its life; [`lesson-91`](../lessons.md#lesson-91) — the
name of a control is often held by another element entirely

## Context

A tooltip carries one string, and the question the tooltip was written to force is what that string
**is** to the control it hangs on. HTML answers with `title`, which makes no distinction at all: the
browser turns it into a description on a named control and into a name on an unnamed one, shows it
after a delay nobody can set, hides it from touch entirely and cannot be styled. Every library that
replaces it has to make the choice `title` avoids.

The two cases are real and they are not variants of one another:

- **Delete the project** — a button that already says what it does, with a tooltip that says
  what it costs. The tooltip **describes**.
- **an icon-only button** — a trash can, a cross, a tick. There is nothing to read, and the
  tooltip is the only thing that says what the control is. The tooltip **names**.

The mechanism looks symmetric: point at the panel with `aria-describedby` in the first case and
with `aria-labelledby` in the second. It is not symmetric, and the measurement that says so is
about the state nobody thinks to audit — a tooltip is closed almost always, and its panel is
then not in the DOM at all.

Measured with axe-core over a page of four buttons ([`lesson-92`](../lessons.md#lesson-92)): an
icon-only button whose name is a panel that is not attached fails `button-name` at **critical**,
and so does one pointing at the panel's id with `aria-labelledby` — a reference to nothing
contributes nothing to a name. A dangling `aria-describedby`, on the same page and in the same
run, produces **not one finding**.

## Decision

**The name is an attribute; the description is a reference.**

- `pctTooltipAs="name"` writes `aria-label` on the trigger, from the input and permanently —
  whether the tooltip is open, closed or never opened at all, and on the server too, because a
  name is part of the markup rather than of an interaction. The visible panel is a second
  rendering of the same string.
- `pctTooltipAs="description"` (the default) adds the panel's id to the trigger's
  `aria-describedby` **while the panel is attached**, and takes it back out when it leaves.
  `aria-describedby` is a **list**: a control inside the field chrome already points at its hint
  through it ([`req-api-message`](../requirements/api.md#req-api-message)), so the id is appended
  and removed rather than the attribute written over.

Neither road is chosen for the author. Which one a tooltip is depends on what the control
already says, and that is the one thing the library cannot know better than the person writing
the page — so the default is the one that **adds** (`description`), and the choice is reported
in dev mode when it looks wrong: a description on a control with no name of its own, or a name
that does not contain the text the control visibly reads (WCAG 2.5.3, speech input has no way
of addressing such a control).

## Consequences

**A description exists only while the panel does.** A screen-reader user reading the page with a
virtual cursor, never focusing the control, is not given it. That is the price, and it is
written into the component's card as a limitation: **a tooltip may never carry something the
page says nowhere else.**

The road not taken was a hidden copy of the text kept in the DOM for good — the shape
`@angular/cdk`'s `AriaDescriber` has, and the one the APG's own example takes by keeping the
tooltip element rendered and hidden. It buys the virtual cursor its description, and it costs a
second rendering of every tooltip string that has to stay in step with the first, plus a
container in the consumer's `body` that belongs to no component and appears in no part
inventory. If the screen-reader log this repository still owes
([`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)) shows the missing description
mattering in practice, this is the decision to revisit — and the measurement, not the taste,
will be what reopens it.

**The dev-mode report is the check, not a repair.** Both messages describe a situation the
library could "fix" by guessing: swapping to `name` when it finds no name, or refusing to write
a name that shadows visible text. Guessing here would replace an author's decision with a
heuristic that is right most of the time, and the failure mode of "most of the time" is a
control announced as something its page does not say.
