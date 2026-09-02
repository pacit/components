# `PctPopover` — a panel of content on a live page

**Entrypoint:** `@pacit/components/popover`
**Selector:** `pct-popover` (the control that opens it carries `[pctPopoverTrigger]`,
`PctPopoverTrigger`)
**Status:** released
**ARIA APG pattern:** [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — the
**non-modal** reading of it: `role="dialog"` with **no** `aria-modal`, focus moved into the
panel and given back to the trigger, Escape from the closing stack. The trigger is the
[Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) half: `aria-expanded` on the
control, `aria-haspopup="dialog"`, `aria-controls` while the panel is up

It is the dialog minus one word, and every difference follows from that word: no veil, nothing
made `inert`, no scroll lock — the page behind goes on answering, which is the whole point of a
panel that hangs off a control instead of standing over the page. What it keeps is the part a
panel with content cannot do without: it takes focus, it says what it is, and it hands focus
back to the trigger on the way out
([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).

## Contract

|                 |                                                                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a popover holds no value. What it holds is an open state, and that is a `model`: an application opens it, and the popover closes itself on Escape, on a press outside, on the trigger and on Tab walking out                                                                 |
| **Inputs**      | `open` (a `model<boolean>`), `heading`, `ariaLabel`, `ariaLabelledby`, `placement` (`top` \| `bottom` \| `start` \| `end`, default `bottom`); on the trigger: `pctPopoverTrigger` (the `pct-popover` itself, from a template reference variable)                                    |
| **Outputs**     | `closed: PctPopoverCloseReason` — `trigger` \| `escape` \| `outside` \| `away` \| `api`. It fires at the **decision** to close, not at the end of the fade: the event says the popover was closed, and the transition is what the pixels do about it afterwards                     |
| **Naming**      | `heading` names the panel through `aria-labelledby`; `ariaLabel`/`ariaLabelledby` for a panel whose name is elsewhere. An open popover with no name at all is reported in dev mode. The trigger names nothing — it says `aria-expanded` and, while the panel is up, `aria-controls` |
| **Slots**       | the default one: the content is the consumer's, and the panel gives it a column and stays out of it                                                                                                                                                                                 |
| **Parts**       | `panel`, `heading`, `content`                                                                                                                                                                                                                                                       |
| **Tokens**      | the `--pct-popover-*` prefix plus three entries in `contrast.policy.json`. The surface is the **page's own** (`pct.surface` / `pct.text`), unlike the tooltip's inverted one: this is a piece of the page lifted off it for a moment, not an annotation laid over it                |
| **DI contract** | none of its own. `pctOverlay`, `pctPlacementPositions` and `pctAfterTransition` from `core`; `InteractivityChecker` from `@angular/cdk/a11y` for the edge of the panel's own tab order                                                                                              |
| **Strings**     | none — everything it shows is the author's. The panel draws no close button, so there is no label to translate ([below](#known-limitations))                                                                                                                                        |
| **SSR**         | the panel is a template attached to an overlay by a browser render, so a popover left `open` at bootstrap sends no markup and hydrates no mismatch. The trigger's `aria-expanded` is the deliberate exception — it is part of the control's markup rather than of an interaction    |

**What arrives from somewhere else, and what is written here.** The positioning is the CDK's
flexible strategy, given a list of positions by `pctPlacementPositions`; the Escape ordering and
the outside press are the CDK dispatchers' ([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md));
what Tab can reach is `InteractivityChecker`. Written here: **where focus goes and where it comes
back from** ([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)), the rule
that a press on the trigger is not a press outside the panel
([`lesson-93`](../lessons.md#lesson-93)), and the leave — an element removed from the DOM takes
its transition with it, so the panel is held in place, marked, until the fade has run.

## Keyboard map

| key                            | effect                                                                                                       | test                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `Escape`                       | closes it; focus goes back to the trigger **if it was in the panel**                                         | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Tab`                          | from the panel, into its content; from the last control, out — closing it and returning focus to the trigger | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Shift+Tab`                    | from the first control, the same way out                                                                     | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Enter`/`Space` on the trigger | toggles it, which is the button's own behaviour and nothing this component adds                              | `libs/components/popover/src/popover.spec.ts` |

The panel itself is not in the Tab order (`tabindex="-1"`); it is focused programmatically on
opening, so that its role and name are announced before the user is anywhere inside it.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/popover/src/popover.ts` — the pattern named in the class comment, together with the one attribute it must not carry                                                                                                                                                                                        |
| Keyboard map tested             | `apps/sandbox-e2e/src/popover.spec.ts` — Escape, Tab out in both directions, in three engines; `libs/components/popover/src/popover.spec.ts` for the edge of the tabbable list                                                                                                                                              |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/popover` view, and separately **an open popover with the whole page**: the dialog's audit is scoped to its panel because the rest is `inert`, and here nothing is — the trigger's `aria-expanded`/`aria-controls` only mean something measured together with what they point at |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `popover-open`, the card rather than the panel: this component draws the page's own surface, so the edge is all there is between the two and a picture of the panel alone would not show it                                                                                         |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the mode takes the shadow away and the panel keeps a `CanvasText` edge, which is then the only thing separating it from the page                                                                                                                                             |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/popover.spec.ts` — the duration read from the panel is the reduced one, and the leave still ends                                                                                                                                                                                                      |
| Touch target ≥ 24×24 px         | none — deliberately: the popover draws no target of its own. It hangs on the consumer's control, and that control's size is that control's promise                                                                                                                                                                          |
| Size axis                       | none — deliberately: a popover has no control height. `req-api-size` is about `--pct-control-height-*`; the only width here is `--pct-popover-panel-max-width`, which a consumer overrides                                                                                                                                  |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                      |
| RTL                             | `apps/sandbox-e2e/src/popover.spec.ts` — the inline gap measured in both writing directions. It is the one thing a screenshot would not catch: the dependency resolves `start`/`end` by direction and adds the offset as plain pixels afterwards, so a sign left physical lays the panel over the control it belongs to     |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/popover` view renders and hydrates with no `NG05xx`; a closed popover contributes no markup, and the trigger's `aria-expanded="false"` is there from the server                                                                                                            |
| Forms                           | none — deliberately: a popover is not a form control. It holds no value and implements no `FormValueControl`. A form **inside** one is the consumer's, and it reaches the chrome exactly as it would anywhere else                                                                                                          |
| The page behind stays live      | `apps/sandbox-e2e/src/popover.spec.ts` — a control beside the panel answers a press while the panel is up, and `<html>` is not locked. Measured rather than declared: it is the one promise that separates this component from the dialog                                                                                   |
| Focus in, and back              | `apps/sandbox-e2e/src/popover.spec.ts` (the panel takes focus, Tab reaches the content, Escape hands it back) + `libs/components/popover/src/popover.spec.ts` (the restore happens **only** when focus was inside, so Escape pressed from the live page behind moves nothing)                                               |
| The leave is waited out         | `apps/sandbox-e2e/src/popover.spec.ts` (the panel outlives the decision to close) + `libs/components/core/src/core.spec.ts` (`pctAfterTransition`: the event, the timeout floor and the cancel)                                                                                                                             |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                         |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — the panel's text, its heading, and the edge measured against the **page** rather than against a veil, which is where the modal and the non-modal panel part company                                                                                                                |
| Strings through `PCT_TEXTS`     | none — deliberately: the component writes no string of its own                                                                                                                                                                                                                                                              |
| Size budget                     | `libs/components/size.snapshot.md` — the `./popover` row, with `./core` beside it                                                                                                                                                                                                                                           |
| Screen-reader log               | none — gap. The same one the dialog, the select and the tooltip have. What a reader really announces when a non-modal dialog takes focus is a question axe does not answer — axe examines structure, it does not listen                                                                                                     |
| docs page                       | `/components/popover` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                    |

## Decisions

[0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) (the main one — where Tab
goes when the panel is not modal, and why not a trap and not `focusout`),
[0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md) (why this is a CDK
overlay and not the platform's popover or `<dialog>`),
[0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md) (Escape and the outside press
come from the dependency's dispatchers),
[0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md) (this is a panel of the kind
that takes focus), [0013](../decisions/0013-no-headless-split.md) (the inputs are ours, the
mechanisms the dependency's)

## Known limitations

- **One trigger per popover.** Focus comes back to "the trigger", so two controls opening one
  panel would make that "whichever registered last". Reported in dev mode rather than repaired:
  the fix is a popover each, and the library cannot know which of the two the author meant.
- **No close button.** A dialog draws one because its trigger may be anywhere and the veil hides
  the page; a popover always has a live trigger beside it, and Escape, a press outside and Tab
  are three more ways out. A panel that needs an explicit answer puts a button in its own
  content — `(click)="panel.open.set(false)"` — which is also why the component carries no
  string to translate.
- **It is not a place to park.** Tab is a way out, so a panel the user is meant to leave and come
  back to — a docked filter panel, a side sheet — is not this component
  ([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)). The drawer is where
  that shape belongs.
- **No arrow.** A pointer drawn from the panel to the trigger is one more thing to position and
  repaint on every flip; the 8 px gap and the placement say the same thing more cheaply. The
  same call as the tooltip's.
- **A popover inside a popover is not a pattern here.** Nothing forbids it and the closing stack
  orders the two correctly, but the focus return of the inner one lands on a trigger inside the
  outer one, and nothing measures that arrangement. A menu with submenus is the menu's problem, and
  it is a different component.
