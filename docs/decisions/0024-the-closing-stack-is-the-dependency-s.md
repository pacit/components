# 0024 — The overlay layer carries what an overlay severs, and borrows the closing stack

**Status:** accepted
**Implements:** [`req-api-overlay`](../requirements/api.md#req-api-overlay),
[`req-project-core`](../requirements/project.md#req-project-core)
**Evidence:** [`lesson-35`](../lessons.md#lesson-35) — three inherited properties, each found
by a measurement in the browser and none by a signal; the CDK dispatcher's ordering, measured
in `libs/components/core/src/core.spec.ts`

## Context

[0006](0006-overlay.md) settled what a panel outside the host tree needs: an anchor that is the
control's **visible** edge, and every inherited property carried over by hand. It was solved
once, in `PctSelect`, and its last consequence read "to be generalised into the `core`
behaviour layer at the first dialog".

The overlay layer is that generalisation, and it arrives before the dialog rather than after it —
the same order as the list walk and for the same reason: the second consumer is when copying starts,
not when it is noticed ([`lesson-21`](../lessons.md#lesson-21)).

The plan named six things at once: positioning, the closing stack, the outside click, `inert` on the
background, the scroll lock, and the carrying-over of theme and direction. They do not all have the
same standing. Three of them have one consumer and a measurement behind them; two have **no consumer
at all** until there is a modal; and one turned out to be already built, in the dependency the
library had already chosen.

## Decision

**The overlay layer owns what an overlay severs, and nothing else yet.**

`pctOverlay()` in `libs/components/core/src/overlay.ts` holds the panel's open state, the four
severed properties — theme, typeface, font size, writing direction — and the anchor's width as
measured at the opening. `PctOverlayPanel` is the other half: one binding that puts on the
panel **whatever the reading holds**, rather than the four a template happened to name.

The read is not a step of opening: `show()` **is** the read, so there is no path to an open
panel that carries nothing.

**The closing stack is the dependency's.** CDK's `OverlayKeyboardDispatcher` delivers a keydown
to the top-most attached overlay and to no other; that is the ordering the plan asked for,
already written and already relied on by everything here that opens a panel. What this
repository adds is the rule that follows from it, and a test that pins the ordering it rests
on: **an overlay closes from the stack, never from a listener above the control.** A control
may answer for its own key — the select eats Escape on its trigger, and its panel is the top of
the stack whenever it is open — but a component listening one floor up would answer for the
overlays above it as well.

**The modal half waits for the first modal.** `inert` on the background and the scroll lock are
written for a dialog and for nothing else here today; a listbox panel that locked the page's scroll
would be a defect. They bind at the dialog.

**Positioning stays with the role.** Which way a panel drops and which edge it abuts is a
property of a listbox under a combobox — a submenu opens to the side, a tooltip flips onto the
axis it has room on. What the layer does own is the anchor, which is what
[`req-api-overlay`](../requirements/api.md#req-api-overlay) is a promise about.

## Consequences

- A fifth severed property is one entry in `PctOverlayInherited` and one component to rebuild,
  not one more read in every control that opens a panel. The list is open by nature: absence of
  inheritance throws nothing, so the next entry will again arrive by measurement.
- The dialog inherits an ordering it does not have to write, and a rule that says where its
  Escape may not live.
- `./core` now exports a directive, which broke the tree-shaking gate's model of an entrypoint
  and got it sharpened ([`lesson-81`](../lessons.md#lesson-81)).

## What this costs us

- **A dependency on somebody else's behaviour.** The ordering is CDK's, not ours, and no
  release note of theirs is obliged to mention it. That is why it is measured here rather than
  assumed: the case in `core.spec.ts` opens two overlays and presses Escape twice.
- **11 B on every entrypoint, the primary included** — an unused `input` import that a
  directive in the shared kernel drags into a module every consumer of the plain half already
  has. Measured, and visible in `size.snapshot.md`.
- **Two of the six things named are not built**, so the dialog will still have to write them. What
  it will not have to do is guess which of them the panel already solved.

## Alternatives considered

| alternative                                         | why rejected                                                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A closing stack of our own, in `core`               | two stacks for one Escape: CDK's dispatcher already delivers to the top-most overlay, and a second register would answer the same key from a different order               |
| Leaving the four bindings in every panel's template | that is the shape `lesson-35` is about — the defect class is a property nobody knew was missing, and a template can only name the ones somebody already knows              |
| Building `inert` and the scroll lock now            | no consumer: a panel must not lock scroll, so the code would ship measured by nothing and shaped by a guess about the dialog                                               |
| Moving `panelWidth`/`panelAlign` into the layer too | the vocabulary is the field's (`'field'` is the chrome's border) and the position list is the combobox's; one consumer cannot tell a shared property from its own accident |
