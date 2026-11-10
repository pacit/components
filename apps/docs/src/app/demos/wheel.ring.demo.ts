import { Component, signal } from '@angular/core';
import { PctWheel, PctWheelOption } from '@pacit/components/wheel';

const digits = (count: number): PctWheelOption<number>[] =>
  Array.from({ length: count }, (_, index) => ({
    value: index,
    label: String(index).padStart(2, '0'),
  }));

/**
 * A ring, and two of them side by side
 *
 * `wrap` is for a cycle: after 23 comes 00, by a key and by the scroll alike. Two wheels in a
 * row are the consumer's composition — each is a listbox with a name of its own.
 */
@Component({
  selector: 'demo-wheel-ring',
  imports: [PctWheel],
  styles: ':host { display: flex; align-items: center; gap: 8px; }',
  template: `
    <pct-wheel ariaLabel="Hour" [options]="hours" [(value)]="hour" wrap />
    <span aria-hidden="true">:</span>
    <pct-wheel ariaLabel="Minute" [options]="minutes" [(value)]="minute" wrap />
  `,
})
export class WheelRingDemo {
  readonly hours = digits(24);
  readonly minutes = digits(60);
  readonly hour = signal<number | null>(9);
  readonly minute = signal<number | null>(30);
}
