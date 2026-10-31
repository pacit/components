import { Component, signal } from '@angular/core';
import {
  PctAxis,
  PctChart,
  PctChartLegend,
  PctChartTable,
  type PctPick,
  PctPoints,
  type PctWindow,
} from '@pacit/components/chart';

interface Day {
  readonly outdoor: number;
  readonly power: number;
}

/** Eighty days of a heat pump: the temperature outside against the power it drew. */
const days: Day[] = Array.from({ length: 80 }, (_, i) => {
  const outdoor = -8 + ((i * 37) % 97) / 4;
  const noise = (((i * 53) % 29) - 14) / 20;
  return {
    outdoor: Math.round(outdoor * 10) / 10,
    power:
      Math.round((Math.max(0.3, 3.2 - outdoor * 0.14) + noise) * 100) / 100,
  };
});

interface Room {
  readonly name: string;
  readonly area: number;
  readonly setpoint: number;
  readonly occupancy: number;
}

const rooms: Room[] = [
  { name: 'Living room', area: 32, setpoint: 21, occupancy: 65 },
  { name: 'Kitchen', area: 14, setpoint: 20, occupancy: 40 },
  { name: 'Bedroom', area: 18, setpoint: 18, occupancy: 45 },
  { name: 'Study', area: 12, setpoint: 21.5, occupancy: 55 },
  { name: 'Bathroom', area: 6, setpoint: 23, occupancy: 10 },
  { name: 'Hall', area: 9, setpoint: 19, occupancy: 20 },
  { name: 'Guest room', area: 15, setpoint: 17, occupancy: 5 },
];

/**
 * Points, bubbles and a zoom on both axes
 *
 * `pct-points` draws a mark per row where its `x` and `y` put it, in any order: the cursor
 * stands on the nearest point, a press on one emits `pick` with its row, and `xUnit` writes
 * the unit of the horizontal axis. With `size` read off the rows the marks are bubbles whose
 * area grows with it, and the size is a column of the table and a row of the tooltip.
 * `zoom="xy"` makes Ctrl with the wheel, a pinch or a drag work the first value axis too,
 * through the `yWindow` model; `0` returns both axes.
 */
@Component({
  selector: 'demo-chart-points',
  imports: [PctChart, PctAxis, PctPoints, PctChartLegend, PctChartTable],
  styles: `
    pct-chart-legend,
    pct-chart-table,
    p {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #heating
      ariaLabel="Power drawn against the temperature outside, eighty days"
      x="linear"
      xUnit="°C"
      zoom="xy"
      [(yWindow)]="yWindow"
      style="height: 260px"
    >
      <pct-axis unit="kW" [floor]="0" />
      <pct-points
        [data]="days"
        x="outdoor"
        y="power"
        name="Power drawn"
        unit="kW"
        (pick)="picked.set($event)"
      />
    </pct-chart>
    <p>{{ pickedText() }}</p>
    <pct-chart-legend [chart]="heating" />

    <pct-chart
      #rooms
      ariaLabel="Each room's setpoint against how often it is used, the bubble its area"
      x="linear"
      xUnit="%"
      style="height: 260px"
    >
      <pct-points
        [data]="roomRows"
        x="occupancy"
        y="setpoint"
        size="area"
        sizeName="Area"
        sizeUnit="m²"
        name="Setpoint"
        unit="°C"
        [color]="4"
      />
    </pct-chart>
    <pct-chart-table [chart]="rooms" />
  `,
})
export class ChartPointsDemo {
  protected readonly days = days;
  protected readonly roomRows = rooms;
  protected readonly yWindow = signal<PctWindow | null>(null);
  protected readonly picked = signal<PctPick<Day> | null>(null);

  protected pickedText(): string {
    const pick = this.picked();
    return pick
      ? `Picked: ${pick.row.outdoor} °C outside, ${pick.row.power} kW drawn.`
      : 'Press a point to pick its day.';
  }
}
