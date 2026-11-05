import { Component, signal } from '@angular/core';
import {
  PctChartLegend,
  PctChartTable,
  PctPie,
  type PctSlicePick,
} from '@pacit/components/chart';

interface Use {
  readonly use: string;
  readonly kwh: number;
}

/** A month's energy by what used it, the smallest uses many. */
const USES: readonly Use[] = [
  { use: 'Heat pump', kwh: 412 },
  { use: 'Hot water', kwh: 168 },
  { use: 'Ventilation', kwh: 96 },
  { use: 'Lighting', kwh: 54 },
  { use: 'Kitchen', kwh: 71 },
  { use: 'Laundry', kwh: 38 },
  { use: 'Server room', kwh: 29 },
  { use: 'Chargers', kwh: 17 },
  { use: 'Garden', kwh: 9 },
];

/**
 * A pie and a donut
 *
 * `pct-pie` draws the shares of a whole: each slice a series the legend lists and the table
 * holds with its share; the smallest values fold into one slice of the rest, a selected slice
 * stands out, and the arrow keys walk the slices on the cursor's range.
 */
@Component({
  selector: 'demo-chart-pie',
  imports: [PctPie, PctChartLegend, PctChartTable],
  styles: `
    .pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: var(--pct-space-4);
      align-items: start;
    }
    pct-pie {
      max-inline-size: 360px;
    }
    pct-chart-legend,
    pct-chart-table,
    p {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <div class="pair">
      <div>
        <pct-pie
          #pie
          ariaLabel="Energy by use, October 2026"
          [data]="uses"
          value="kwh"
          name="use"
          unit="kWh"
          [(selected)]="selected"
          (pick)="picked.set($event)"
        />
        <pct-chart-legend [chart]="pie" value="latest" layout="column" />
        <p>
          @if (picked(); as pick) {
            Picked {{ pick.series }}: {{ pick.value }} kWh.
          } @else {
            Press a slice, or Enter on the cursor's slice, to pick it.
          }
        </p>
      </div>
      <div>
        <pct-pie
          #donut
          ariaLabel="Energy by use, October 2026, as a donut"
          [data]="uses"
          value="kwh"
          name="use"
          unit="kWh"
          donut="0.6"
          startAngle="-90"
          [others]="4"
          labels="none"
        />
        <pct-chart-table [chart]="donut" summary="sum" />
      </div>
    </div>
  `,
})
export class ChartPieDemo {
  protected readonly uses = USES;
  protected readonly selected = signal<string | null>('Heat pump');
  protected readonly picked = signal<PctSlicePick<Use> | null>(null);
}
