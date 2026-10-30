import { Component } from '@angular/core';
import { PctAxis, PctChart, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const outdoor = [
  4.1, 3.8, 3.4, 3.1, 2.9, 2.8, 3.2, 4.4, 6.1, 7.9, 9.4, 10.6, 11.3, 11.6, 11.2,
  10.1, 8.6, 7.4, 6.5, 5.9, 5.4, 5, 4.7, 4.4, 4.2,
].map((value, hour) => ({ at: START + hour * HOUR, value }));

/**
 * An area on a fixed axis
 *
 * One series filled down to zero, on an axis `pct-axis` holds from 0 to 30 °C whatever the
 * day brings, so two days side by side read on one scale. The fill is the series' palette
 * colour mixed into nothing by the skin's `--pct-chart-area-alpha`.
 */
@Component({
  selector: 'demo-chart-area',
  imports: [PctChart, PctLine, PctAxis],
  template: `
    <pct-chart
      ariaLabel="Outdoor temperature on 28 October 2026"
      description="Between 2.8 and 11.6 °C, warmest at 13:00."
      timeZone="Europe/Warsaw"
      style="height: 220px"
    >
      <pct-axis unit="°C" [floor]="0" [ceiling]="30" />
      <pct-line
        [data]="outdoor"
        x="at"
        y="value"
        name="Outdoor"
        unit="°C"
        area
      />
    </pct-chart>
  `,
})
export class ChartAreaDemo {
  protected readonly outdoor = outdoor;
}
