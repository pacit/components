import { Component } from '@angular/core';
import {
  PctArea,
  PctChart,
  PctChartLegend,
  PctLine,
} from '@pacit/components/chart';

interface Quarter {
  readonly at: number;
  readonly gas: number | null;
  readonly pump: number;
  readonly solar: number;
}

const START = Date.UTC(2026, 9, 24, 22);
const QUARTER = 15 * 60_000;

/** A day's power by source, every quarter of an hour; the boiler's meter was offline for an hour. */
const quarters: Quarter[] = Array.from({ length: 97 }, (_, i) => {
  const hours = (i / 4 + 22) % 24;
  const sun = Math.max(0, Math.sin(((hours - 6) / 12) * Math.PI));
  const cold = 1 + 0.5 * Math.cos(((hours - 4) / 24) * 2 * Math.PI);
  const wobble = ((i * 29) % 17) / 40;
  return {
    at: START + i * QUARTER,
    gas:
      hours >= 14 && hours < 15
        ? null
        : Math.round((1.2 * cold + wobble) * 100) / 100,
    pump: Math.round((0.8 * cold + wobble / 2) * 100) / 100,
    solar: Math.round(sun * (2.4 + wobble) * 100) / 100,
  };
});

/** The charge of a battery over forty minutes: a curve the eye wants smooth. */
const charge = Array.from({ length: 17 }, (_, i) => ({
  at: i * 2.5,
  value: Math.round(100 * (1 - Math.exp(-i / 5)) * 10) / 10,
}));

/**
 * Stacked areas
 *
 * `stack` piles areas on each other, `normalize` shows them as shares, and `curve="monotone"` smooths the line without overshooting.
 */
@Component({
  selector: 'demo-chart-areas',
  imports: [PctChart, PctArea, PctLine, PctChartLegend],
  styles: `
    pct-chart-legend,
    pct-chart + pct-chart {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      #stacked
      ariaLabel="Power by source on 25 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 260px"
    >
      <pct-area
        [data]="quarters"
        x="at"
        y="gas"
        name="Gas boiler"
        unit="kW"
        stack="power"
        curve="monotone"
      />
      <pct-area
        [data]="quarters"
        x="at"
        y="pump"
        name="Heat pump"
        unit="kW"
        stack="power"
        curve="monotone"
      />
      <pct-area
        [data]="quarters"
        x="at"
        y="solar"
        name="Solar"
        unit="kW"
        stack="power"
        curve="monotone"
      />
    </pct-chart>
    <pct-chart-legend [chart]="stacked" />

    <pct-chart
      ariaLabel="Share of the power by source on 25 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 220px"
    >
      <pct-area
        [data]="quarters"
        x="at"
        y="gas"
        name="Gas boiler"
        unit="kW"
        stack="share"
        normalize
      />
      <pct-area
        [data]="quarters"
        x="at"
        y="pump"
        name="Heat pump"
        unit="kW"
        stack="share"
      />
      <pct-area
        [data]="quarters"
        x="at"
        y="solar"
        name="Solar"
        unit="kW"
        stack="share"
      />
    </pct-chart>

    <pct-chart
      ariaLabel="State of charge against minutes"
      x="linear"
      xUnit="min"
      style="height: 200px"
    >
      <pct-line
        [data]="charge"
        x="at"
        y="value"
        name="Charge"
        unit="%"
        curve="monotone"
        area
      />
    </pct-chart>
  `,
})
export class ChartAreasDemo {
  protected readonly quarters = quarters;
  protected readonly charge = charge;
}
