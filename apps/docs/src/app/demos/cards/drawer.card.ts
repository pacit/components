import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';

/**
 * The panel itself, open and docked, with the page still working beside it — a drawer is the
 * panel and not the control that opens it, and a card showing the button alone shows the one
 * half of the pair that is not this component.
 *
 * It can stand in a card at all because a drawer is **not an overlay**
 * ([0047](../../../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)):
 * the host IS the panel, drawn where the consumer wrote it, so `[open]="true"` puts the whole
 * of it — the heading, the cross, the content — in the prerendered HTML. Measured on the
 * server: the tag comes out with `data-pct-open` and with no `hidden`, because the effect that
 * lifts `present` runs during the render rather than after hydration. A reader with no
 * JavaScript sees the panel and not the trigger alone.
 *
 * The one thing the scene lends it is a **window**. `:host` is `position: fixed`, which against
 * the real viewport would dock the panel to the edge of the gallery page; `contain: layout
 * paint` makes this box the containing block for it, and a stacking context besides, so the
 * panel's z-index of 900 cannot climb out of the card. Nothing about the panel is redrawn — it
 * is the library's element at its own scale, under its own tokens, and only the edge it docks
 * to is the card's rather than the browser's.
 *
 * `--pct-drawer-panel-width` is turned down the way a skin turns it down, and the closed
 * position follows it by the component's own arithmetic. At the shipped 320px the panel would
 * BE the window, and what the card would lose is the page beside it — the other half of 0047,
 * that a drawer is a region of the page rather than a layer over it: no veil, and the page it
 * leaves alone. The trigger is the real directive, and it reads `aria-expanded="true"` here
 * because the panel really is open.
 *
 * What the card cannot show is the shut state, which is 0045's whole point — a closed drawer
 * is still text in the document, `hidden="until-found"` and findable by find-in-page. It
 * stands off the edge of its window and paints nothing, so a second frame would be an empty
 * one.
 */
@Component({
  selector: 'demo-drawer-card',
  imports: [PctButton, PctDrawer, PctDrawerTrigger],
  // The window is the whole trick and it is three declarations: `contain` (the panel's
  // containing block), a definite size (a fixed panel is out of flow and contributes no
  // measure, so a box left to its content would collapse to the page strip) and a border to
  // say where the window stops. 16.5rem is the stage at its narrowest three-column width less
  // a hair, so nothing crops on the smallest card the gallery lays out; 8.5rem is under the
  // 144px the stage leaves between its paddings.
  styles: `
    :host {
      box-sizing: border-box;
      contain: layout paint;
      display: flex;
      justify-content: flex-end;
      inline-size: 16.5rem;
      block-size: 8.5rem;
      border: 1px solid var(--pct-border);
      border-radius: var(--pct-radius-md);
      background: var(--pct-surface-100);
    }
    pct-drawer {
      --pct-drawer-panel-width: 10.5rem;
    }
    .page {
      display: grid;
      align-content: start;
      justify-items: end;
      gap: var(--pct-space-2);
      padding: var(--pct-space-4);
    }
    .page p {
      margin: 0;
      color: var(--pct-text-muted);
      font-size: var(--pct-font-size-sm);
    }
    .links {
      display: grid;
      gap: var(--pct-space-2);
      font-size: var(--pct-font-size-sm);
    }
  `,
  // The content is spans and not the demo's anchors: a drawer holds whatever the consumer
  // puts in it, and links in a scene nobody can click would be three dead fragments in the
  // gallery's markup.
  template: `
    <div class="page">
      <button pctButton variant="soft" size="sm" [pctDrawerTrigger]="nav">
        Menu
      </button>
      <p>Checkout</p>
    </div>

    <pct-drawer #nav [open]="true" heading="Sections">
      <div class="links">
        <span>Shipping</span>
        <span>Payment</span>
        <span>Returns</span>
      </div>
    </pct-drawer>
  `,
})
export class DrawerCardScene {}
