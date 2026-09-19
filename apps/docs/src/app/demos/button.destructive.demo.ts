import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * A destructive action, and the way out of it
 *
 * The tone is for the one press that cannot be taken back — and it works because of what
 * stands beside it. The way out is the quiet face with no tone at all: a row where both
 * buttons shout has no shape, and a reader who cannot see the red is left with the two
 * labels, which is why the labels have to be the ones carrying the difference.
 *
 * `soft` is the same tone at a lower volume, for the destructive action that is not the
 * point of the screen — removing one row of a table rather than closing the account.
 */
@Component({
  selector: 'demo-button-destructive',
  imports: [PctButton],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .caption {
      margin: 0;
      font-size: 13px;
      opacity: 0.75;
    }
  `,
  template: `
    <div>
      <div class="row">
        <button pctButton tone="danger">Delete account</button>
        <button pctButton variant="ghost">Keep it</button>
      </div>
      <p class="caption">
        The dialog's own footer: one press that ends it, one that does not.
      </p>
    </div>
    <div>
      <div class="row">
        <button pctButton variant="soft" tone="danger" size="sm">
          Remove row
        </button>
        <button pctButton variant="soft" tone="warning" size="sm">
          Overwrite draft
        </button>
      </div>
      <p class="caption">
        The same tones where the action is not the point of the screen.
      </p>
    </div>
  `,
})
export class ButtonDestructiveDemo {}
