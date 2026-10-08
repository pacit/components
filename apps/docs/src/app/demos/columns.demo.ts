import { Component, signal } from '@angular/core';
import { PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';

/** One listbox per field of the time — each a tab stop pointing at its row. */
@Component({
  selector: 'demo-time-columns',
  imports: [PctTimeColumns],
  template: `
    <pct-time-columns [(value)]="time" ariaLabel="Meeting time" />
    <p>Value: {{ time() ?? 'none' }}</p>
  `,
})
export class TimeColumnsDemo {
  readonly time = signal<PctTimeOfDay | null>('13:05');
}
