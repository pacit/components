import { Component, signal } from '@angular/core';
import { PctDateTime, PctDatetime } from '@pacit/components/datetime';
import { PctDay, pctWeekday } from '@pacit/components/date';

/**
 * Within bounds, around taken slots
 *
 * `min` and `max` are a day and a time: the calendar gets the day of each, the columns the time
 * of a bound only on the bound's own day. `dateDisabled` refuses a day whole; `datetimeDisabled`
 * is asked of every time of the chosen day, and an hour every slot of which is taken is refused.
 */
@Component({
  selector: 'demo-datetime-bounds',
  imports: [PctDatetime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-datetime
      label="Office hours, weekdays"
      min="2026-12-01T09:00"
      max="2026-12-31T17:00"
      step="900"
      [dateDisabled]="weekend"
      [(value)]="office"
    />
    <pct-datetime
      label="Meeting room"
      [datetimeDisabled]="taken"
      [(value)]="room"
    />
  `,
})
export class DatetimeBoundsDemo {
  readonly office = signal<PctDateTime | null>(null);
  readonly room = signal<PctDateTime | null>('2026-12-02T09:00');

  readonly weekend = (day: PctDay): boolean => pctWeekday(day) >= 6;

  /** Booked on 2 December: the whole of ten o'clock, and half past twelve. */
  readonly taken = (value: PctDateTime): boolean =>
    value.startsWith('2026-12-02T10:') || value === '2026-12-02T12:30';
}
