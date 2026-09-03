import { Component, signal } from '@angular/core';
import { PctField, PctNumber } from '@pacit/components/field';

/**
 * Digits the way you write them
 *
 * The value is a number; what you type is parsed in your own locale and written back the
 * same way. `step` sets what the arrows add, `minFractionDigits` how many decimals always show.
 */
@Component({
  selector: 'demo-number-format',
  imports: [PctField, PctNumber],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-field label="Unit price" hint="Arrows move by 0.25">
      <input
        pctNumber
        [(value)]="price"
        [step]="0.25"
        [minFractionDigits]="2"
      />
    </pct-field>
    <p>Stored as {{ price() }}.</p>
  `,
})
export class NumberFormatDemo {
  readonly price = signal<number | null>(19.5);
}
