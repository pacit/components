import { Component } from '@angular/core';
import {
  PctChart,
  PctChartRamp,
  PctChartTable,
  PctHeat,
} from '@pacit/components/chart';

/** A small deterministic sequence in [0, 1): the same picture on every load. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

/** Two weeks by twenty-four hours of a building's power: a working day's shape, weekends low. */
const power = (() => {
  const random = seeded(41);
  const cells: { day: number; hour: string; kw: number }[] = [];
  for (let d = 0; d < 14; d++) {
    const weekend = d % 7 >= 5;
    for (let h = 0; h < 24; h++) {
      const office = h >= 8 && h <= 18 ? 1 : 0;
      const base = weekend ? 1.2 : 1.5 + office * 3.5;
      cells.push({
        day: Date.UTC(2026, 9, 12 + d, 12),
        hour: `${String(h).padStart(2, '0')}:00`,
        kw: Math.round((base + random() * 0.8) * 10) / 10,
      });
    }
  }
  return cells;
})();

/** Each room against its set point by weekday, one reading missing. */
const deltas = (() => {
  const random = seeded(43);
  return ['Lobby', 'Office', 'Lab', 'Server room'].flatMap((room, r) =>
    Array.from({ length: 7 }, (_, day) => ({
      day,
      room,
      delta:
        room === 'Lab' && day === 3
          ? null
          : Math.round((random() - 0.5 + (r - 1.5) * 0.3) * 20) / 10,
    })),
  );
})();

/**
 * A heatmap and its ramp
 *
 * `pct-heat` draws a value per cell, the rows laid by the chart and the colour mixed by the
 * stylesheet from the skin's ramp; `pct-chart-ramp` shows the ramp with the domain's ends.
 */
@Component({
  selector: 'demo-chart-heat',
  imports: [PctChart, PctHeat, PctChartRamp, PctChartTable],
  styles: `
    pct-chart-ramp,
    pct-chart-table,
    pct-chart + pct-chart {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #heated
      ariaLabel="Power drawn by hour and day, 12 to 25 October 2026"
      timeZone="UTC"
      interval="day"
      style="height: 420px"
    >
      <pct-heat
        [data]="power"
        x="day"
        y="hour"
        value="kw"
        name="Power"
        unit="kW"
      />
    </pct-chart>
    <pct-chart-ramp [chart]="heated" />
    <pct-chart-table [chart]="heated" [rows]="4" />

    <pct-chart
      #diverging
      ariaLabel="Rooms against their set points by weekday"
      x="band"
      [categories]="weekdays"
      style="height: 200px"
    >
      <pct-heat
        [data]="deltas"
        x="day"
        y="room"
        value="delta"
        name="Against set point"
        unit="°C"
        scale="diverging"
        [domain]="[-2, 0, 2]"
        labels
      />
    </pct-chart>
    <pct-chart-ramp [chart]="diverging" />
  `,
})
export class ChartHeatDemo {
  protected readonly power = power;
  protected readonly deltas = deltas;
  protected readonly weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];
}
