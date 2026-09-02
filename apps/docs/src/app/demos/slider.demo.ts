import { Component, signal } from '@angular/core';
import { PctSlider } from '@pacit/components/slider';

/** A native range under the paint — steps, marks and the announced value for free. */
@Component({
  selector: 'demo-slider',
  imports: [PctSlider],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-slider label="Volume" [(value)]="volume" [step]="10" [marks]="true" />
    <p>At {{ volume() }} of 100.</p>
  `,
})
export class SliderDemo {
  readonly volume = signal(40);
}
