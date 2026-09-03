import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * Loading and disabled
 *
 * Two states, kept apart on purpose. `loading` says "working": the spinner takes the face's
 * own colour and the element reports `aria-busy`. `disabled` says "cannot be clicked". A
 * queued click is a legitimate pattern, so loading alone never blocks — press Save to watch
 * both at once.
 */
@Component({
  selector: 'demo-button-states',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <button
      pctButton
      [loading]="saving()"
      [disabled]="saving()"
      (click)="save()"
    >
      {{ saving() ? 'Saving…' : 'Save' }}
    </button>
    <button pctButton variant="outline" loading>Checking</button>
    <button pctButton disabled>Disabled</button>
    <button pctButton variant="outline" disabled>Disabled</button>
  `,
})
export class ButtonStatesDemo {
  protected readonly saving = signal(false);

  protected save(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 1500);
  }
}
