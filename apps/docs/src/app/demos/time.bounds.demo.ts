import { Component, signal } from '@angular/core';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';

/**
 * Within bounds
 *
 * `min` and `max` are times, and the panel disables the rows outside them; a `min` later than
 * `max` is a window across midnight. A time typed outside them is kept and left to the form.
 */
@Component({
  selector: 'demo-time-bounds',
  imports: [PctTime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-time
      label="Office hours"
      min="09:00"
      max="17:00"
      step="900"
      [(value)]="office"
    />
    <pct-time
      label="The night shift"
      min="22:00"
      max="06:00"
      step="1800"
      [(value)]="night"
    />
  `,
})
export class TimeBoundsDemo {
  readonly office = signal<PctTimeOfDay | null>(null);
  readonly night = signal<PctTimeOfDay | null>(null);
}
