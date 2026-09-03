import { Component, signal } from '@angular/core';
import { PctMultiSelect, PctSelectOption } from '@pacit/components/select';

/**
 * Many answers
 *
 * `pct-multi-select` holds an array: each pick toggles a value, the trigger names how many
 * are chosen, and the same keyboard walks the same panel.
 */
@Component({
  selector: 'demo-select-multi',
  imports: [PctMultiSelect],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-multi-select label="Notify" [options]="channels" [(value)]="chosen" />
    <p>Via: {{ chosen().length ? chosen().join(', ') : 'nothing yet' }}</p>
  `,
})
export class SelectMultiDemo {
  readonly chosen = signal<string[]>(['email']);
  readonly channels: readonly PctSelectOption[] = [
    { value: 'email', label: 'E-mail' },
    { value: 'sms', label: 'Text message' },
    { value: 'push', label: 'Push' },
    { value: 'slack', label: 'Slack' },
  ];
}
