import { Component } from '@angular/core';
import {
  PctBars,
  pctBin,
  PctBox,
  PctChart,
  PctChartTable,
  PctLine,
  PctRange,
} from '@pacit/components/chart';

/** A small deterministic sequence in [0, 1): the same picture on every load. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

/** Each day of March 2026: the low and the high outside, and their mean. */
const march = (() => {
  const random = seeded(29);
  return Array.from({ length: 31 }, (_, i) => {
    const trend = 2 + i * 0.25;
    const low = Math.round((trend - 3 - random() * 3) * 10) / 10;
    const high = Math.round((trend + 4 + random() * 4) * 10) / 10;
    return {
      at: Date.UTC(2026, 2, i + 1),
      low,
      high,
      mean: Math.round(((low + high) / 2) * 10) / 10,
    };
  });
})();

/** Thirty sessions of a share: open, high, low and close. */
const sessions = (() => {
  const random = seeded(31);
  let close = 42;
  return Array.from({ length: 30 }, (_, i) => {
    const open = close;
    close = Math.round((open + (random() - 0.48) * 3) * 100) / 100;
    return {
      at: Date.UTC(2026, 8, 1 + i),
      open,
      close,
      high: Math.round((Math.max(open, close) + random() * 1.5) * 100) / 100,
      low: Math.round((Math.min(open, close) - random() * 1.5) * 100) / 100,
    };
  });
})();

/** Each hour's response times: forty a batch, busier in the office hours, a long tail. */
const hourly = (() => {
  const random = seeded(37);
  return Array.from({ length: 24 }, (_, h) => ({
    at: Date.UTC(2026, 9, 25, h),
    times: Array.from({ length: 40 }, () => {
      const base = (35 + random() * 50) * (h >= 9 && h <= 17 ? 1.6 : 1);
      return Math.round(random() < 0.08 ? base + random() * 300 : base);
    }),
  }));
})();

/** Four hundred response times binned by Sturges' rule: a histogram on bars. */
const bins = pctBin(hourly.flatMap((h) => h.times).slice(0, 400));

/**
 * A range, candles, boxes and a histogram
 *
 * `pct-range` draws a band from a `low` to a `high` at each position and reads both as
 * `low – high`; with an `open` and a `close` too it draws candles, rising in the skin's
 * `rise` colour and falling in its `fall`, the open, high and low on lines of the tooltip
 * and in columns of the table. `pct-box` draws each row's `values` as a box: the quartiles,
 * the median, whiskers within one and a half interquartile ranges, and the outliers as
 * points. A histogram is `pctBin` feeding the categories of a band axis and `pct-bars`.
 */
@Component({
  selector: 'demo-chart-ranges',
  imports: [PctChart, PctRange, PctLine, PctBox, PctBars, PctChartTable],
  styles: `
    pct-chart-table,
    pct-chart + pct-chart {
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <pct-chart
      ariaLabel="Temperatures outside in March 2026"
      timeZone="Europe/Warsaw"
      style="height: 220px"
    >
      <pct-range
        [data]="march"
        x="at"
        low="low"
        high="high"
        name="Day's range"
        unit="°C"
        curve="monotone"
      />
      <pct-line
        [data]="march"
        x="at"
        y="mean"
        name="Mean"
        unit="°C"
        curve="monotone"
        color="2"
      />
    </pct-chart>

    <pct-chart
      #candles
      ariaLabel="PCT share in September 2026"
      timeZone="Europe/Warsaw"
      style="height: 220px"
    >
      <pct-range
        [data]="sessions"
        x="at"
        low="low"
        high="high"
        open="open"
        close="close"
        name="PCT"
        unit="€"
      />
    </pct-chart>
    <pct-chart-table [chart]="candles" [rows]="5" />

    <pct-chart
      ariaLabel="Response times by hour on 25 October 2026"
      timeZone="Europe/Warsaw"
      style="height: 240px"
    >
      <pct-box
        [data]="hourly"
        x="at"
        values="times"
        name="Response time"
        unit="ms"
      />
    </pct-chart>

    <pct-chart
      ariaLabel="Response times by bin"
      x="band"
      [categories]="binLabels"
      style="height: 200px"
    >
      <pct-bars [data]="binRows" x="bin" y="count" name="Requests" />
    </pct-chart>
  `,
})
export class ChartRangesDemo {
  protected readonly march = march;
  protected readonly sessions = sessions;
  protected readonly hourly = hourly;
  protected readonly binLabels = bins.map((b) => `${b.from}–${b.to} ms`);
  protected readonly binRows = bins.map((b, i) => ({ bin: i, count: b.count }));
}
