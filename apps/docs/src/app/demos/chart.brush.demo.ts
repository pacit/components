import { Component, signal } from '@angular/core';
import { PctChart, PctLine, type PctWindow } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

/** Supply air every ten minutes through the day: cool at night, warmest after noon. */
const supply = Array.from({ length: 24 * 6 + 1 }, (_, i) => {
  const hours = i / 6;
  return {
    at: START + hours * HOUR,
    value:
      Math.round((20 + 2.5 * Math.sin(((hours - 9) / 24) * 2 * Math.PI)) * 10) /
      10,
  };
});

/**
 * A navigator
 *
 * `brush` turns a drag across the plot into a selection with a grip and a range at each edge.
 * A low chart with a brush, its selection bound to the window of the chart above, is that
 * chart's navigator.
 */
@Component({
  selector: 'demo-chart-brush',
  imports: [PctChart, PctLine],
  styles: `
    section {
      display: grid;
      gap: var(--pct-space-2);
    }
  `,
  template: `
    <section>
      <pct-chart
        ariaLabel="Supply air on 28 October 2026"
        timeZone="Europe/Warsaw"
        style="height: 220px"
        [(window)]="window"
      >
        <pct-line
          [data]="supply"
          x="at"
          y="value"
          name="Supply air"
          unit="°C"
        />
      </pct-chart>
      <pct-chart
        ariaLabel="Supply air on 28 October 2026, the whole day"
        timeZone="Europe/Warsaw"
        style="height: 90px"
        brush
        zoom="none"
        cursorMode="none"
        [(selected)]="window"
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
    </section>
  `,
})
export class ChartBrushDemo {
  protected readonly supply = supply;
  protected readonly window = signal<PctWindow | null>(null);
}
