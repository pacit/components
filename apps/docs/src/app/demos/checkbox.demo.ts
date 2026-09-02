import { Component, signal } from '@angular/core';
import { PctCheckbox } from '@pacit/components/checkbox';

/** A native input under the paint — the checkmark is drawn, the semantics are not. */
@Component({
  selector: 'demo-checkbox',
  imports: [PctCheckbox],
  styles: ':host { display: grid; gap: 8px; }',
  template: `
    <pct-checkbox label="Send me release notes" [(checked)]="notes" />
    <pct-checkbox label="Signed the agreement" [checked]="true" disabled />
    <p>Release notes: {{ notes() ? 'yes' : 'no' }}</p>
  `,
})
export class CheckboxDemo {
  readonly notes = signal(true);
}
