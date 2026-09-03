import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * In a toolbar
 *
 * A row of actions is the consumer's own flex box — `pct-stack` stacks, it does not row.
 * The primary action goes last, the destructive one is kept at arm's length by the gap
 * that grows between them.
 */
@Component({
  selector: 'demo-button-toolbar',
  imports: [PctButton],
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .grow {
      flex: 1;
    }
  `,
  template: `
    <button pctButton variant="ghost">Delete draft</button>
    <span class="grow"></span>
    <button pctButton variant="outline">Cancel</button>
    <button pctButton>Publish</button>
  `,
})
export class ButtonToolbarDemo {}
