import { Component } from '@angular/core';
import {
  PctBand,
  type PctBandState,
  PctChart,
  PctChartLegend,
  PctChartTable,
  PctLine,
} from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

const supply = [
  18.2, 18, 17.8, 17.7, 17.9, 18.4, 19.1, 19.9, 20.6, 21.2, 21.7, 22.1, 22.4,
  22.6, 22.5, 22.2, 21.8, 21.2, 20.6, 20, 19.4, 19, 18.6, 18.4, 18.3,
].map((value, hour) => ({ at: START + hour * HOUR, value }));

/** The heat pump's mode: what it was doing, from when to when. */
const modes = [
  ['off', 0, 5],
  ['heating', 5, 7.5],
  ['defrost', 7.5, 8],
  ['heating', 8, 9],
  ['standby', 9, 16],
  ['heating', 16, 20],
  ['defrost', 20, 20.25],
  ['heating', 20.25, 22],
  ['off', 22, 24],
].map(([mode, from, to]) => ({
  mode: mode as string,
  from: START + (from as number) * HOUR,
  to: START + (to as number) * HOUR,
}));

/**
 * A band of states
 *
 * `pct-band` draws the heat pump's mode as a block per segment in a lane of its own under
 * the plot: no series, no axis. The tooltip names the mode under the cursor and how long it
 * held, the legend lists the modes with a toggle each, the table gets a column with a row per
 * segment, and a reader hears how long each mode held. A chart holding a band alone is a
 * band of states with a time axis; `lane="plot"` tints the whole plot behind the series
 * instead.
 */
@Component({
  selector: 'demo-chart-band',
  imports: [PctChart, PctLine, PctBand, PctChartLegend, PctChartTable],
  styles: `
    pct-chart-legend,
    pct-chart-table {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply air and the heat pump's mode on 28 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 240px"
    >
      <pct-line [data]="supply" x="at" y="value" name="Supply air" unit="°C" />
      <pct-band
        [data]="modes"
        from="from"
        to="to"
        state="mode"
        label="Mode"
        [states]="states"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" [rows]="12" />
  `,
})
export class ChartBandDemo {
  protected readonly supply = supply;
  protected readonly modes = modes;
  protected readonly states: Record<string, PctBandState> = {
    heating: { color: 1, label: 'Heating' },
    defrost: { color: 'tomato', label: 'Defrost' },
    standby: { color: 3, label: 'Standby' },
    off: { color: 'lightgray', label: 'Off' },
  };
}
