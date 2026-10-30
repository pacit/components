import { Component } from '@angular/core';
import { PctChart, PctChartLegend, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const supply = [
  18.2, 18, 17.8, 17.7, 17.9, 18.4, 19.1, 19.9, 20.6, 21.2, 21.7, 22.1, 22.4,
  22.6, 22.5, 22.2, 21.8, 21.2, 20.6, 20, 19.4, 19, 18.6, 18.4, 18.3,
].map((value, hour) => ({ at: START + hour * HOUR, value }));
const outdoor = [
  4.1, 3.8, 3.4, 3.1, 2.9, 2.8, 3.2, 4.4, 6.1, 7.9, 9.4, 10.6, 11.3, 11.6, 11.2,
  10.1, 8.6, 7.4, 6.5, 5.9, 5.4, 5, 4.7, 4.4, 4.2,
].map((value, hour) => ({ at: START + hour * HOUR, value }));
const fan = [
  { at: START, value: 380 },
  { at: START + 7 * HOUR, value: 520 },
  { at: START + 12 * HOUR, value: 640 },
  { at: START + 18 * HOUR, value: 450 },
];

/**
 * A legend
 *
 * The series as a list beside the picture: each entry its swatch — the colour, the dash and
 * the marker the series is told apart by — its name, its unit where the chart holds more than
 * one, and the latest reading. Press an entry to hide the series and press it again to show
 * it; with a cursor on the chart the entries write the reading under it instead.
 */
@Component({
  selector: 'demo-chart-legend',
  imports: [PctChart, PctLine, PctChartLegend],
  styles: `
    pct-chart-legend {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #chart
      ariaLabel="Air and fan on 28 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 240px"
    >
      <pct-line [data]="supply" x="at" y="value" name="Supply air" unit="°C" />
      <pct-line [data]="outdoor" x="at" y="value" name="Outdoor" unit="°C" />
      <pct-line
        [data]="fan"
        x="at"
        y="value"
        name="Fan power"
        unit="W"
        curve="step"
        [end]="end"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" value="latest" />
  `,
})
export class ChartLegendDemo {
  protected readonly supply = supply;
  protected readonly outdoor = outdoor;
  protected readonly fan = fan;
  protected readonly end = START + 24 * HOUR;
}
