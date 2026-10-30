import { Component, computed, inject, input } from '@angular/core';
import { PCT_TEXTS, pctQuantityFormat } from '@pacit/components/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
  PctTableHeader,
} from '@pacit/components/table';
import type { PctChart } from './chart';
import { pctDecimate } from './model/decimate';

/** One row of the table: a position, and the value of every series there. */
interface PctChartRow {
  readonly x: number;
  readonly label: string;
  readonly values: readonly (number | null)[];
  readonly texts: readonly string[];
}

/**
 * The data of a chart as a table: the alternative a reader walks where the eye reads the
 * picture ([0103](../../../../docs/decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)).
 * It is the platform's `<table>` dressed by `table[pctTable]`, captioned by the chart's
 * name: a column for the position, and one per series shown, its unit in the header.
 *
 * **The rows the picture shows.** Every series is decimated as the picture is, into at most
 * `rows` positions in the window, so the extremes the eye sees are rows a reader can find; a
 * value is the series' value at that position, computed as it is drawn, and a gap is written
 * as a gap, not as a zero.
 *
 * It stands beside the chart, so the application decides where and whether it is open.
 *
 * @example
 * <pct-chart #chart ariaLabel="Supply air"> … </pct-chart>
 * <pct-chart-table [chart]="chart" />
 *
 * @since next
 */
@Component({
  selector: 'pct-chart-table',
  imports: [
    PctTable,
    PctTableCaption,
    PctTableHeader,
    PctTableCell,
    PctTableFrame,
  ],
  templateUrl: './chart-table.html',
  styleUrl: './chart-table.scss',
  host: { class: 'pct-chart-table' },
})
export class PctChartTable {
  /**
   * The chart whose data the table holds.
   *
   * @since next
   */
  readonly chart = input.required<PctChart>();
  /**
   * The table's caption: the chart's `ariaLabel` when unset, which a chart named by
   * `ariaLabelledby` does not have; give the caption then.
   *
   * @since next
   */
  readonly caption = input('');
  /**
   * The most rows the table holds. The extremes of each series stay among them.
   *
   * @since next
   */
  readonly rows = input(200);

  protected readonly texts = inject(PCT_TEXTS);

  protected readonly captionText = computed(
    () => this.caption() || this.chart().ariaLabel(),
  );

  /** The series shown, in the chart's order. */
  protected readonly series = computed(() => {
    const chart = this.chart();
    const hidden = new Set(chart.hiddenSeries());
    return chart.series().filter((s) => !hidden.has(s.id));
  });

  private readonly timeFormat = computed(() => {
    const chart = this.chart();
    return new Intl.DateTimeFormat(chart.effectiveLocale(), {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: chart.timeZone(),
    });
  });

  private readonly numberFormat = computed(() =>
    pctQuantityFormat(this.chart().effectiveLocale(), {
      fractionDigits: [0, 3],
    }),
  );

  /** The positions to write: each series decimated to the rows, merged, in order. */
  protected readonly table = computed<readonly PctChartRow[]>(() => {
    const chart = this.chart();
    const window = chart.shown();
    if (!window) return [];
    const series = this.series();
    const columns = Math.max(1, Math.floor(this.rows() / 4));
    const positions = new Set<number>();
    for (const s of series) {
      const readings = chart.markOf(s.id)?.readings(s.id);
      if (!readings) continue;
      const drawn = pctDecimate(readings, window, columns);
      for (let i = 0; i < drawn.length; i++) {
        const x = drawn.xs[i];
        if (x >= window.from && x <= window.to) positions.add(x);
      }
    }
    const xs = [...positions].sort((a, b) => a - b).slice(0, this.rows());
    const time = chart.x() === 'time';
    return xs.map((x) => {
      const values = series.map((s) => chart.valueAt(s.id, x));
      return {
        x,
        label: time
          ? this.timeFormat().format(x)
          : this.numberFormat().format(x),
        values,
        texts: values.map((v, i) => this.write(v, series[i].unit)),
      };
    });
  });

  /**
   * The table as CSV, for a spreadsheet in the chart's locale: the separator is a semicolon
   * where the locale's decimal mark is a comma, values are written with that mark and no
   * grouping, and a gap is an empty field.
   *
   * @since next
   */
  csv(): string {
    const locale = this.chart().effectiveLocale();
    const decimal =
      new Intl.NumberFormat(locale)
        .formatToParts(1.5)
        .find((p) => p.type === 'decimal')?.value ?? '.';
    const separator = decimal === ',' ? ';' : ',';
    // A field is quoted when it holds the separator, a quote or a line break, and only then.
    const quote = (text: string) =>
      text.includes(separator) || /["\n\r]/.test(text)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    const number = (v: number | null) =>
      v === null ? '' : String(v).replace('.', decimal);
    const head = [
      this.chart().x() === 'time' ? this.texts().chartTime : '',
      ...this.series().map((s) =>
        s.unit && s.unit !== 'boolean' ? `${s.name} (${s.unit})` : s.name,
      ),
    ];
    const lines = [head.map(quote).join(separator)];
    for (const row of this.table()) {
      lines.push([quote(row.label), ...row.values.map(number)].join(separator));
    }
    return lines.join('\r\n');
  }

  private write(value: number | null, unit: string): string {
    if (value === null) return this.texts().chartGap;
    if (unit === 'boolean')
      return value >= 0.5 ? this.texts().chartOn : this.texts().chartOff;
    return this.numberFormat().format(value);
  }
}
