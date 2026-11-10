import { Component, signal } from '@angular/core';
import { PctTime, PctTimeOfDay } from '@pacit/components/time';

/**
 * The panel as wheels
 *
 * `picker="wheel"` draws the panel's columns as wheels — turned by a finger, a mouse wheel or
 * the arrows, the row under the line the time. What is typed, what the keys do and what
 * closes the panel are the `list` shape's.
 */
@Component({
  selector: 'demo-time-wheel',
  imports: [PctTime],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-time label="Alarm" picker="wheel" [(value)]="alarm" />
    <pct-time
      label="Office hours"
      picker="wheel"
      step="900"
      min="09:00"
      max="17:00"
      [(value)]="office"
    />
    <p>Values: {{ alarm() ?? 'none' }} · {{ office() ?? 'none' }}</p>
  `,
})
export class TimeWheelDemo {
  readonly alarm = signal<PctTimeOfDay | null>('06:30');
  readonly office = signal<PctTimeOfDay | null>('13:15');
}
