import { Component } from '@angular/core';
import { PctChart, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const supply = [
  18.2, 18, 17.8, 17.7, 17.9, 18.4, 19.1, 19.9, 20.6, 21.2, 21.7, 22.1, 22.4,
  22.6, 22.5, 22.2, 21.8, 21.2, 20.6, 20, 19.4, 19, 18.6, 18.4, 18.3,
].map((value, hour) => ({ at: START + hour * HOUR, value }));

/**
 * The card's still frame: one day of one series, filled to its axis, and no table and no
 * cursor — the stage is a thumbnail and no stop, and the demo on the page holds the rest. The width is stated, as
 * the stage centres a `max-content` scene and a chart takes its width from its container.
 */
@Component({
  selector: 'demo-chart-card',
  imports: [PctChart, PctLine],
  styles: `
    :host {
      display: block;
      inline-size: 16.5rem;
    }
  `,
  template: `
    <pct-chart
      ariaLabel="Supply air on 28 October 2026"
      timeZone="Europe/Warsaw"
      cursorMode="none"
      style="height: 9rem"
    >
      <pct-line
        [data]="supply"
        x="at"
        y="value"
        name="Supply air"
        unit="°C"
        area
      />
    </pct-chart>
  `,
})
export class ChartCardScene {
  protected readonly supply = supply;
}
