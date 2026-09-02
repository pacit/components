import { Component, signal } from '@angular/core';
import { PctDate, PctDay } from '@pacit/components/date';

/** Type it or pick it — the format comes from Intl, the letters from the texts channel. */
@Component({
  selector: 'demo-date',
  imports: [PctDate],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-date
      label="Starts on"
      hint="Type it, or pick it from the calendar"
      [(value)]="startsOn"
    />
  `,
})
export class DateDemo {
  readonly startsOn = signal<PctDay | null>(null);
}
