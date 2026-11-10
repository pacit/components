import { Component, signal } from '@angular/core';
import { PctWheel, PctWheelOption } from '@pacit/components/wheel';

/** A list turned under a line — the row that comes to rest there is the value. */
@Component({
  selector: 'demo-wheel',
  imports: [PctWheel],
  styles: ':host { display: block; max-inline-size: 12rem; }',
  template: `
    <pct-wheel label="Weekday" [options]="days" [(value)]="day" />
    <p>Chosen: {{ day() ?? 'nothing yet' }}.</p>
  `,
})
export class WheelDemo {
  readonly days: readonly PctWheelOption[] = [
    { value: 'mon', label: 'Monday' },
    { value: 'tue', label: 'Tuesday' },
    { value: 'wed', label: 'Wednesday' },
    { value: 'thu', label: 'Thursday' },
    { value: 'fri', label: 'Friday' },
    { value: 'sat', label: 'Saturday', disabled: true },
    { value: 'sun', label: 'Sunday' },
  ];
  readonly day = signal<string | null>('wed');
}
