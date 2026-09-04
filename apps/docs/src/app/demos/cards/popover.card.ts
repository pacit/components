import { Component } from '@angular/core';
import { PctPopover } from '@pacit/components/popover';

/**
 * The panel a control reveals, standing in the page instead of over it — `inline`
 * ([0066](../../../../../../docs/decisions/0066-a-panel-is-a-layer-or-a-region-and-the-consumer-says-which.md)),
 * which is the arrangement the component's own card leads with: a filter panel that stands
 * permanently on a wide screen and is a popover on a narrow one.
 *
 * The heading is the panel's own, so what the card shows is the component naming itself
 * rather than a caption written beside it.
 */
@Component({
  selector: 'demo-popover-card',
  imports: [PctPopover],
  styles: `
    :host {
      display: block;
      inline-size: 13rem;
    }
    p {
      margin: 0;
      color: var(--pct-text-muted);
      font-size: var(--pct-font-size-sm);
    }
  `,
  template: `
    <pct-popover inline [open]="true" heading="Filters">
      <p>Open issues, assigned to me, this week.</p>
    </pct-popover>
  `,
})
export class PopoverCardScene {}
