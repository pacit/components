import { Component } from '@angular/core';
import { PctDialog } from '@pacit/components/dialog';

/**
 * The window itself — the heading, the close button and the content — rather than the
 * control that opens it.
 *
 * `inline`
 * ([0066](../../../../../../docs/decisions/0066-a-panel-is-a-layer-or-a-region-and-the-consumer-says-which.md))
 * draws the same panel where the tag stands, and it draws every part but the `backdrop`,
 * which is the layer's. So the card is honest twice over: it is the real panel, and it is
 * not pretending to be modal — nothing here is trapped, veiled or locked, and the page
 * around it goes on answering.
 */
@Component({
  selector: 'demo-dialog-card',
  imports: [PctDialog],
  styles: `
    :host {
      display: block;
      inline-size: 14rem;
    }
    p {
      margin: 0;
      color: var(--pct-text-muted);
      font-size: var(--pct-font-size-sm);
    }
  `,
  template: `
    <pct-dialog inline [open]="true" heading="Discard draft?">
      <p>The note has unsaved changes.</p>
    </pct-dialog>
  `,
})
export class DialogCardScene {}
