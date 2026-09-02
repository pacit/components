import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';

/** A side panel and the button that owns it — aria-expanded and aria-controls for free. */
@Component({
  selector: 'demo-drawer',
  imports: [PctButton, PctDrawer, PctDrawerTrigger],
  template: `
    <button pctButton [pctDrawerTrigger]="nav">Sections</button>

    <pct-drawer #nav heading="Sections">
      <nav style="display: grid; gap: 8px">
        <a href="#shipping">Shipping</a>
        <a href="#payment">Payment</a>
        <a href="#returns">Returns</a>
      </nav>
    </pct-drawer>
  `,
})
export class DrawerDemo {}
