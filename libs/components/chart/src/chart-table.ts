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
  /** The marks' columns of text at the row: a band's state, or the gap. */
  readonly words: readonly string[];
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
   * The table's caption: the chart's `ariaLabel` when unset. A chart named by
   * `ariaLabelledby` and no caption names its table by the same element.
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
  /**
   * A foot under the rows with the sum or the mean of each series' column, or none: what a
   * table of bars by day says about the month.
   *
   * @since next
   */
  readonly summary = input<'sum' | 'mean' | 'none'>('none');

  protected readonly texts = inject(PCT_TEXTS);

  protected readonly captionText = computed(
    () => this.caption() || this.chart().ariaLabel(),
  );
  /** The element naming the chart, which names the table when it has no caption. */
  protected readonly labelledby = computed(() =>
    this.captionText() ? null : this.chart().ariaLabelledby() || null,
  );
  /** The header of the first column: the time, or the position along a numeric axis. */
  protected readonly positionHeader = computed(() =>
    this.chart().x() === 'time'
      ? this.texts().chartTime
      : this.texts().chartPosition,
  );

  /** The series shown, in the chart's order. */
  protected readonly series = computed(() => {
    const chart = this.chart();
    const hidden = new Set(chart.hiddenSeries());
    return chart.series().filter((s) => !hidden.has(s.id));
  });

  /** The marks' columns of text — a band's states — after the series, with the mark that writes each. */
  protected readonly words = computed(() => {
    const chart = this.chart();
    const hidden = new Set(chart.hiddenSeries());
    return chart.marks().flatMap((mark) =>
      mark
        .columns()
        .filter((c) => !hidden.has(c.id))
        .map((column) => ({ ...column, mark })),
    );
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
    // Each series decimated to its share of the rows: four readings a column at most, so the
    // positions of every series together stay within `rows`.
    const columns = Math.max(
      1,
      Math.floor(this.rows() / (4 * Math.max(1, series.length))),
    );
    const positions = new Set<number>();
    // Bars give their bands' starts as rows, a state band its segments'; a series of readings is
    // decimated into its rows.
    let banded = false;
    const words = this.words();
    for (const s of series) {
      const rows = chart.markOf(s.id)?.rowsIn(s.id, window);
      if (!rows) continue;
      banded = true;
      for (const x of rows) positions.add(x);
    }
    for (const w of words) {
      const rows = w.mark.rowsIn(w.id, window);
      if (!rows) continue;
      banded = true;
      for (const x of rows) positions.add(x);
    }
    // Both edges of the window are rows wherever a series holds a value there, so a window
    // between two readings, or inside a step's hold, still has a row to read.
    if (!banded)
      for (const edge of [window.from, window.to])
        if (series.some((s) => chart.valueAt(s.id, edge) !== null))
          positions.add(edge);
    for (const s of series) {
      const mark = chart.markOf(s.id);
      if (!mark || banded) continue;
      const drawn = pctDecimate(
        mark.readings(s.id),
        window,
        columns,
        mark.pyramidOf(s.id) ?? undefined,
      );
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
        // The mark's own text where a number does not say it (a range's `low – high`).
        texts: values.map(
          (v, i) =>
            chart.markOf(series[i].id)?.readAt(series[i].id, x, true) ??
            this.write(v, series[i].unit),
        ),
        words: words.map(
          (w) => w.mark.textAt(w.id, x) ?? this.texts().chartGap,
        ),
      };
    });
  });

  /** The foot: each column's sum or mean over the rows, written as the cells are. */
  protected readonly foot = computed<{
    readonly label: string;
    readonly texts: readonly string[];
  } | null>(() => {
    const summary = this.summary();
    if (summary === 'none') return null;
    const rows = this.table();
    const texts = this.series().map((s, i) => {
      const values = rows
        .map((r) => r.values[i])
        .filter((v): v is number => v !== null);
      if (values.length === 0) return this.texts().chartGap;
      const sum = values.reduce((a, b) => a + b, 0);
      return this.write(summary === 'sum' ? sum : sum / values.length, s.unit);
    });
    return {
      label: summary === 'sum' ? this.texts().chartSum : this.texts().chartMean,
      texts,
    };
  });

  /**
   * The table as CSV, for a spreadsheet in the chart's locale: the separator is a semicolon
   * where the locale's decimal mark is a comma, numbers are written with that mark (a comma or
   * a point, never another script's), no grouping and fifteen significant digits at most, and
   * a gap is an empty field. A time is written as the table writes it, a position as a number,
   * a column of text as text. A text that a spreadsheet would read as a formula (`=`, `+`, `-`,
   * `@`) is written after a quote mark, as text.
   *
   * @since next
   */
  csv(): string {
    const locale = this.chart().effectiveLocale();
    const decimal =
      new Intl.NumberFormat(locale)
        .formatToParts(1.5)
        .find((p) => p.type === 'decimal')?.value === ','
        ? ','
        : '.';
    const separator = decimal === ',' ? ';' : ',';
    // A field is quoted when it holds the separator, a quote or a line break, and only then.
    const quote = (text: string) =>
      text.includes(separator) || text.includes('"') || /[\n\r]/.test(text)
        ? `"${text.replaceAll('"', '""')}"`
        : text;
    const text = (value: string) =>
      quote(/^[=+\-@\t\r]/.test(value) ? "'" + value : value);
    const number = (v: number | null) =>
      v === null ? '' : String(Number(v.toPrecision(15))).replace('.', decimal);
    const time = this.chart().x() === 'time';
    const gap = this.texts().chartGap;
    const head = [
      this.positionHeader(),
      ...this.series().map((s) =>
        s.unit && s.unit !== 'boolean' ? `${s.name} (${s.unit})` : s.name,
      ),
      ...this.words().map((w) => w.name),
    ];
    const lines = [head.map(text).join(separator)];
    for (const row of this.table()) {
      lines.push(
        [
          time ? text(row.label) : number(row.x),
          ...row.values.map(number),
          ...row.words.map((w) => (w === gap ? '' : text(w))),
        ].join(separator),
      );
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
