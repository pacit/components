import { Component, signal } from '@angular/core';
import { PctSlider } from '@pacit/components/slider';

/**
 * A range of its own, with marks
 *
 * `min`, `max` and `step` set the scale; `marks` draws a tick per step, so a slider with
 * five stops reads as five stops before the thumb moves.
 */
@Component({
  selector: 'demo-slider-range',
  imports: [PctSlider],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 28rem; }',
  template: `
    <pct-slider
      label="Team size"
      hint="Seats on the plan"
      [(value)]="seats"
      [min]="5"
      [max]="25"
      [step]="5"
      [marks]="true"
    />
    <p>{{ seats() }} seats.</p>
  `,
})
export class SliderRangeDemo {
  readonly seats = signal(10);
}
