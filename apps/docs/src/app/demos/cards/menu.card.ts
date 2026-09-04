import { Component } from '@angular/core';
import { PctMenu, PctMenuItem } from '@pacit/components/menu';

/**
 * The panel, and not the button that opens it — a menu is the list of commands, and a card
 * showing the trigger alone shows the half of the pair that is not this component.
 *
 * It can stand here because of `inline`
 * ([0066](../../../../../../docs/decisions/0066-a-panel-is-a-layer-or-a-region-and-the-consumer-says-which.md)):
 * the same `<ng-template>` rendered in the host instead of on a layer, so the panel in this
 * card is the panel, with its own classes, parts and sheet. Over a layer it would not be in
 * the prerendered HTML at all — the attach waits for a browser render.
 *
 * The disabled row is the third state a list of commands has and the one a screenshot of an
 * open menu never happens to catch.
 */
@Component({
  selector: 'demo-menu-card',
  imports: [PctMenu, PctMenuItem],
  styles: ':host { display: block; inline-size: 11.5rem; }',
  template: `
    <pct-menu inline [open]="true" ariaLabel="Row actions">
      <button pctMenuItem>Rename</button>
      <button pctMenuItem>Duplicate</button>
      <button pctMenuItem disabled>Delete</button>
    </pct-menu>
  `,
})
export class MenuCardScene {}
