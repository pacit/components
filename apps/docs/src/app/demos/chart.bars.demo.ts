import { Component, computed, signal } from '@angular/core';
import {
  PctBars,
  PctChart,
  PctChartTable,
  type PctWindow,
} from '@pacit/components/chart';

/** Midnight in Warsaw on a day of March, and of February. */
const march = (d: number) => Date.UTC(2026, 2, d - 1, 23);
const february = (d: number) => Date.UTC(2026, 1, d - 1, 23);

const thisWeek = [11.2, 12.8, 9.4, 14.1, 13.3, 10.7, 8.9].map((energy, i) => ({
  at: march(i + 1),
  energy,
}));
const lastMonth = [14.2, 15.1, 13.8, 16.4, 15.9, 14.7, 13.2].map(
  (energy, i) => ({ at: february(i + 1), energy }),
);

/**
 * Bars with comparison and selection
 *
 * `pct-bars` per interval, with a previous period laid beside it through `compare`. Press a bar to
 * select it; the table adds a sum in its foot.
 */
@Component({
  selector: 'demo-chart-bars',
  imports: [PctChart, PctBars, PctChartTable],
  styles: `
    p {
      margin: var(--pct-space-3) 0;
      color: var(--pct-text-muted);
    }
  `,
  template: `
    <pct-chart
      #chart
      ariaLabel="Heat pump energy by day, first week of March 2026"
      timeZone="Europe/Warsaw"
      interval="day"
      style="height: 260px"
      [(selected)]="selected"
    >
      <pct-bars
        [data]="thisWeek"
        x="at"
        y="energy"
        name="March"
        unit="kWh"
        [compare]="lastMonth"
        compareName="February"
      />
    </pct-chart>
    <p>{{ selectedText() }}</p>
    <pct-chart-table [chart]="chart" summary="sum" />
  `,
})
export class ChartBarsDemo {
  protected readonly thisWeek = thisWeek;
  protected readonly lastMonth = lastMonth;
  protected readonly selected = signal<PctWindow | null>(null);
  protected readonly selectedText = computed(() => {
    const band = this.selected();
    if (!band) return 'Nothing selected.';
    const day = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Warsaw',
    }).format(band.from);
    return `Selected: ${day}`;
  });
}
