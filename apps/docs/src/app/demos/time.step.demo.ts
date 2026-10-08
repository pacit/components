import { Component, signal } from '@angular/core';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';

/**
 * The step, and seconds
 *
 * `step` is in seconds, as the native attribute's: `900` lists the quarters in the panel, and a
 * step under a minute adds a column of seconds and puts them in the value. A time typed off the
 * step is kept — it is the form's to refuse, with `pctTimeOnStep`.
 */
@Component({
  selector: 'demo-time-step',
  imports: [PctTime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-time label="Quarter hours" step="900" [(value)]="quarter" />
    <pct-time label="To the second" step="1" [(value)]="precise" />
    <p>Values: {{ quarter() ?? 'none' }} · {{ precise() ?? 'none' }}</p>
  `,
})
export class TimeStepDemo {
  readonly quarter = signal<PctTimeOfDay | null>('09:15');
  readonly precise = signal<PctTimeOfDay | null>('09:15:30');
}
