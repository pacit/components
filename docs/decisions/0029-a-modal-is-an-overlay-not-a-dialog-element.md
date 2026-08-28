# 0029 — A modal is an overlay, not a `<dialog>` — the platform's modal is not composable with ours

**Status:** accepted
**Implements:** [`req-api-overlay`](../requirements/api.md#req-api-overlay),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-project-core`](../requirements/project.md#req-project-core)
**Evidence:** [`lesson-89`](../lessons.md#lesson-89) — the native element measured in blink,
gecko and webkit before it was refused, and refused on one finding rather than on a taste;
[`lesson-90`](../lessons.md#lesson-90) — the live regions the first `inert` walk silenced

## Context

[`req-api-platform`](../requirements/api.md#req-api-platform) says we do not write what the browser
provides. `<dialog>` with `showModal()` provides a great deal of the dialog's list, so the first
question was not "how do we build a modal" but "why would we build one at all". The answer had to be
measured, because every part of it is behaviour no signal reports.

Measured in blink, gecko and webkit, on a native modal dialog:

- **the focus trap works.** Tab never reaches the background, in all three;
- **the initial focus works.** The first focusable descendant takes it, `autofocus` is honoured,
  and a dialog with nothing focusable in it focuses itself;
- **the focus restore works**, on Escape and on a programmatic `close()` alike;
- **the background is inert.** `elementFromPoint` over it returns the dialog, `element.focus()`
  is refused, a click never lands;
- **the top layer severs nothing.** Custom properties, the typeface, the writing direction and
  `closest('[data-theme]')` all resolve through it, and `::backdrop` inherits from the
  originating element — so the whole of `lesson-35` would simply not apply;
- **Escape is `keydown` → `cancel` → `close`**, and `preventDefault()` on the **keydown** keeps
  the dialog open in all three. `stopPropagation()` does not: the close watcher is not
  propagation-based. That is worth writing down on its own, because it is the mechanism by
  which a control inside a dialog keeps a key to itself;
- **the scroll is not locked.** The wheel and PageDown move the page behind the modal in all
  three, so that half was going to be ours whatever was decided here.

Two things did not work, and one of them is fatal.

`preventDefault()` on `cancel` holds for a few presses and then stops: blink and gecko
force-close the dialog on the fourth Escape, webkit never does. So "Escape does not close this
dialog" is not a promise the platform lets a library keep.

And the fatal one: **an element outside the topmost modal dialog is inert, including one in the
top layer.** Measured twice — for a plain child of `body`, which is where the CDK overlay
container lives, and for an element with `popover="manual"` shown _after_ the dialog, which is
what CDK v22 does by default (`usePopover` defaults to `true`). In both cases, in all three
engines: the hit test returns the dialog, `focus()` is refused, `click` never lands, Tab never
arrives. A `pct-select` inside a native `<dialog>` has a panel nobody can use.

That is not a corner case. The select ships today, and the tooltip, the popover and the menu are all
overlays. A modal that makes the rest of the library inert is a modal nothing in the library can be
put inside.

## Decision

**`PctDialog` is a CDK overlay like every other panel here, and the modal half is written in
`core`.**

The panel is a template attached to an overlay in the same container as the select's, so the
two compose: pointer events reach both, and the CDK dispatcher orders their Escape — the list
closes first, the dialog second. That ordering is the closing stack
[0024](0024-the-closing-stack-is-the-dependency-s.md) borrowed rather than wrote, now with the
consumer it was borrowed for.

`PctModalBackground` in `libs/components/core/src/modal.ts` is the modal half 0024 deferred:
`inert` on every child of `body` that does not hold the panel, and `overflow: hidden` on the
root with the scrollbar's width handed back as `padding-inline-end`. It is reference-counted,
because a dialog opened from a dialog holds the same page twice.

**`inert` and not `aria-hidden`**, because `aria-hidden` covers the screen reader and leaves the
Tab key and the mouse, a focus trap covers the Tab key and leaves the mouse, and `inert` is the
one property that says all three at once. It is the platform's, which is `req-api-platform`
honoured in the one place the platform's answer composes.

**The order on the way out is part of the component, not an implementation detail.** The page is
given back _before_ the panel is detached, because focus is restored to the element that opened
the dialog and that element sits in the background — an inert subtree refuses `focus()`. Written
as three consecutive lines in `detach()` so that it can be read rather than inferred.

**The focus trap is the dependency's `FocusTrap`, driven by this component rather than by
`cdkTrapFocus`.** 0025 said "pin that behaviour and wrap the API", and the wrapping is where the
value is: the directive would hide both the restore order above and the fallback below inside
somebody else's `ngOnDestroy`. The fallback is real — the trap's capture reports whether it found
anything tabbable, and a dialog whose content has no control has nothing for it to find; the
panel's own `tabindex="-1"` is the last answer, which is what the native element does too.

## Consequences

- **The overlay layer gets its second consumer**, and the first that is not a dropdown. What
  `pctOverlay()` reads is now shared rather than the select's own accident.
- **A modal composes with everything else here**, which is the property the native element was
  refused for. The e2e that proves it opens a select inside a dialog and presses Escape twice.
- **`closeOnEscape=false` is a promise this library can actually keep**, where the platform's
  version quietly stops keeping it after a few presses. That is the one place the decision buys
  behaviour rather than only preserving it.
- **The first `inert` walk silenced the library's own live regions** — they are children of
  `body`, and inert content is hidden from assistive technology, so a select opened _inside_ a
  dialog lost the one sentence it has to say ([`lesson-90`](../lessons.md#lesson-90)). The rule
  is now written into the walk: a child that is itself `[aria-live]` goes on speaking.
- **The select's second Escape owner closes with it.** Its panel had two owners for the key and the
  second was named nowhere; a dialog underneath is what made the question stop being cosmetic. The
  owner that stays is the one that can `preventDefault()` — measured above as the mechanism that
  keeps a key from travelling on.

## What this costs us

- **Everything the platform gives for free, we now own.** Four behaviours that a native element
  would have kept correct across browser releases are ours to keep correct, and the only thing
  standing between them and a silent regression is `apps/sandbox-e2e/src/dialog.spec.ts` running
  in three engines.
- **`@angular/cdk/a11y` joins `@angular/cdk/overlay`** in the dependency policy's reason for that
  package. "Overlay mechanics, and nothing else" is no longer true, and the entry says so.
- **`./core` grows by a service every entrypoint carries, and the number is 1041 B** — `./core`
  goes 5024 → 6065, and every entrypoint standing on it moves by 1016. That is `lesson-81`'s
  shape an order of magnitude larger: there it was 11 B for an unused `input` import that a
  directive dragged along, here it is a whole `providedIn: 'root'` class that a button never
  injects and carries anyway. The differential control is worth recording as well, because the
  first attempt at it lied: deleting the export and re-measuring gave IDENTICAL numbers, and the
  reason was that the build had failed — `./dialog` does not compile without it — so the gate
  read the artefact from before the experiment. A measurement whose subject failed to build is
  a measurement of the previous run.
- **The veil cost the skin a ramp step, a semantic role and a rule in a gate.** `pct.scrim` is a
  role of its own because the two themes have to answer it differently — `slate.900` over a light
  page, and the ramp's new endpoint `slate.1000` over a dark one, which is already `slate.900`.
  How translucent it is could not join the colour, since a colour literal above the primitive
  tier is refused and an alpha has no tier at all, so it is a second component token and the veil
  is a `color-mix()`. That in turn broke point 7 of `check-tokens`, whose model was "every
  `var()` in a paint declaration names a colour" — the amount slot of a `color-mix()` is now
  exempt, with a fixture pinning the boundary.
- **A screen reader is still not in the loop.** Everything above is measured by a machine that
  reads the DOM; what a reader announces when a modal opens is the gap this card and the
  select's card share.

## Alternatives considered

| alternative                                                        | why rejected                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native `<dialog showModal()>`                                      | it makes every overlay in the library inert, the top layer included — measured in three engines, twice. The select inside it is unusable, and the tooltip, the popover and the menu are overlays too                                                  |
| Native `<dialog>` plus moving every panel inside it                | the CDK can insert an overlay next to its origin rather than in the container, but then every control would have to know whether it stands in a modal — a property of the ancestor leaking into every component's positioning                         |
| A panel rendered inline, with `inert` applied along the path to it | precise, and it is what the `blocking-elements` proposal does. Rejected: the dialog would not be a CDK overlay, so it would not be in the closing stack, and its Escape would have to come from a listener above the control — which 0024 forbids     |
| `cdkTrapFocus` with `cdkTrapFocusAutoCapture`, as 0025 sketched    | it hides the release-then-restore order inside a directive's destroy hook, and it has no answer for a panel with nothing focusable in it. The trap itself is still the dependency's — only the choreography moved                                     |
| The CDK's own backdrop (`hasBackdrop: true`)                       | its element is created outside any component's view, so it carries no encapsulation attribute and no stylesheet of this library can reach it. Its colour would be the CDK's hard-coded `rgba(0,0,0,.32)` — a surface of ours painted by somebody else |
