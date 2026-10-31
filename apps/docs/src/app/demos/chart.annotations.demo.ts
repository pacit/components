import { Component } from '@angular/core';
import {
  PctChart,
  PctChartLegend,
  PctLine,
  PctNote,
  PctNow,
  PctReference,
  PctSpan,
  type PctThreshold,
} from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const supply = [
  18.2, 18, 17.8, 17.7, 17.9, 18.4, 19.1, 19.9, 20.6, 21.2, 21.7, 22.1, 22.4,
  22.6, 22.5, 22.2, 21.8, 21.2, 20.6, 20, 19.4, 19, 18.6, 18.4, 18.3,
].map((value, hour) => ({ at: START + hour * HOUR, value }));

/**
 * Annotations
 *
 * The marks that bring no series: a band under the line for the night tariff, a dashed
 * reference line at the comfort setting, a note on the hour the window was opened, the moment
 * the report was taken, and the line itself in another colour over 22 °C (`threshold`). None
 * has an axis or a column in the table; a reader hears them in the picture's description, and
 * the two asked to stand in the legend can be hidden there.
 */
@Component({
  selector: 'demo-chart-annotations',
  imports: [
    PctChart,
    PctLine,
    PctReference,
    PctSpan,
    PctNote,
    PctNow,
    PctChartLegend,
  ],
  styles: `
    pct-chart-legend {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply air on 28 October 2026, annotated"
      timeZone="Europe/Warsaw"
      style="height: 240px"
    >
      <pct-span
        [from]="night.from"
        [to]="night.to"
        label="Night tariff"
        legend
      />
      <pct-line
        [data]="supply"
        x="at"
        y="value"
        name="Supply air"
        unit="°C"
        [threshold]="hot"
      />
      <pct-reference [y]="21" unit="°C" label="Comfort" dash legend />
      <pct-note [x]="opened" [y]="20.6" unit="°C" text="Window opened" />
      <pct-now [at]="reported" label="Report taken" />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
  `,
})
export class ChartAnnotationsDemo {
  protected readonly supply = supply;
  protected readonly night = { from: START, to: START + 6 * HOUR };
  protected readonly opened = START + 8 * HOUR;
  protected readonly reported = START + 16 * HOUR;
  protected readonly hot: PctThreshold[] = [{ at: 22, color: 'tomato' }];
}
