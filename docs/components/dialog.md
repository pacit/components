# `PctDialog` — a modal dialog

**Entrypoint:** `@pacit/components/dialog`
**Selector:** `pct-dialog` (plus `[pctAutofocus]`, the marker for what takes focus)
**Status:** released
**ARIA APG pattern:** [Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) —
`role="dialog"` with `aria-modal="true"`, focus trapped in the panel and given back to whatever
opened it, Escape from the closing stack

Not a native `<dialog showModal()>`, and that is a measurement rather than a preference: the
native element makes **every CDK overlay on the page inert while it is open**, the top layer
included, so a `pct-select` inside one would have a panel nobody could click, focus or reach by
Tab ([`lesson-89`](../lessons.md#lesson-89),
[0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)).

## Contract

|                 |                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a dialog holds no value. Its state is `open`, a `model<boolean>`                                                                                                                                                                                                                                                                                                                 |
| **Inputs**      | `open` (`model`), `heading`, `ariaLabel`, `ariaLabelledby`, `closeOnEscape`, `closeOnBackdrop`, `closeButton`                                                                                                                                                                                                                                                                           |
| **Outputs**     | `closed: PctDialogCloseReason` — `escape` \| `backdrop` \| `close` \| `api`. `open` says **that** it closed, this says **why**, and the two questions an application asks a modal ("did the user agree", "did the user get out of it") are answered by nothing else                                                                                                                     |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are **inputs and not attributes on the tag**: the role sits on the panel inside the overlay and the host carries none, so an ARIA name written on `<pct-dialog>` is read by nobody. ARIA's order decides between them and the heading, not ours. An open dialog with no name at all is reported in dev mode (`tools/check-aria.mjs`)                     |
| **Slots**       | the default content. `[pctAutofocus]` on a control inside it says what takes focus — the mechanism is the CDK's `cdkFocusInitial`, the name is ours ([0013](../decisions/0013-no-headless-split.md))                                                                                                                                                                                    |
| **Parts**       | `backdrop`, `panel`, `header`, `heading`, `close`, `content`                                                                                                                                                                                                                                                                                                                            |
| **Tokens**      | the `--pct-dialog-*` prefix plus five entries in `contrast.policy.json`. The veil is **three** tokens and not one number in a stylesheet — the colour (through `pct.scrim`, which the two themes answer differently), how much of it there is (`backdrop-alpha`) and how far the page behind it is blurred (`backdrop-blur`), so a skin can make a modal dim the page or barely tint it |
| **DI contract** | `PctModalBackground` from `core` — reference-counted, so a dialog opened from a dialog hands the page back only once the last one closes                                                                                                                                                                                                                                                |
| **Strings**     | the close button's accessible name through `PCT_TEXTS` (`dialogClose`), read at render time ([0014](../decisions/0014-texts-as-signal.md))                                                                                                                                                                                                                                              |
| **SSR**         | nothing renders on the server. The panel is a template attached to an overlay by a **browser** render, so a dialog left `open` at bootstrap sends no markup and hydrates no mismatch                                                                                                                                                                                                    |

**What arrives from somewhere else, and what is written here.** Of the six things the dialog was to
force: the trap, the initial focus and the focus restore are the CDK's `FocusTrap`
([0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md)); the Escape ordering is the CDK
dispatcher's ([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md)); `inert` on the
background is the platform's. Written here: the scroll lock, the panel, and **the order the three
run in on the way out** — the page is given back _before_ the panel goes, because focus is restored
to an element that sits in the background and an inert subtree refuses `focus()`.

## Keyboard map

| key         | effect                                                   | test                                  |
| ----------- | -------------------------------------------------------- | ------------------------------------- |
| `Escape`    | close, with the reason `escape`; off via `closeOnEscape` | `apps/sandbox-e2e/src/dialog.spec.ts` |
| `Tab`       | walks the panel and never leaves it                      | `apps/sandbox-e2e/src/dialog.spec.ts` |
| `Shift+Tab` | the same walk backwards                                  | `apps/sandbox-e2e/src/dialog.spec.ts` |

Everything else belongs to the controls inside the content. **Escape is not the dialog's alone:
a panel opened within it is a later overlay in the stack and answers the key first** — the
select's list closes, the dialog stays (`apps/sandbox-e2e/src/dialog.spec.ts`, "Escape closes
the list first and the dialog second").

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/dialog/src/dialog.ts` — the pattern named in the class comment                                                                                                                                                                                                                                                                                                                                                             |
| Keyboard map tested             | `apps/sandbox-e2e/src/dialog.spec.ts`, `libs/components/dialog/src/dialog.spec.ts`                                                                                                                                                                                                                                                                                                                                                          |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/dialog` view, and separately **an open panel**, which the walk over the routes cannot reach                                                                                                                                                                                                                                                                                                     |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `dialog-open` and `dialog-open-rtl`, the whole viewport rather than the panel: the veil over the page is part of what this component draws                                                                                                                                                                                                                                                          |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the mode has no translucent system colour, so the veil says `Canvas` outright and the panel keeps a `CanvasText` edge; without it a dialog there is a rectangle of page on a rectangle of page                                                                                                                                                                                               |
| `prefers-reduced-motion`        | none — deliberately: the dialog animates nothing. There is no duration to reduce, and an enter transition arrives with the tooltip, where hover/focus parity forces one anyway                                                                                                                                                                                                                                                              |
| Touch target ≥ 24×24 px         | `libs/tokens/src/component.dialog.json` — the close button's box is `{pct.target.min}`, not the 16 px cross it draws                                                                                                                                                                                                                                                                                                                        |
| Size axis                       | none — deliberately: a dialog has no control height. `req-api-size` is about `--pct-control-height-*`, and the only width a modal has is `--pct-dialog-panel-max-width`, which a consumer overrides                                                                                                                                                                                                                                         |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                      |
| RTL                             | `apps/sandbox-e2e/src/dialog.spec.ts` — the direction carried onto the panel, which an overlay severs (`lesson-35`); plus the `dialog-open-rtl` screenshot. The scroll lock's scrollbar compensation is `padding-inline-end`, so it gives back the edge that moved                                                                                                                                                                          |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/dialog` view renders and hydrates with no `NG05xx`; a closed dialog contributes no markup at all                                                                                                                                                                                                                                                                                           |
| Forms                           | none — deliberately: a dialog is not a form control. It holds no value, implements no `FormValueControl`, and the controls inside its content are the ones bound to a form                                                                                                                                                                                                                                                                  |
| Focus: trap, capture, restore   | `apps/sandbox-e2e/src/dialog.spec.ts` — Tab never leaves the panel, focus goes back to the opener, and `pctAutofocus` decides what takes it. Measured in a browser and nowhere else: jsdom has no layout for the interactivity checker to read                                                                                                                                                                                              |
| The background goes `inert`     | `apps/sandbox-e2e/src/dialog.spec.ts` (the pointer, the keyboard and a script all refused) + `libs/components/core/src/core.spec.ts` (**which** elements are marked). Two places for one behaviour, the same split `PctFocusStays` lives with                                                                                                                                                                                               |
| The scroll lock                 | `apps/sandbox-e2e/src/dialog.spec.ts` — the wheel moves nothing while it is up and moves again after, plus the scrollbar's width handed back to the layout (visible in webkit alone; blink and gecko run here with overlay scrollbars and a gutter of 0)                                                                                                                                                                                    |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                                                                         |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — five pairs, of which the one worth having is "the panel's edge against the dimmed page": not "is the veil readable" (it carries no text) but "can you see where the dialog ends"                                                                                                                                                                                                                   |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` + `libs/components/dialog/src/dialog.spec.ts` — an application's own close label replaces the default and leaves the rest of the texts alone                                                                                                                                                                                                                                                                        |
| Size budget                     | `libs/components/size.snapshot.md` — `./dialog` at 14798 B, and the `./core` row beside it: the modal half is a service every entrypoint now carries, 1041 B of it, whether or not it ever injects one                                                                                                                                                                                                                                      |
| Screen-reader log               | none — gap. The same one the select has, and here it is the more wanted of the two: "what a reader announces when a modal opens" and "does a live region behind it still reach the user" are questions axe does not answer — axe examines structure, it does not listen. The second half at least has a machine-readable proxy: `apps/sandbox-e2e/src/dialog.spec.ts` asserts that no `[aria-live]` element ends up inside an inert subtree |
| docs page                       | none — gap. The documentation site                                                                                                                                                                                                                                                                                                                                                                                                          |

## Decisions

[0029](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md) (the main one — why the
native element was measured and refused),
[0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md) (the closing stack is the
dependency's; the modal half lands here),
[0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md) (this is the panel of the other
kind — one that DOES take focus),
[0013](../decisions/0013-no-headless-split.md) (`pctAutofocus` is our name for the CDK's
mechanism), [0007](../decisions/0007-config-and-texts.md),
[0028](../decisions/0028-an-icon-set-is-a-component.md) (the cross is `close` inside a
`pct-icon`)

## Known limitations

- **No animation.** A modal that appears instantly is honest and cheap; the alternative is an
  enter/leave pair, and a leave transition means the panel outlives its own `open === false`, which
  is a second state to get wrong. It arrives with the tooltip, where hover/focus parity forces a
  real enter/leave anyway. - **One size.** `--pct-dialog-panel-max-width` is a token a consumer
  overrides; there is no `size` input, because a dialog's width has nothing to do with the
  `sm/md/lg` control-height axis the rest of the library shares.
- **No `alertdialog`.** The role for an interruption that has to be read at once is a separate
  one, and pretending a boolean input covers it would be worse than not offering it.
- **No stacking policy.** Two dialogs open at once work — the top layer orders them and the
  background counter holds — but nothing says they _should_. A wizard that opens a confirm over
  a form is legitimate; four deep is a design somebody should be arguing with, and this
  component does not.
- **The `api` reason cannot tell one button from another.** Every close that does not come from
  Escape, the veil or the built-in button reports `api`, including the consumer's own "Save" and
  "Cancel". Those two are the content's, and the content already knows which one was pressed.
