import { Component, signal } from '@angular/core';
import { PctDate, PctDay, pctAddDays, pctToday } from '@pacit/components/date';

/**
 * Within bounds
 *
 * `min` and `max` are days, and the calendar greys what falls outside; typing a day
 * outside them marks the field invalid rather than silently moving it.
 */
@Component({
  selector: 'demo-date-bounds',
  imports: [PctDate],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-date
      label="Delivery"
      hint="Within the next two weeks"
      [(value)]="delivery"
      [min]="today"
      [max]="latest"
    />
    <p>Chosen: {{ delivery() ?? 'not yet' }}</p>
  `,
})
export class DateBoundsDemo {
  readonly today = pctToday();
  readonly latest = pctAddDays(this.today, 14);
  readonly delivery = signal<PctDay | null>(null);
}
