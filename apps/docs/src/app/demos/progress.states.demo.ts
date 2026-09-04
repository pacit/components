import { Component } from '@angular/core';
import { PctProgress } from '@pacit/components/progress';

/**
 * Determinate, indeterminate, and the sizes
 *
 * A `value` makes the bar say how far; no value makes it say "still going", and the fill
 * travels instead. `max` sets the scale — a download in bytes needs no arithmetic first.
 */
@Component({
  selector: 'demo-progress-states',
  imports: [PctProgress],
  // A width, not only a ceiling — see `progress.demo.ts` (`lesson-160`).
  styles: ':host { display: grid; gap: 14px; inline-size: min(28rem, 100%); }',
  template: `
    <pct-progress [value]="3" [max]="8" ariaLabel="Uploaded files" />
    <pct-progress ariaLabel="Connecting" />
    <pct-progress [value]="66" size="sm" ariaLabel="Small" />
    <pct-progress [value]="66" size="lg" ariaLabel="Large" />
  `,
})
export class ProgressStatesDemo {}
