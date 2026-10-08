import { Component, signal } from '@angular/core';
import { PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';

/**
 * The clock and the step
 *
 * The columns are the field's language: a Korean clock puts the half of the day first, in its
 * own words. And the step decides which rows exist — a quarter hour lists four minutes.
 */
@Component({
  selector: 'demo-columns-clock',
  imports: [PctTimeColumns],
  styles: ':host { display: flex; flex-wrap: wrap; gap: 24px; }',
  template: `
    <pct-time-columns [(value)]="korean" locale="ko-KR" ariaLabel="Korean" />
    <pct-time-columns
      [(value)]="quarter"
      locale="en-GB"
      step="900"
      ariaLabel="By the quarter"
    />
  `,
})
export class ColumnsClockDemo {
  readonly korean = signal<PctTimeOfDay | null>('19:30');
  readonly quarter = signal<PctTimeOfDay | null>('09:45');
}
