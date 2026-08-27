import { Component, signal } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctSlider } from '@pacit/components/slider';
import { SbxDemo } from '../../ui/demo';

/**
 * Slider: a position on a numeric continuum, drawn on the platform's own
 * `<input type="range">` — the role, the value, the bounds and the whole keyboard are the
 * element's, and the only thing the component adds is a value the platform cannot
 * pronounce.
 */
@Component({
  selector: 'sbx-slider-view',
  imports: [SbxDemo, PctSlider, PctField, FormField],
  templateUrl: './slider-view.html',
  styleUrl: './slider-view.scss',
})
export class SliderView {
  protected readonly model = signal({ budget: 40 });

  protected readonly limitsForm = form(this.model, (p) => {
    min(p.budget, 20, { message: 'The budget cannot go below 20' });
    max(p.budget, 80, { message: 'The budget cannot go above 80' });
  });

  /** A plain 0–100 slider: the platform's bare number is the whole announcement. */
  protected readonly volume = signal(30);

  /** A formatted one: the bubble and `aria-valuetext` are the same string. */
  protected readonly discount = signal(0.15);
  protected readonly percent: Intl.NumberFormatOptions = { style: 'percent' };

  /** Named steps — a number underneath, a word on top. */
  protected readonly size = signal(1);
  protected readonly sizes = ['Small', 'Medium', 'Large'] as const;

  /** Vertical, which is `writing-mode` and nothing else. */
  protected readonly gain = signal(60);
}
