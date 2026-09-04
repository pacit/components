import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * All five faces, two rows instead of one — a card is 272px across and a single row of them
 * is 531px. What the card drops is the loading state: a spinner in a scene nobody can click
 * spins for ever without ever finishing, and a face that is always there is a truer thing to
 * show than a state that never resolves.
 */
@Component({
  selector: 'demo-button-card',
  imports: [PctButton],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--pct-space-3);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--pct-space-3);
    }
  `,
  template: `
    <div class="row">
      <button pctButton>Solid</button>
      <button pctButton variant="hero">Hero</button>
    </div>
    <div class="row">
      <button pctButton variant="outline">Outline</button>
      <button pctButton variant="soft">Soft</button>
      <button pctButton variant="ghost">Ghost</button>
    </div>
  `,
})
export class ButtonCardScene {}
