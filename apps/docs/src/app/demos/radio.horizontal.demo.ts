import { Component, signal } from '@angular/core';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';

/**
 * In a row, with a hint
 *
 * `orientation="horizontal"` lays the options on one line for a short list; `label` and
 * `hint` name the whole group, which is what a screen reader announces first.
 */
@Component({
  selector: 'demo-radio-horizontal',
  imports: [PctRadio, PctRadioGroup],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-radio-group
      label="Billing"
      hint="Yearly saves two months"
      orientation="horizontal"
      [(value)]="cycle"
    >
      <pct-radio value="monthly">Monthly</pct-radio>
      <pct-radio value="yearly">Yearly</pct-radio>
    </pct-radio-group>
    <p>Billed {{ cycle() }}.</p>
  `,
})
export class RadioHorizontalDemo {
  readonly cycle = signal<string | null>('yearly');
}
