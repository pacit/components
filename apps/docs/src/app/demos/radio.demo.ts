import { Component, signal } from '@angular/core';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';

/** One choice of a few, all visible — arrows move both the focus and the value. */
@Component({
  selector: 'demo-radio',
  imports: [PctRadio, PctRadioGroup],
  template: `
    <pct-radio-group ariaLabel="Plan" [(value)]="plan">
      <pct-radio value="free">Free</pct-radio>
      <pct-radio value="pro">Pro</pct-radio>
      <pct-radio value="enterprise" disabled>Enterprise</pct-radio>
    </pct-radio-group>
    <p>Chosen: {{ plan() ?? 'nothing yet' }}</p>
  `,
})
export class RadioDemo {
  readonly plan = signal<string | null>('pro');
}
