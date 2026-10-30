import { Component, computed, signal } from '@angular/core';
import {
  PctBars,
  PctChart,
  PctChartTable,
  type PctWindow,
} from '@pacit/components/chart';

/** Midnight in Warsaw on each day of March 2026 (winter time until the 29th). */
const day = (d: number) => Date.UTC(2026, 2, d - 1, d <= 29 ? 23 : 22);
const february = (d: number) => Date.UTC(2026, 1, d - 1, 23);

const march = [
  11.2, 12.8, 9.4, 14.1, 13.3, 10.7, 8.9, 12.2, 15.6, 13.9, 11.8, 10.1, 9.7,
  12.5, 14.8, 13.1, 11.4, 10.9, 9.2, 8.6, 10.4, 11.9, 12.7, 9.8, 8.3, 7.9, 9.1,
  10.6, 8.8, 7.4, 6.9,
].map((energy, i) => ({ at: day(i + 1), energy }));
const lastMonth = [
  14.2, 15.1, 13.8, 16.4, 15.9, 14.7, 13.2, 15.8, 17.1, 16.3, 14.9, 13.6, 12.8,
  14.4, 16.2, 15.7, 14.1, 13.3, 12.6, 11.9, 13.5, 14.8, 15.3, 12.9, 11.4, 10.8,
  12.2, 13.1,
].map((energy, i) => ({ at: february(i + 1), energy }));

/**
 * Bars by day, compared with the month before
 *
 * A bar per calendar day of Warsaw, and February laid beside March by position: the first of
 * February next to the first of March, twenty-eight bars beside thirty-one. Press a bar to
 * select its day, or put the cursor on it and press Enter; the table under the picture has a
 * row per day and the month's sum in its foot.
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
      ariaLabel="Heat pump energy by day, March 2026"
      timeZone="Europe/Warsaw"
      interval="day"
      style="height: 260px"
      [(selected)]="selected"
    >
      <pct-bars
        [data]="march"
        x="at"
        y="energy"
        name="March"
        unit="kWh"
        [compare]="lastMonth"
        compareName="February"
      />
    </pct-chart>
    <p>{{ selectedText() }}</p>
    <pct-chart-table [chart]="chart" summary="sum" [rows]="31" />
  `,
})
export class ChartBarsDemo {
  protected readonly march = march;
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
