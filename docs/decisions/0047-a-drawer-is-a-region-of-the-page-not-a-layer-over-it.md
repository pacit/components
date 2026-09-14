# 0047 — A drawer is a region of the page, not a layer over it

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** twelve cases over three engines, and every one of them a reading of what the
component does **not** do: zero `[inert]` in the document and the root's `overflow` untouched
with the panel open; Tab walking from the trigger into the panel and out the far side with no
handler run; `closest('[data-theme]')` resolving to the demo card's own stage and the panel
painting that stage's surface; a listbox opened from inside the drawer hit-testing on top of
it; and a `start`-docked panel flush with the left edge in LTR and with the right edge under
`dir="rtl"`, off one logical inset.

## The question

Every library calls two different things a drawer. One is a side sheet that takes the page: a
veil, a focus trap, `inert` behind it, Escape from the closing stack — a dialog stuck to an
edge. The other is a docked panel the user tabs into, changes something in, tabs out of and
comes back to — a filter panel, a navigation column, a details pane.

This repository had already decided which of the two lands here, and it did so before the
component existed. [0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md) drew the honest
boundary of a non-modal overlay panel and said, of the shape it could not serve: "a panel whose
content the user is expected to leave and come back to — a docked filter panel, a side sheet —
is not this component. The drawer is where the other shape belongs."

So the question is not "modal or not". It is: **what is left of a panel once it is not an
overlay at all?**

## The decision

A drawer is **markup the consumer wrote, where they wrote it** — a named `region` that is
`position: fixed` to an edge of the window, whose openness is a disclosure.

Three things follow, and each of them is a thing this library did not have to write:

**The tab order is the page's.** A popover has to splice its panel into the document's order by
hand: focus into the panel on open, `preventDefault` on the Tab at each end of its tabbable
list, focus back to the trigger on the way out — the whole of 0031, and the reason it exists is
that an overlay's DOM position is nowhere near its trigger's. A drawer's is exactly where its
trigger's is. A user tabs into it, parks, and tabs out, and the browser is doing nothing special
at all.

