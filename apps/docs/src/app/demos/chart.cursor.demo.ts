import { Component, signal } from '@angular/core';
import { PctChart, PctLine } from '@pacit/components/chart';

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

/**
 * A cursor to read
 *
 * Point at the chart, tap it, or press Tab and the arrow keys: the cursor steps from reading to
 * reading and the tooltip writes each series' value under it. The cursor is a model, so the line
 * below reads `reading()` and writes the same values outside the picture — what a legend of the
 * application's own would do.
 */
@Component({
  selector: 'demo-chart-cursor',
  imports: [PctChart, PctLine],
  styles: `
    p {
      min-block-size: 1.5em;
      margin: var(--pct-space-3) 0 0;
      color: var(--pct-text-muted);
    }
  `,
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply and outdoor air on 28 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 240px"
      [(cursor)]="cursor"
    >
      <pct-line [data]="supply" x="at" y="value" name="Supply air" unit="°C" />
      <pct-line [data]="outdoor" x="at" y="value" name="Outdoor" unit="°C" />
    </pct-chart>
    <p>
      @if (chart.reading(); as reading) {
        {{ reading.text }}: {{ reading.rows[0].text }} inside,
        {{ reading.rows[1].text }} outside
      } @else {
        No cursor yet.
      }
    </p>
  `,
})
export class ChartCursorDemo {
  protected readonly supply = supply;
  protected readonly outdoor = outdoor;
  protected readonly cursor = signal<number | null>(null);
}
