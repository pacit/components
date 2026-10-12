import { Component, signal } from '@angular/core';
import { PctDatetime, PctDateTime } from '@pacit/components/datetime';

/** Type the two halves or pick them in one panel — a day first, then the hours. */
@Component({
  selector: 'demo-datetime',
  imports: [PctDatetime],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-datetime
      label="Starts"
      hint="Type it, or pick the day and then the time"
      [(value)]="startsAt"
    />
  `,
})
export class DatetimeDemo {
  readonly startsAt = signal<PctDateTime | null>(null);
}
