import { Component } from '@angular/core';
import { PctChart, PctChartTable, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const supply = [
  18.2, 18, 17.8, 17.7, 17.9, 18.4, 19.1, 19.9, 20.6, 21.2, 21.7, 22.1, 22.4,
  22.6, 22.5, 22.2, 21.8, 21.2, 20.6, 20, 19.4, 19, 18.6, 18.4, 18.3,
].map((value, hour) => ({ at: START + hour * HOUR, value }));
const fan = [
  { at: START, value: 380 },
  { at: START + 7 * HOUR, value: 520 },
  { at: START + 12 * HOUR, value: 640 },
  { at: START + 18 * HOUR, value: 450 },
];

/** Supply air and the fan's power through a day: two units, two axes, the data as a table. */
@Component({
  selector: 'demo-chart',
  imports: [PctChart, PctLine, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Heat recovery on 28 October 2026"
      description="Supply air between 17.7 and 22.6 °C, warmest at 13:00; the fan between 380 and 640 W."
      timeZone="Europe/Warsaw"
      style="height: 260px"
    >
      <pct-line [data]="supply" x="at" y="value" name="Supply air" unit="°C" />
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
    <pct-chart-table [chart]="chart" [rows]="12" />
  `,
})
export class ChartDemo {
  protected readonly supply = supply;
  protected readonly fan = fan;
  protected readonly end = START + 24 * HOUR;
}
