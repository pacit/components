import { Component, signal } from '@angular/core';
import { PctCalendar, PctDay } from '@pacit/components/date';

/**
 * Another language, another first day
 *
 * `locale` names the month and the weekdays through the platform's own `Intl`; `firstDayOfWeek`
 * starts the row where that culture starts it — Monday is 1.
 */
@Component({
  selector: 'demo-calendar-locale',
  imports: [PctCalendar],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-calendar
      [(value)]="day"
      locale="pl"
      [firstDayOfWeek]="1"
      ariaLabel="Choose a day"
    />
  `,
})
export class CalendarLocaleDemo {
  readonly day = signal<PctDay | null>(null);
}
