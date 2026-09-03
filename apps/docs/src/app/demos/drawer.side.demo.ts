import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';

/**
 * From the other side
 *
 * `side="end"` slides the panel in from the inline end — the right edge in a left-to-right
 * page, the left edge under `dir="rtl"`, with nothing to rewrite.
 */
@Component({
  selector: 'demo-drawer-side',
  imports: [PctButton, PctDrawer, PctDrawerTrigger],
  styles: ':host { display: flex; gap: 8px; flex-wrap: wrap; }',
  template: `
    <button pctButton variant="outline" [pctDrawerTrigger]="cart">
      Cart (3)
    </button>
    <pct-drawer #cart side="end" heading="Your cart">
      <ul style="margin: 0; padding-inline-start: 1.2rem">
        <li>Design tokens, 1</li>
        <li>Components, 33</li>
        <li>Schematics, 2</li>
      </ul>
    </pct-drawer>
  `,
})
export class DrawerSideDemo {}
