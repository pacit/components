import { Component, signal } from '@angular/core';
import { PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';

/**
 * A time at rest — the chosen rows in the middle of their columns.
 *
 * A column is a window of about seven rows, 224 px at `md`, and the stage has 144, so the card
 * takes `--pct-time-column-height` and the row below the shipped axis and lets the rest follow
 * (`req-api-size`). A shorter window, not a partial control.
 */
@Component({
  selector: 'demo-time-columns-card',
  imports: [PctTimeColumns],
  styles: `
    :host {
      display: block;
      --pct-time-column-height: 120px;
      --pct-time-option-height: 24px;
      --pct-time-option-font-size: var(--pct-font-size-sm);
    }
  `,
  template: ` <pct-time-columns [(value)]="time" ariaLabel="Meeting time" /> `,
})
export class TimeColumnsCardScene {
  readonly time = signal<PctTimeOfDay | null>('13:05');
}
