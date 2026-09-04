# 0066 — A panel is a layer or a region, and the consumer says which

**Status:** accepted
**Implements:** [`req-api-overlay`](../requirements/api.md#req-api-overlay),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-project-ssr`](../requirements/project.md#req-project-ssr)
**Evidence:** 49 new cases across the three components (menu 22, popover 15, dialog 12) in a
library run of 1135; each written against a deliberate regression and reported with the
mutation that kills it. The property the mode exists for is measured directly rather than
inferred — a case per component renders under `globalThis.ngServerMode` and reads the panel
out of the server's markup, where the layer sends nothing. `parts.snapshot.md` does not move:
133 parts in 34 classes, before and after, because the inline panel **is** the same panel.
The cost is measured too: `./dialog` 15421 → 16310 B, `./popover` 13707 → 14500 B, `./menu`
18436 → 20193 B, all three gaining `@angular/common` for one `NgTemplateOutlet`.

## The question

A gallery card asked for something the library could not do: show a menu, a popover or a
dialog. Every card in `/components` carries a live instance of its component, and for these
three the instance is a button — the trigger — because the panel does not exist until a
browser opens it. Measured in the prerendered page before this change: `role="menu"` appears
zero times on a page that lists a menu.

The obvious reading is that this is a documentation problem, and the obvious fix is a
drawing of a panel. Both are wrong. A hand-drawn panel goes stale in silence the first time
`menu.scss` changes, and a page whose whole claim is "this is the component" would be the one
page in the product lying about it.

The real question is older than the card, and this repository has already answered it once
for one component. [0047](0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) says
a drawer is a region of the page and not a layer over it — the host **is** the panel, drawn
where the consumer wrote it. That is exactly why the drawer, alone of the overlay family,
needed no change to stand in a card. The other four panels made the opposite choice, and made
it permanently: a menu is a layer, always, whatever the page wanted.

But "layer or region" is not a property of the COMPONENT. It is a property of the place the
consumer puts it:

- a filter panel that stands permanently on a wide screen and is a popover on a narrow one;
- a column of commands docked into a page, rather than hanging off a button;
- a form that is a modal on one route and a section of the page on another.

Each of those is one component in two arrangements, and the library was forcing a copy.

## Decision

`pct-menu`, `pct-popover` and `pct-dialog` take `inline` — `input(false, { transform:
booleanAttribute })`. When it is set the panel renders in the host, where the component was
written, instead of being attached to a CDK overlay.

**It is the same template, never a copy.** All three already held their panel in an
`<ng-template #panel>`; inline renders that template through `NgTemplateOutlet` into the
host. One set of classes, one set of `data-pct-part` names, one stylesheet, one
`<ng-content>` — and therefore one place for any of them to be changed. The parts inventory
is unchanged by this whole decision, which is the strongest single statement that the inline
panel is not a second panel.

**`open` still governs.** A closed inline panel is markup nobody sends; an open one is markup
the SERVER sends. That second half is the property the mode exists for and is what the card
needed: no `afterNextRender` gate stands in front of a template branch.

**What inline gives up, per component.** These change meaning, not appearance, and each is
pinned by a test that fails without it:

| | drops | keeps |
| --- | --- | --- |
| `dialog` | `aria-modal`, the backdrop, the focus trap, the scroll lock, the closing stack | `role="dialog"`, the heading and label wiring, `tabindex="-1"` for programmatic focus |
| `menu` | the trigger's `aria-expanded`, the missing-trigger warning, close-on-choice | `role="menu"`, the arrow walk, `Home`/`End`, typeahead, roving focus |
| `popover` | the anchor positioning, `aria-haspopup` on a control that reveals in-page content | `role="dialog"`, `tabindex="-1"` |

All three drop `createOverlayRef`, the position and scroll strategies, and the four properties
`pctOverlayPanel` hands a panel that has left the tree ([`lesson-35`](../lessons.md#lesson-35))
— `inherited()` is `null` inline, or a menu switched from layer to region would keep the theme
of wherever it last popped up.

**A menu inline had to GAIN a tab stop, and this is the finding worth recording.** Over a
layer no item is ever a tab stop ([0031](0031-a-panel-s-tab-order-belongs-to-its-trigger.md))
because the trigger owns the panel's place in the tab order. Drop the trigger and an inline
menu is a region no keyboard can reach — a plain WCAG 2.1.1 failure that the brief for this
work did not foresee. So exactly one command carries `tabindex="0"`: the one the walk stands
on, or the first reachable one, handed on when the walk stands on a row the platform will not
focus. `PctMenuItem`'s own JSDoc had predicted the case; inline is where it arrived.

**Nothing pulls focus into an inline panel.** A region arriving is not a user asking to be
moved, and an inline panel left `open` at bootstrap would otherwise move focus at hydration
with no gesture behind it. This follows the drawer, which never enters its own panel either.

**Inline answers no Escape, and that is deliberate rather than overlooked.** All three
implementations arrived at it independently and all three asked for it to be confirmed here.
[0024](0024-the-closing-stack-is-the-dependency-s.md) puts closing in the stack and forbids a
component listening for the key above its own control; an inline panel is in no stack. The
drawer does carry a host `(keydown.escape)`, and the difference is real: a drawer is a
toggled panel with a trigger, while an inline panel is commonly permanent — a `[open]="true"`
column that Escape could destroy would be a defect, not a courtesy. A consumer who wants a
closable region has `open` as a model and its own gesture. Adding a second closing mechanism
for one key is its own decision, and it is not taken here.

## Consequences

**The three entry points grow**, and by more than the outlet: `./menu` by 1757 B, because the
tab stop, the `focusin` cursor and a writing-direction read that the layer used to take once
at `attach()` all arrived with it. `./dialog` and `./popover` grow by 889 B and 793 B. That is
the price of the second arrangement and it is paid by every consumer, including the ones who
only ever use the layer — the honest reading of a boolean input that switches a structure.

**The stylesheet is untouched, so an inline panel keeps the layer's box** — its
`max-inline-size`, its border, its shadow. That is defensible, because it is the same panel;
it also means a docked column that should fill its container reaches for the component's own
tokens to say so. Nothing new is needed to do that.

**The mode has no browser battery.** The unit cases cover it in three engines' worth of
jsdom, but there is no sandbox view, so no axe run, no screenshot and no real hydration
reading of the roving `tabindex`. Each of the three cards names that gap in its Checks table
rather than implying coverage it does not have. It is the first thing to close, and the
gallery's own cards are the natural place: they are the first consumer of this mode.

## What was rejected

**Drawing the panels by hand in the documentation.** It is cheaper by a day and it is the
defect this library exists not to have: a picture of a component, authored by the same hand,
wearing its part names, going stale in silence. The gallery would have been the one page in
the product that lies about what it documents.

**A per-scene CDK `OverlayContainer` pointing at the card.** Mechanically reachable — the
components pass their node injector, so a provider would win — and dead on two counts: the
panel's existence is behind `afterNextRender`, so the server still renders nothing, and CDK
22 shows a connected overlay through the top layer, which escapes the card's own clipping.
It would also have been a trick that helped the documentation and no consumer.

**Reaching into the private panel template from the docs app.** It would have put the real
panel in the prerendered HTML, and it would have made the documentation depend on a private
field of the library — a coupling with no promise behind it, breaking on any refactor with no
gate to catch it.
