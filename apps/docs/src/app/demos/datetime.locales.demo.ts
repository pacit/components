import { Component, signal } from '@angular/core';
import { PctDateTime, PctDatetime } from '@pacit/components/datetime';

/**
 * In other languages
 *
 * Which half stands first, the day's order and the clock all come from Intl for the field's
 * locale — the time first in Vietnamese. One value, written three ways.
 */
@Component({
  selector: 'demo-datetime-locales',
  imports: [PctDatetime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-datetime label="American English" locale="en-US" [(value)]="value" />
    <pct-datetime label="Polish" locale="pl-PL" [(value)]="value" />
    <pct-datetime label="Vietnamese" locale="vi-VN" [(value)]="value" />
  `,
})
export class DatetimeLocalesDemo {
  readonly value = signal<PctDateTime | null>('2026-12-01T13:05');
}
