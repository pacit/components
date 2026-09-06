# `PctPopover` — a panel of content on a live page

**Summary:** A panel of content anchored to a control, with the page behind it still answering.
**Entrypoint:** `@pacit/components/popover`
**Selector:** `pct-popover` (the control that opens it carries `[pctPopoverTrigger]`,
`PctPopoverTrigger`)
**Status:** released
**Category:** Overlays
**ARIA APG pattern:** the non-modal reading of
[Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — `role="dialog"` with **no**
`aria-modal`, focus moved into the
panel and given back to the trigger, Escape from the closing stack. The trigger is the
[Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) half: `aria-expanded` on the
control, `aria-haspopup="dialog"`, `aria-controls` while the panel is up

It is the dialog minus one word, and every difference follows from that word: no veil, nothing
made `inert`, no scroll lock — the page behind goes on answering, which is the whole point of a
panel that hangs off a control instead of standing over the page. What it keeps is the part a
panel with content cannot do without: it takes focus, it says what it is, and it hands focus
back to the trigger on the way out
([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).

**Or it is a part of the page.** `inline` draws the same panel where the consumer wrote the
component instead of in a layer over it — a filter panel that stands permanently in a wide
column and hangs off a button on a narrow screen is one component with two lives, and only the
page knows which of the two it is. That is
[0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)'s sentence
about the drawer, made an input; what it costs is set out under Contract below.

## Usage

```html
<button pctButton [pctPopoverTrigger]="filters">Filters</button> <pct-popover #filters heading="Filters">…</pct-popover>

<!-- the same panel drawn where it stands: no layer, no anchor, and there from the server -->
<pct-popover inline [open]="true" heading="Filters">…</pct-popover>

<!-- one panel with two lives — a column on a wide page, a layer on a narrow one -->
<button pctButton [pctPopoverTrigger]="filters">Filters</button>
<pct-popover #filters [inline]="wide()" [(open)]="filtersOpen" heading="Filters">…</pct-popover>
```

## Contract

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a popover holds no value. What it holds is an open state, and that is a `model`: an application opens it, and the popover closes itself on Escape, on a press outside, on the trigger and on Tab walking out                                                                                                                                                                                                                       |
| **Inputs**      | `open` (a `model<boolean>`), `heading`, `ariaLabel`, `ariaLabelledby`, `placement` (`top` \| `bottom` \| `start` \| `end`, default `bottom`, and nothing at all when `inline`), `inline` (`boolean`, default `false`); on the trigger: `pctPopoverTrigger` (the `pct-popover` itself, from a template reference variable)                                                                                                                 |
| **Outputs**     | `closed: PctPopoverCloseReason` — `trigger` \| `escape` \| `outside` \| `away` \| `api`. It fires at the **decision** to close, not at the end of the fade: the event says the popover was closed, and the transition is what the pixels do about it afterwards. Inline only `trigger` and `api` can arrive; the other three were the overlay's                                                                                           |
| **Naming**      | `heading` names the panel through `aria-labelledby`; `ariaLabel`/`ariaLabelledby` for a panel whose name is elsewhere. An open popover with no name at all is reported in dev mode. The trigger names nothing — it says `aria-expanded` and, while the panel is up, `aria-controls`                                                                                                                                                       |
| **Slots**       | the default one: the content is the consumer's, and the panel gives it a column and stays out of it                                                                                                                                                                                                                                                                                                                                       |
| **Parts**       | `panel`, `heading`, `content`                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Harness**     | `PctPopoverHarness`, `PctPopoverTriggerHarness`                                                                                                                                                                                                                                                                                                                                                                                           |
| **Tokens**      | the `--pct-popover-*` prefix plus three entries in `contrast.policy.json`. The surface is the **page's own** (`pct.surface` / `pct.text`), unlike the tooltip's inverted one: this is a piece of the page lifted off it for a moment, not an annotation laid over it                                                                                                                                                                      |
| **DI contract** | none of its own. `pctOverlay`, `pctPlacementPositions` and `pctAfterTransition` from `core`; `InteractivityChecker` from `@angular/cdk/a11y` for the edge of the panel's own tab order                                                                                                                                                                                                                                                    |
| **Strings**     | none — everything it shows is the author's. The panel draws no close button, so there is no label to translate ([below](#known-limitations))                                                                                                                                                                                                                                                                                              |
| **SSR**         | the panel is a template attached to an overlay by a browser render, so a popover left `open` at bootstrap sends no markup and hydrates no mismatch. The trigger's `aria-expanded` is the deliberate exception — it is part of the control's markup rather than of an interaction. **`inline` inverts this**, and that is the property it exists for: the panel is markup of the host template, so an open one is in what the server sends |

**What arrives from somewhere else, and what is written here.** The positioning is the CDK's
flexible strategy, given a list of positions by `pctPlacementPositions`; the Escape ordering and
the outside press are the CDK dispatchers' ([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md));
what Tab can reach is `InteractivityChecker`. Written here: **where focus goes and where it comes
back from** ([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)), the rule
that a press on the trigger is not a press outside the panel
([`lesson-93`](../lessons.md#lesson-93)), and the leave — an element removed from the DOM takes
its transition with it, so the panel is held in place, marked, until the fade has run. The inline
panel is that same template rendered through `NgTemplateOutlet` and never a second copy of it:
one set of classes, one set of parts, one stylesheet, or the two drift at the first edit of
either.

**Drawn in the page (`inline`).** What it gives up is what the overlay was doing, and the list is
short because the overlay was doing four things.

| the overlay did                                               | inline                                                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| placed the panel against the trigger                          | gone, and `placement` with it — a panel drawn in the page is placed by the page                                                                                    |
| handed back what a panel outside the tree stops inheriting    | not needed: the theme, the typeface, the size and the writing direction reach it because it never left ([`lesson-35`](../lessons.md#lesson-35) read as an absence) |
| delivered Escape and the outside press from the closing stack | neither arrives — the stack has no entry for a panel that was never attached ([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md))                  |
| stood at the end of the document's tab order                  | it stands where its trigger does, so 0031's Tab splice is dropped: Tab walks into the panel, through it and out the far side, and the panel stays                  |

It **keeps** `role="dialog"`, `tabindex="-1"`, its heading and its name, its parts, its
stylesheet and its `open` model. Two more things follow, and both are choices rather than
consequences. **Nothing moves focus**: focus into the panel is how a reader is told about
something that appeared elsewhere in the document, one that appears where the reader already is
has said so by being there, and an inline popover left `open` at bootstrap would otherwise pull
focus the moment the page hydrated. **And there is no leave**: the enter is the stylesheet's
(`@starting-style` needs no JavaScript and fires wherever the panel is inserted), but
`data-pct-leaving` exists to hold a node in the DOM until its fade has run, and inline that node
would be holding a hole open in the page's own layout while it waits. `open` false takes it out
at once.

A trigger is optional inline rather than forbidden — a panel a button reveals in the page is an
ordinary disclosure, and it is not reported as a missing one when there is none. The control
drops `aria-haspopup` there and keeps `aria-expanded` and `aria-controls`, which is exactly what
the drawer's trigger carries.

## Parts

| part      | what it is                      |
| --------- | ------------------------------- |
| `panel`   | the floating box                |
| `heading` | the title the panel is named by |
| `content` | the projected body              |

## Theming

```css
[data-theme='brand'] {
  --pct-popover-panel-bg: #f0fdfa;
  --pct-popover-panel-fg: #134e4a;
  --pct-popover-heading-fg: #0f766e;
}
```

## Keyboard map

| key                            | effect                                                                                                       | test                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `Escape`                       | closes it; focus goes back to the trigger **if it was in the panel**                                         | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Tab`                          | from the panel, into its content; from the last control, out — closing it and returning focus to the trigger | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Shift+Tab`                    | from the first control, the same way out                                                                     | `apps/sandbox-e2e/src/popover.spec.ts`        |
| `Enter`/`Space` on the trigger | toggles it, which is the button's own behaviour and nothing this component adds                              | `libs/components/popover/src/popover.spec.ts` |

The panel itself is not in the Tab order (`tabindex="-1"`); it is focused programmatically on
opening, so that its role and name are announced before the user is anywhere inside it.

**None of the first three rows is true `inline`.** Escape and the outside press are the closing
stack's and never reach a panel that was never attached; Tab walks through the panel and out the
far side, which is the whole point of drawing it in the page. Each is measured there as an
absence, in `libs/components/popover/src/popover.spec.ts`.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/popover/src/popover.ts` — the pattern named in the class comment, together with the one attribute it must not carry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Keyboard map tested             | `apps/sandbox-e2e/src/popover.spec.ts` — Escape, Tab out in both directions, in three engines; `libs/components/popover/src/popover.spec.ts` for the edge of the tabbable list                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/popover` view, and separately **an open popover with the whole page**: the dialog's audit is scoped to its panel because the rest is `inert`, and here nothing is — the trigger's `aria-expanded`/`aria-controls` only mean something measured together with what they point at                                                                                                                                                                                                                                                                                             |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `popover-open`, the card rather than the panel: this component draws the page's own surface, so the edge is all there is between the two and a picture of the panel alone would not show it — the sandbox's navigation blanked by the stage, so a row in that list is not a pixel here (plan 4.23)                                                                                                                                                                                                                                                                              |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the mode takes the shadow away and the panel keeps a `CanvasText` edge, which is then the only thing separating it from the page                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/popover.spec.ts` — the duration read from the panel is the reduced one, and the leave still ends                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Touch target ≥ 24×24 px         | none — deliberately: the popover draws no target of its own. It hangs on the consumer's control, and that control's size is that control's promise                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Size axis                       | none — deliberately: a popover has no control height. `req-api-size` is about `--pct-control-height-*`; the only width here is `--pct-popover-panel-max-width`, which a consumer overrides                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RTL                             | `apps/sandbox-e2e/src/popover.spec.ts` — the gap on the inline axis measured in both writing directions. It is the one thing a screenshot would not catch: the dependency resolves `start`/`end` by direction and adds the offset as plain pixels afterwards, so a sign left physical lays the panel over the control it belongs to                                                                                                                                                                                                                                                                                     |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/popover` view renders and hydrates with no `NG05xx`; a closed popover contributes no markup, and the trigger's `aria-expanded="false"` is there from the server                                                                                                                                                                                                                                                                                                                                                                                                        |
| Drawn in the page (`inline`)    | `libs/components/popover/src/popover.spec.ts` — the panel in the consumer's own tree with no CDK pane beside it, put there by a pass over the host view alone (no `afterNextRender`, which is the hook a server never runs), plus one case per dropped semantic: no focus taken on opening, Tab left alone in both directions, Escape and the outside press inert, no missing-trigger warning, and a switch between the two modes that moves the panel without closing it. **Gap**: no e2e and no screenshot — `apps/sandbox` has no inline view yet, so the three-engine reading and the real hydration are unmeasured |
| Forms                           | none — deliberately: a popover is not a form control. It holds no value and implements no `FormValueControl`. A form **inside** one is the consumer's, and it reaches the chrome exactly as it would anywhere else                                                                                                                                                                                                                                                                                                                                                                                                      |
| The page behind stays live      | `apps/sandbox-e2e/src/popover.spec.ts` — a control beside the panel answers a press while the panel is up, and `<html>` is not locked. Measured rather than declared: it is the one promise that separates this component from the dialog                                                                                                                                                                                                                                                                                                                                                                               |
| Focus in, and back              | `apps/sandbox-e2e/src/popover.spec.ts` (the panel takes focus, Tab reaches the content, Escape hands it back) + `libs/components/popover/src/popover.spec.ts` (the restore happens **only** when focus was inside, so Escape pressed from the live page behind moves nothing)                                                                                                                                                                                                                                                                                                                                           |
| The leave is waited out         | `apps/sandbox-e2e/src/popover.spec.ts` (the panel outlives the decision to close) + `libs/components/core/src/core.spec.ts` (`pctAfterTransition`: the event, the timeout floor and the cancel)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — the panel's text, its heading, and the edge measured against the **page** rather than against a veil, which is where the modal and the non-modal panel part company                                                                                                                                                                                                                                                                                                                                                                                                            |
| Strings through `PCT_TEXTS`     | none — deliberately: the component writes no string of its own                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Size budget                     | `libs/components/size.snapshot.md` — the `./popover` row, with `./core` beside it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Screen-reader log               | none — gap. The same one the dialog, the select and the tooltip have. What a reader really announces when a non-modal dialog takes focus is a question axe does not answer — axe examines structure, it does not listen                                                                                                                                                                                                                                                                                                                                                                                                 |
| docs page                       | `/components/popover` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Decisions

[0066](../decisions/0066-a-panel-is-a-layer-or-a-region-and-the-consumer-says-which.md) (why `inline` exists — the same panel as a region of the page, and what it gives up),
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
- **It is not a place to park — unless it is `inline`.** Over the page, Tab is a way out, so a
  panel the user is meant to leave and come back to is not this component
  ([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)). Drawn in the page it
  is exactly that shape, because the tab order it stands in is the page's own. What still sends a
  reader to the drawer is the other half of
  [0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md): a drawer is
  docked to an edge of the window and is **still text in the document when it is shut**
  (`hidden="until-found"`, so find-in-page reaches it), where an inline popover is in the flow
  where it was written and is gone entirely while `open` is false.
- **No arrow.** A pointer drawn from the panel to the trigger is one more thing to position and
  repaint on every flip; the 8 px gap and the placement say the same thing more cheaply. The
  same call as the tooltip's.
- **A popover inside a popover is not a pattern here.** Nothing forbids it and the closing stack
  orders the two correctly, but the focus return of the inner one lands on a trigger inside the
  outer one, and nothing measures that arrangement. A menu with submenus is the menu's problem, and
  it is a different component.
