import { Component, signal } from '@angular/core';
import { PctCheckbox } from '@pacit/components/checkbox';

/**
 * The states a form drives
 *
 * `required`, `invalid` and `touched` are the form's to set — the `FormField` directive keeps
 * them in sync — and here they are set by hand to show each face: the error appears once
 * the box is both invalid and touched, never before.
 */
@Component({
  selector: 'demo-checkbox-states',
  imports: [PctCheckbox],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-checkbox
      label="I accept the terms"
      hint="Required to continue"
      [(checked)]="terms"
      required
      [invalid]="!terms()"
      [touched]="true"
    />
    <pct-checkbox label="Remember this device" [checked]="true" readonly />
    <pct-checkbox label="Beta features" hint="Not on this plan" disabled />
  `,
})
export class CheckboxStatesDemo {
  readonly terms = signal(false);
}
