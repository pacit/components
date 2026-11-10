import { Component, signal } from '@angular/core';
import { PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';

/**
 * As wheels, and a shorter window
 *
 * `picker="wheel"` turns each column into a wheel: the rows under a line, a ring where the
 * column fills its window, and the same keys, step and bounds. `rows` is how many rows a
 * column shows, in both shapes — an odd count, so the middle is a row.
 */
@Component({
  selector: 'demo-columns-wheel',
  imports: [PctTimeColumns],
  styles: ':host { display: flex; flex-wrap: wrap; gap: 24px; }',
  template: `
    <pct-time-columns
      picker="wheel"
      [(value)]="alarm"
      locale="en-GB"
      ariaLabel="Alarm"
    />
    <pct-time-columns
      picker="wheel"
      rows="5"
      [(value)]="office"
      locale="en-US"
      step="900"
      min="09:00"
      max="17:00"
      ariaLabel="Office hours"
    />
    <pct-time-columns
      rows="5"
      [(value)]="short"
      locale="en-GB"
      ariaLabel="Five rows"
    />
  `,
})
export class ColumnsWheelDemo {
  readonly alarm = signal<PctTimeOfDay | null>('06:30');
  readonly office = signal<PctTimeOfDay | null>('13:15');
  readonly short = signal<PctTimeOfDay | null>('08:15');
}
