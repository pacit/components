import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctPopover, PctPopoverTrigger } from '@pacit/components/popover';

/**
 * Placement
 *
 * Ask for a side with `placement`; the panel takes it when it fits and flips to the
 * opposite side when the viewport says no — a wish, not an order.
 */
@Component({
  selector: 'demo-popover-placement',
  imports: [PctButton, PctPopover, PctPopoverTrigger],
  styles: ':host { display: flex; gap: 8px; flex-wrap: wrap; }',
  template: `
    <button pctButton variant="outline" [pctPopoverTrigger]="above">
      Above
    </button>
    <pct-popover #above placement="top" heading="Above the trigger">
      <p>Unless there is no room up here.</p>
    </pct-popover>
    <button pctButton variant="outline" [pctPopoverTrigger]="beside">
      Beside
    </button>
    <pct-popover #beside placement="end" heading="Beside the trigger">
      <p>And on the other side under rtl.</p>
    </pct-popover>
  `,
})
export class PopoverPlacementDemo {}
