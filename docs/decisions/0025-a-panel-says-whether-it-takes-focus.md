# 0025 — A panel says whether it takes focus, and the rest of the focus layer waits for a consumer

**Status:** accepted
**Implements:** [`req-api-overlay`](../requirements/api.md#req-api-overlay),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-project-core`](../requirements/project.md#req-project-core)
**Evidence:** [`lesson-82`](../lessons.md#lesson-82) — the guard measured in three engines, on
the mouse and on a tap; the defect it repairs measured before it, in the same three

## Context

The plan's D3 named four things at once: a focus trap, focus restore, initial focus, and a
roving tabindex as an alternative to `aria-activedescendant`. D2 had just come out of the same
shape — six things under one heading that turned out to be three kinds of thing
([0024](0024-the-closing-stack-is-the-dependency-s.md)) — so the first question was the same
one: which of the four has a consumer here today?

The answer, measured against the components that exist rather than against the ones the list
foresees:

- **the trap, the restore and the initial focus have none.** All three are the modal half, and
  the modal half is what `inert` and the scroll lock were deferred for at D2. The library has
  no component that takes focus away from where the user left it;
- **the roving tabindex has none either.** `pct-radio-group` stands on native radio inputs
  with a shared `name`, so the browser walks the group and decides which option is tabbable;
  `pct-select` keeps focus on the trigger and points with `aria-activedescendant`. The first
  consumer is the menu at E3;
- **a fourth thing, which the plan's line does not name, has one consumer and a defect.** The
  listbox pattern promises that focus stays on the trigger while the panel is open, and the
  browser breaks that promise for free: a press on the panel's own background — its padding,
  the gap between options, the empty-list text, its scrollbar — moves focus to `body`.

That last one was measured before it was repaired, in blink, gecko and webkit alike: after the
press `document.activeElement` is `body`, the panel stays open (a press inside it is no press
outside it), `ArrowDown` moves nothing because the key map sits on the trigger, and
`aria-activedescendant` goes on naming the active option from an element that no longer has
focus. Only Escape still works, and only because the CDK listens for it on the document — the
second owner [C19](../plan.md) is about.

## Decision

**A panel declares which of the two kinds it is, and the layer owns the kind that has a
consumer.**

`PctFocusStays` in `libs/components/core/src/focus.ts` is that declaration for a panel focus
never enters: one host listener that refuses the press which would move focus, so the control
keeps it and every key keeps its handler. `pct-select`'s panel carries it beside
`pctOverlayPanel` — the two halves of what a panel outside the host tree needs: what it stops
inheriting, and what it must not take.

**The guard reads `mousedown`, not `pointerdown`**, and that is a measurement rather than a
taste. The wider event looks like the safer one and is not: a tap moves focus nowhere to begin
with, while preventing the default of `pointerdown` cancels the compatibility events after it —
in webkit that includes the `click` a tap on an option needs to be picked at all
([`lesson-82`](../lessons.md#lesson-82)).

**The other three wait, and they are not ours to write.** CDK's `cdkTrapFocus` with
`cdkTrapFocusAutoCapture` already holds the trap, the initial focus and the restore, exactly as
its `OverlayKeyboardDispatcher` already held the closing stack. When E1 brings the first modal,
the work here is to pin that behaviour and wrap the API — not to write a second one.

## Consequences

- a panel of the other kind — a dialog, a menu, a combobox with a search field inside it — is
  not an exception to this guard but the other declaration, and it arrives with its first
  consumer;
- the guard is deliberately blanket. It does not ask whether the pressed element was focusable,
  because a panel with something focusable in it is that other kind;
- `pct-select` no longer gives focus back after a pick: `selectAt` used to call
  `trigger.focus()` for the mouse path, and with the press refused the control never lost it.
  One owner for one promise, which is [0024](0024-the-closing-stack-is-the-dependency-s.md)'s
  rule about keys applied to focus;
- the field chrome had found the same mechanic once, alone, for its own dead zone
  (`PctField.onRowPointerDown` prevents the default of a press on the row's background). It
  stays where it is — it prevents a focus loss in order to move focus itself, which is the
  opposite half — but it is why the layer's version is a named declaration rather than one more
  line in a template.

## What this costs us

- **a directive in the shared kernel, and every entrypoint pays for it in bytes.** `./core`
  grows, and D2's measurement ([`lesson-81`](../lessons.md#lesson-81)) says a directive there is
  not free for consumers that never instantiate it. The size snapshot carries the number;
- **the unit suite cannot see what the guard is for.** jsdom implements no focus move on
  `mousedown`, so a test there can assert the cancellation and nothing beyond it; the promise
  itself is measured in the browser, in `apps/sandbox-e2e/src/select.spec.ts`. Two places for
  one behaviour, and the reason is written above both;
- **selection by dragging inside the panel goes.** Preventing the default of a press also
  prevents the text selection it would start. For a listbox whose options are already
  `user-select: none` that is no loss, but it is a promise made for every future panel of this
  kind;
- **D3 closes with three of its four lines undone**, and the plan says so rather than ticking
  them. A task list that marks work done because the heading was reached measures headings.

## Alternatives considered

- **Folding the guard into `PctOverlayPanel`.** One directive on the panel instead of two, and
  no import for a consumer to forget. Rejected: a dialog panel needs the same inheritance
  carrying and the opposite focus behaviour — a press into a text field inside it has to focus
  that field. Focus ownership is a property of the role, not of overlays, and D1's rule sends
  what the roles do not share back to the control.
- **Restoring focus after the fact** — a `focusout` listener that puts focus back on the
  trigger. Rejected on two counts: the trigger's `blur` still fires, so the control reports
  itself touched in the middle of an interaction it never left, and the repair is visible as a
  flicker where the guard is invisible.
- **Guarding `pointerdown` instead.** Rejected on the measurement above.
- **Writing our own trap now, ahead of E1.** Rejected for D2's reason, one floor down: a trap
  with no modal has no way of being wrong yet, and CDK's is already there when it does.