**Nothing was severed, so nothing is patched back.** [`lesson-35`](../lessons.md#lesson-35) is
the list of what a panel loses by being moved into an overlay container — the theme, the
typeface, the size, the writing direction — and `pctOverlay` / `PctOverlayPanel` exist to hand
those four back. A drawer needs neither: it never left the tree, so `closest('[data-theme]')`
resolves to whatever scope it stands in, measured in three engines. The top layer would have
been the same story from the other side, and it is refused for a reason of its own below.

**A shut drawer is still text in the document.**
[0045](0045-a-panel-nobody-chose-is-still-text-in-the-document.md)'s mechanism at its second
component: `hidden="until-found"`, so the browser's find-in-page searches a shut navigation
panel, and `beforematch` is answered by opening the model rather than by letting the reveal be
undone at the next render. That the rule transplanted unchanged to a component with a different
shape is the evidence it was a rule and not the tabs' own accident.

The one thing that **is** written here is the ARIA Disclosure pattern:
`button[pctDrawerTrigger]` carries `aria-expanded` and `aria-controls`, and the panel carries
the role and the name. That is not a preference either — it is the exact residue of
[0046](0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md). The platform's
own disclosure is `<details>`/`<summary>`, and it holds on one condition: the button has to be
the **first child of the thing it opens**. A drawer's button is in the header bar and its panel
is at the edge of the window. The elements are apart, so the pattern is ours — and this is the
first component in this library where that sentence is true.

## What is refused, and why

**The modal drawer.** There is no `modal` input and there will not be one until something asks
for it. The reasons are three and they compound:

1. It is already here. A panel that takes the page — veil, trap, `inert`, scroll lock, Escape
   from the closing stack — is `pct-dialog`, built at E1 and gated since
   ([0029](0029-a-modal-is-an-overlay-not-a-dialog-element.md)). What a modal drawer would add
   to it is a stylesheet.
2. The two differ in **promises**, not in looks. "The page behind goes on answering" is the
   drawer's whole design and is measured as such; a flag that switched it off would make every
   sentence in this file conditional on an input, and every gate below would have to be run
   twice to mean anything.
3. The machinery does not transplant. `PctModalBackground.hold()` walks `body.children` and
   exempts the one that contains the panel — which is right for an overlay, a child of `body`,
   and does **nothing** for a drawer standing inside an application's own tree. An in-place
   modal would need that service generalised to an ancestor walk, which changes a shipped,
   gated behaviour of the dialog for a component that has no consumer yet.

**`<dialog>` and the top layer.** Refused for the dialog's reason, and the reason is stronger
here. [`lesson-89`](../lessons.md#lesson-89) measured it: everything outside an open
`showModal()` dialog is inert in blink, gecko and webkit, the top layer included, so a
`pct-select` inside one has a panel nobody can click. A filter drawer is precisely where a
select goes. A `popover` would avoid the inertness and give the top layer, and is refused for a
different reason: a parked panel in the top layer stands above **every** overlay in the page,
including a modal's veil, and `popover="auto"`'s light dismiss shuts a panel on any press
outside it, which is the opposite of parking. What is gained is the stacking order, and that is
one token: `--pct-drawer-z-index` is **900**, under the 1000 the CDK stamps its overlay
container with — measured by a hit test on a listbox opened from inside the drawer.

**A transform for the slide.** The panel travels on its **inset** —
`inset-inline-start: calc(-1 * min(var(--pct-drawer-panel-width), 100%))` shut, `0` open. A
`translateX` names an axis the page's writing direction may have mirrored; the logical inset
already knows which edge `start` is, so the motion mirrors under `dir="rtl"` off one value and
with no rule of its own ([`req-token-logical`](../requirements/tokens.md#req-token-logical)).

## Consequences

**The leave has to be waited out, and the reason is 0045's mechanism.**
`hidden="until-found"` computes `content-visibility: hidden`, which empties the panel of its
contents at once — so applying it when `open` goes false would slide an empty slab off the
edge. The attribute lands **after** the motion, through `pctAfterTransition`, which reads the
duration the token build wrote and collapses with it when the user asked for less motion. That
helper was written for the tooltip and the popover; the drawer is its third consumer and the
first that is not an overlay.

**A close the drawer performs gives the keyboard back; a close the application performs does
not.** `escape`, `close` and `trigger` are the drawer's own paths and each restores focus — to
the control that **pressed it open**, which is why more than one trigger is fine here where 0031
had to report the ambiguity in dev mode. `api` is everything else, and it moves nothing: the
page behind is live, and a user who has clicked into it must not be pulled out.

**Escape is read from inside only.** The handler is on the host, so it never sees a key pressed
elsewhere in the document — and it checks `open()` before calling `preventDefault`, because a
shut drawer that swallowed Escape would be taking the key from whatever the page really wanted
it for, in the state a page spends most of its time in.

**It covers the page instead of pushing it.** A control under the panel is out of the pointer's
reach until the drawer shuts. That is a real cost and it is the honest half of "the page behind
is live": live to the keyboard everywhere, to the pointer only where nothing covers it. A push
layout is the application's own padding, which is one line of their CSS and would be a second
layout mode here.

**`position: fixed` means the window — unless an ancestor says otherwise.** A `transform`, a
`filter`, `contain: paint`, `content-visibility: auto` or a `will-change` naming one of them
anywhere above the drawer makes that element the containing block and the panel docks to it.
(`container-type` stood in this list when the decision was written and does not belong in it:
measured on 2026-09-05 in three engines, a `container-type: inline-size` ancestor leaves the
panel at the window — [`lesson-163`](../lessons.md#lesson-163).) This is the platform's rule,
and it is the price of being drawn where the consumer wrote it rather than in a container of
ours. An overlay would not have it; an overlay would have `lesson-35` instead. What the drawer
can do about it is say so: an open drawer whose `offsetParent` is not the window is
reported in dev mode, with the ancestor and the property named.

**What it costs in bytes.** `./drawer` is **14031 B** on `./core` and `./icon`, and the row to
read it against is the dependency column: it brings **no CDK at all**, which no other panel in
this library can say — the dialog, the popover, the tooltip, the menu, the date and the select
every one of them pull in `@angular/cdk/overlay` or `@angular/cdk/a11y`. That is not a saving
that was aimed at; it is what "the page already does this" weighs. The one thing it did cost
everybody else is a string: `drawerClose` in `PCT_TEXTS` is **+20 B on every entrypoint in the
package**, the toast's price at a fifth of the size.
