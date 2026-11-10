import { Component, signal } from '@angular/core';
import { PctWheel, PctWheelOption } from '@pacit/components/wheel';

const digits = (count: number): PctWheelOption<number>[] =>
  Array.from({ length: count }, (_, index) => ({
    value: index,
    label: String(index).padStart(2, '0'),
  }));

/**
 * Two rings at rest — an hour and a minute on their lines.
 *
 * A wheel is `rows` of its row height, five by default and 160 px at `md`; the stage has 144,
 * so the card asks for three. A count the wheel ships, not a length of the card's.
 */
@Component({
  selector: 'demo-wheel-card',
  imports: [PctWheel],
  styles: ':host { display: flex; align-items: center; gap: 8px; }',
  template: `
    <pct-wheel
      ariaLabel="Hour"
      [options]="hours"
      [(value)]="hour"
      rows="3"
      wrap
    />
    <span aria-hidden="true">:</span>
    <pct-wheel
      ariaLabel="Minute"
      [options]="minutes"
      [(value)]="minute"
      rows="3"
      wrap
    />
  `,
})
export class WheelCardScene {
  readonly hours = digits(24);
  readonly minutes = digits(60);
  readonly hour = signal<number | null>(13);
  readonly minute = signal<number | null>(5);
}
