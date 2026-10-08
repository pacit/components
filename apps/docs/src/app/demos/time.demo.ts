import { Component, signal } from '@angular/core';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';

/** Type it or pick it — the clock comes from Intl, the letters from the texts channel. */
@Component({
  selector: 'demo-time',
  imports: [PctTime],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-time
      label="Starts at"
      hint="Type it, or pick it from the columns"
      [(value)]="startsAt"
    />
  `,
})
export class TimeDemo {
  readonly startsAt = signal<PctTimeOfDay | null>(null);
}
