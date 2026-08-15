# 0013 — No headless core / skin split

**Status:** accepted
**Implements:** [`req-project-core`](../requirements/project.md#req-project-core),
[`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-api-attributes`](../requirements/api.md#req-api-attributes)
**Evidence:** a measurement in the repository (the "Context" section) — not a lesson. This
decision **precedes** the failure instead of following it, and that is written down outright,
because evidence from a measurement is weaker than evidence from a run

## Context

We considered cutting the library in two: a base one with the logic, ARIA, behaviours and
states, and a visual one with the templates and the theme. The motivation was double — the next
skin would be made by "just adding the looks", and `data-pct-part` would stop being needed as
an advanced-styling contract.

The assessment rested on three facts gathered from the code and from the ecosystem.

**1. Half of that split already exists.** `button[pctButton]`, `input[pctText]` and
`[pctNumber]` are attribute components on native elements with an empty template — the DOM
belongs to the consumer, the library supplies behaviour and a stylesheet. `core` already holds
the control contract, message derivation, id generation, configuration and texts. **Four**
surfaces have a DOM of their own: the wrapper, the checkbox, the radio and the select. Only one
is genuinely complex.

**2. `@angular/aria` exists.** Version 22.1.0 (checked 2026-08-03, the same line as our
22.0.x), with `listbox`, `combobox`, `menu`, `tabs`, `accordion`, `grid` entrypoints, each with
its own `/testing`. A headless layer of our own for those roles means competing with the
framework team over something they ship in the same version.

**3. Template reuse is narrower than it looks.** A skin with a floating label (a notched
outline) will not use the wrapper's template — the label's position is **structure**, not
paint. A checkbox as a switch will not use the checkbox template, because the mark is an SVG
inside the box. The class of skins that would genuinely reuse a template is exactly the class
**tokens already handle**.

Plus the duplication measurement the whole conversation started from — the same block of
plumbing (seven `FormUiControl` inputs, `touch`, identifiers, injecting the wrapper,
`fieldDescribedBy`/`setDescribedBy`, `pctFieldMessages`, `describedBy`, `showError`, `onBlur`,
`focus`, `reset`) in six files:

| file             | lines | repeated plumbing |
| ---------------- | ----: | ----------------: |
| `checkbox.ts`    |   159 |               ~30 |
| `radio-group.ts` |   215 |               ~28 |
| `select.ts`      |   489 |               ~30 |
| `text.ts`        |   147 |               ~21 |
| `number.ts`      |   379 |               ~21 |
| `radio.ts`       |    91 |                ~6 |

`radio.ts` is low because the group's contract is the container
([`req-api-container`](../requirements/api.md#req-api-container)). In `PctCheckbox` genuinely
its own is about 20 lines — `ariaChecked`, blocking changes while `readonly`, handling
`change`. The rest is a tax paid five times.

## Decision

**We do not split the library into a base package and a visual one.** Instead, three
resolutions:

1. **Behaviour is extracted into `core` by composition**
   ([`req-project-core`](../requirements/project.md#req-project-core)) — functions returning
   signals, and directives, **not a base class underneath somebody else's templates**. The
   pattern is `pctFieldMessages`, which was built that way already.
2. **`data-pct-part` stays** as a public styling contract and is closed the expensive way:
   a generated inventory plus a gate ([`req-api-parts`](../requirements/api.md#req-api-parts)).
   Deleting it was a benefit **of the split**; without the split that benefit is not on offer.
3. **The `data-pct-*` state contract is strengthened, not weakened**
   ([`req-api-attributes`](../requirements/api.md#req-api-attributes)). It is the only channel
   through which behaviour tells the stylesheet what state it is in — and with every
   customisation path it becomes more important, not less.

The "the consumer wants a look that fits 100%" path stays open, but it leads through
**copying schematics** ([`req-release-ng-add`](../requirements/release.md#req-release-ng-add)),
not through a second package. The order is forced: a file to be copied has to become thin
first, so point 1 is a precondition for that, not the other way round.

## Consequences

- **The promises the project wins on stay on our side.** The contrast gate
  ([`req-token-contrast`](../requirements/tokens.md#req-token-contrast)), forced colours
  ([`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)), the touch
  target ([`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)), the visual screenshots
  and the axe audit are properties of the **rendered output**, not of the logic. Handing over
  the template would hand over precisely the half [`req-axis`](../00-axis.md#req-axis) is
  about.
- **Template inheritance is rejected as a mechanism**, because the template↔class contract is
  unchecked. A concrete case from our code: `select.ts` holds a `viewChild('panel')` without
  `required` and uses it to scroll the active option into view through a double `?.`. A
  template naming that element differently **silently** loses the scrolling — no error, green
  tests. That is the same class of failure as [`lesson-38`](../lessons.md#lesson-38), one floor
  up.
- **A thicker `core` raises the urgency of mutation testing the core**
  ([`req-quality-unit`](../requirements/quality.md#req-quality-unit)) — its deadline reads "the
  more components stand on it", and this decision is precisely what increases what stands on
  it.
- **The `req-project-core` control got a documented case in which it did not work.** It reads
  "the violation is duplication, not a failure; review catches it" — and review let the same
  block through six times. That does not invalidate the decision to have no machine gate, but
  it strips it of the status of an assumption.
- Generalising the overlay from [`lesson-35`](../lessons.md#lesson-35) waits for a **second**
  user (the dialog); we are not doing it now. A primitive with one use is a guess about what
  the second one looks like.

## What this costs us

- **There is no path for somebody who dislikes the look and for whom tokens are not enough.**
  Until the copying schematics exist, the answer is "override through `data-pct-part`" — the
  very gymnastics the split was meant to avoid.
- **We are not using `@angular/aria` today**, even though it covers roles we implement
  ourselves. That is a deliberate deferral, not an oversight — the assessment falls due when the
  select family is completed and at the menu
  ([`req-api-templates`](../requirements/api.md#req-api-templates)).
- **The decision is reversible, but not for free.** The more components, the more templates to
  cut apart. Reversing after twenty components is more expensive than today — though still
  cheaper than reversing a split made too early, because then the cost would also include
  a version compatibility matrix between packages.

## Alternatives considered

| alternative                                                  | why rejected                                                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two packages: a headless core plus a skin                    | hands over the rendered output, i.e. the layer where all the evidence for [`req-axis`](../00-axis.md#req-axis) lives; adds a version compatibility matrix |
| A base class with the logic, the template in a derived class | the template↔class contract is unchecked (`viewChild` without `required` goes dark quietly); `imports` are not inherited                                  |
| Full component copy-paste (the shadcn model)                 | the consumer gets 489 lines of `select.ts` and owns the keyboard map; our accessibility evidence stops applying to their copy                             |
| Split deferred, but the API designed "for a future core"     | a variability mechanism built before the second variant hits one case — and fact 3 shows the most likely one does not fit                                 |
| Dropping `data-pct-part` without the split                   | takes away the only advanced-styling path and gives nothing in return                                                                                     |
