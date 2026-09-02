import { Component, signal } from '@angular/core';
import { PctCalendar, PctDay } from '@pacit/components/date';

/** The month grid on its own — a roving grid the arrow keys walk. */
@Component({
  selector: 'demo-calendar',
  imports: [PctCalendar],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: ` <pct-calendar [(value)]="day" ariaLabel="Pick a day" /> `,
})
export class CalendarDemo {
  readonly day = signal<PctDay | null>(null);
}
