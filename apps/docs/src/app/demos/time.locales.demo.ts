import { Component, signal } from '@angular/core';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';

/**
 * The clock is the language's
 *
 * One value on three clocks: twelve hours in American English, twenty-four in British, and the
 * day period before the hour in Korean — all of it from `Intl` for the field's `locale`, and a
 * clock forced on a reader is a locale too (`en-US-u-hc-h23`).
 */
@Component({
  selector: 'demo-time-locales',
  imports: [PctTime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-time label="American English" locale="en-US" [(value)]="time" />
    <pct-time label="British English" locale="en-GB" [(value)]="time" />
    <pct-time label="Korean" locale="ko-KR" [(value)]="time" />
  `,
})
export class TimeLocalesDemo {
  readonly time = signal<PctTimeOfDay | null>('13:05');
}
