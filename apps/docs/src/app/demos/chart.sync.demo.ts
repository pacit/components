import { Component } from '@angular/core';
import { PctChart, PctChartSync, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const power = [
  { at: START, value: 380 },
  { at: START + 6 * HOUR, value: 1520 },
  { at: START + 9 * HOUR, value: 2640 },
  { at: START + 17 * HOUR, value: 1450 },
  { at: START + 22 * HOUR, value: 380 },
];
const heater = [
  { at: START, value: 0 },
  { at: START + 5 * HOUR, value: 1 },
  { at: START + 8 * HOUR, value: 0 },
  { at: START + 19 * HOUR, value: 1 },
  { at: START + 21 * HOUR, value: 0 },
];

/**
 * Two charts in step
 *
 * A series over a band of states: two charts and `pctChartSync` on what holds them. Drag, pinch
 * or zoom either and the other follows; the cursor stands on both; and the plots share their
 * edges although the power's axis in W is wider than the heater's yes/no one.
 */
@Component({
  selector: 'demo-chart-sync',
  imports: [PctChart, PctLine, PctChartSync],
  styles: `
    section {
      display: grid;
      gap: var(--pct-space-2);
    }
  `,
  template: `
    <section pctChartSync>
      <pct-chart
        ariaLabel="Heat pump power on 28 October 2026"
        timeZone="Europe/Warsaw"
        style="height: 200px"
      >
        <pct-line
          [data]="power"
          x="at"
          y="value"
          name="Power"
          unit="W"
          curve="step"
          [end]="end"
        />
      </pct-chart>
      <pct-chart
        ariaLabel="Heater on 28 October 2026"
        timeZone="Europe/Warsaw"
        style="height: 90px"
        [zoomButtons]="false"
      >
        <pct-line
          [data]="heater"
          x="at"
          y="value"
          name="Heater"
          unit="boolean"
          curve="step"
          area
          [end]="end"
        />
      </pct-chart>
    </section>
  `,
})
export class ChartSyncDemo {
  protected readonly power = power;
  protected readonly heater = heater;
  protected readonly end = START + 24 * HOUR;
}
