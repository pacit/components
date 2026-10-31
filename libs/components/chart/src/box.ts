import {
  Component,
  TemplateRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  isDevMode,
  viewChild,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { pctSeriesColor } from './line';
import {
  pctFirstUnordered,
  pctRead,
  type PctAccessor,
  type PctColumns,
} from './model/columns';
import type { PctDomain } from './model/scale';
import { pctQuantiles, pctSpacing, type PctQuantiles } from './model/stats';
import { pctValueAt } from './model/value-at';
import { pctIndicesIn, type PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctMarkColumn,
  type PctMarkNote,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** A line of a drawn box, in pixels. */
interface PctBoxLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** One box drawn: its rectangle, its median, its whiskers with their caps and its outliers. */
interface PctDrawnBox {
  readonly x: number;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly median: PctBoxLine;
  readonly whiskers: readonly PctBoxLine[];
  readonly outliers: readonly { readonly cx: number; readonly cy: number }[];
}

/** The thinnest and the widest a box is drawn, in pixels. */
const BOX_MIN = 4;
const BOX_MAX = 40;
/** The share of the smallest spacing between boxes a box takes. */
const BOX_SHARE = 0.6;
/** The most outliers a note or a cell lists before counting the rest. */
const OUTLIERS_LISTED = 6;

/**
 * A distribution at each position, drawn as a box
 * ([0106](../../../../docs/decisions/0106-an-area-stands-on-its-stack-and-a-range-is-two-values-at-a-time.md)):
 * the quartiles as its ends, the median as a line across it, whiskers to the farthest values
 * within one and a half interquartile ranges of it, and every value past them as a point of its
 * own (`pctQuantiles`). A day's readings, a batch's measurements, a run's latencies.
 *
 * **The data are the consumer's rows**: `x` names a row's position and `values` its numbers,
 * from which the five of the box are computed once per change. A row with no finite value is a
 * gap. The series' value — for the axis, the cursor's marker, the table's column — is the
 * median; the low, the quartiles, the high and the outliers stand on lines of the tooltip and
 * in columns of the table.
 *
 * @example
 * <pct-box [data]="days" x="at" values="readings" name="Latency" unit="ms" />
 *
 * @since next
 */
@Component({
  selector: 'pct-box',
  templateUrl: './box.html',
  styleUrl: './box.scss',
  providers: [{ provide: PctMark, useExisting: PctBox }],
})
export class PctBox<T> extends PctMark {
  /**
   * The rows, ordered by `x`.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * The position of a row: a key of the row or a function of it.
   *
   * @since next
   */
  readonly x = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * The values of a row: a key of the row or a function of it, giving the numbers the box is
   * computed from; none, or none finite, is a gap.
   *
   * @since next
   */
  readonly values =
    input.required<
      PctAccessor<NoInfer<T>, readonly number[] | null | undefined>
    >();
  /**
   * What the legend, the tooltip and the table call the series.
   *
   * @since next
   */
  readonly name = input.required<string>();
  /**
   * The series' key, stable across changes of data; the name when unset.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The unit of the values, which decides the value axis.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The series' colour: a palette place from 1 to 8, or any CSS colour. Unset, the series
   * takes the next free place.
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });

  private readonly scene = inject(PctChartScene);
  private readonly texts = inject(PCT_TEXTS);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  private readonly key = computed(() => this.id() || this.name());

  /** The rows read: each position with its quantiles, `null` for a row with no values. */
  private readonly boxes = computed(() => {
    const rows = this.data();
    const readX = pctRead(this.x());
    const readValues = pctRead(this.values());
    const xs: number[] = [];
    const quantiles: (PctQuantiles | null)[] = [];
    rows.forEach((row, i) => {
      const at = readX(row, i);
      if (!Number.isFinite(at)) return;
      xs.push(at);
      quantiles.push(pctQuantiles(readValues(row, i) ?? []));
    });
    return { xs: Float64Array.from(xs), quantiles };
  });

  /** One of the five numbers, or the outliers' reach, as columns over the positions. */
  private columnsOf(pick: (q: PctQuantiles) => number): PctColumns {
    const { xs, quantiles } = this.boxes();
    return {
      xs,
      ys: Float64Array.from(quantiles, (q) => (q ? pick(q) : NaN)),
      length: xs.length,
    };
  }
  private readonly medians = computed(() => this.columnsOf((q) => q.median));
  private readonly lows = computed(() => this.columnsOf((q) => q.low));
  private readonly highs = computed(() => this.columnsOf((q) => q.high));
  private readonly q1s = computed(() => this.columnsOf((q) => q.q1));
  private readonly q3s = computed(() => this.columnsOf((q) => q.q3));
  /** The farthest values, outliers included: what the axis has to hold. */
  private readonly least = computed(() =>
    this.columnsOf((q) => Math.min(q.low, ...q.outliers)),
  );
  private readonly most = computed(() =>
    this.columnsOf((q) => Math.max(q.high, ...q.outliers)),
  );

  override readonly series = computed<readonly PctSeriesSpec[]>(() => [
    {
      id: this.key(),
      name: this.name(),
      unit: this.unit(),
      curve: 'step',
      color: this.color(),
      fromZero: false,
    },
  ]);

  override readonly span = computed<PctDomain | null>(() => {
    const { xs } = this.boxes();
    return xs.length === 0 ? null : [xs[0], xs[xs.length - 1]];
  });

  private readonly scales = computed(() => {
    const x = this.scene.xScale();
    const y = this.scene.yScales().get(this.unit());
    return x && y ? { x, y } : null;
  });

  /** The boxes in the window, drawn: their width from their spacing. */
  protected readonly drawn = computed<readonly PctDrawnBox[]>(() => {
    const scales = this.scales();
    const window = this.scene.shown();
    if (!scales || !window) return [];
    const { xs, quantiles } = this.boxes();
    const [lo, hi] = pctIndicesIn(xs, window, 0);
    const horizontal = this.scene.orientation() === 'horizontal';
    const spacing = pctSpacing(xs.subarray(lo, hi), scales.x);
    const width = Math.min(
      BOX_MAX,
      Math.max(BOX_MIN, Math.round(spacing * BOX_SHARE)),
    );
    const half = width / 2;
    const cap = Math.max(1, Math.round(width / 4));
    // A line across the box at a value, or along the whisker between two.
    const across = (along: number, at: number, reach: number): PctBoxLine =>
      horizontal
        ? { x1: at, y1: along - reach, x2: at, y2: along + reach }
        : { x1: along - reach, y1: at, x2: along + reach, y2: at };
    const between = (along: number, a: number, b: number): PctBoxLine =>
      horizontal
        ? { x1: a, y1: along, x2: b, y2: along }
        : { x1: along, y1: a, x2: along, y2: b };
    const boxes: PctDrawnBox[] = [];
    for (let i = lo; i < hi; i++) {
      const q = quantiles[i];
      if (!q) continue;
      const along = Math.round(scales.x.map(xs[i]));
      const y = (v: number) => scales.y.map(v);
      const near = Math.min(y(q.q1), y(q.q3));
      const length = Math.max(1, Math.abs(y(q.q3) - y(q.q1)));
      boxes.push({
        x: xs[i],
        box: horizontal
          ? { x: near, y: along - half, width: length, height: width }
          : { x: along - half, y: near, width, height: length },
        median: across(along, y(q.median), half),
        whiskers: [
          between(along, y(q.q1), y(q.low)),
          across(along, y(q.low), cap),
          between(along, y(q.q3), y(q.high)),
          across(along, y(q.high), cap),
        ],
        outliers: q.outliers.map((v) =>
          horizontal ? { cx: y(v), cy: along } : { cx: along, cy: y(v) },
        ),
      });
    }
    return boxes;
  });

  /**
   * The palette place, or `custom` for a colour of the consumer's own: the stylesheet paints
   * it from a private property, so the rule of forced colours still outranks it.
   */
  protected readonly place = computed(() =>
    typeof this.color() === 'string'
      ? 'custom'
      : (this.scene.places().get(this.key()) ?? 1),
  );
  protected readonly custom = computed(() => {
    const color = this.color();
    return typeof color === 'string' ? color : null;
  });
  protected readonly hidden = computed(() =>
    this.scene.hiddenSeries().includes(this.key()),
  );

  constructor() {
    super();
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnordered());
  }

  /**
   * See `PctMark.extent`: from the lowest value to the highest in the window, the outliers
   * among them.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    if (id !== this.key()) return null;
    const { xs } = this.boxes();
    const [lo, hi] = pctIndicesIn(xs, window, 0);
    let min = Infinity;
    let max = -Infinity;
    const least = this.least().ys;
    const most = this.most().ys;
    for (let i = lo; i < hi; i++) {
      if (Number.isNaN(least[i])) continue;
      min = Math.min(min, least[i]);
      max = Math.max(max, most[i]);
    }
    return min <= max ? [min, max] : null;
  }

  /**
   * See `PctMark.valueAt`: the median of the box at `x`, held until the next.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    return id === this.key() ? this.read(this.medians(), x) : null;
  }

  /**
   * See `PctMark.notesAt`: the box's low, quartiles, high and outliers on lines of their own.
   *
   * @since next
   */
  override notesAt(x: number): readonly PctMarkNote[] {
    if (this.hidden()) return [];
    return this.columns().flatMap((column) => {
      const text = this.textAt(column.id, x);
      return text === null ? [] : [{ id: column.id, name: column.name, text }];
    });
  }

  /**
   * See `PctMark.columns`: the low, the quartiles, the high and the outliers, after the median.
   *
   * @since next
   */
  override readonly columns = computed<readonly PctMarkColumn[]>(() => {
    if (this.hidden()) return [];
    const key = this.key();
    return [
      { id: `${key}:low`, name: this.texts().chartLow },
      { id: `${key}:q1`, name: this.texts().chartQuartile1 },
      { id: `${key}:q3`, name: this.texts().chartQuartile3 },
      { id: `${key}:high`, name: this.texts().chartHigh },
      { id: `${key}:outliers`, name: this.texts().chartOutliers },
    ];
  });

  /**
   * See `PctMark.textAt`: the column's value at `x` with the unit; the outliers listed, the
   * first six and a count of the rest, or a gap where there are none.
   *
   * @since next
   */
  override textAt(id: string, x: number): string | null {
    const key = this.key();
    const unit = this.unit();
    if (id === `${key}:outliers`) {
      const q = this.boxAt(x);
      if (!q || q.outliers.length === 0) return null;
      const listed = q.outliers
        .slice(0, OUTLIERS_LISTED)
        .map((v) => this.scene.writeValue(v, unit));
      const rest = q.outliers.length - listed.length;
      return rest > 0 ? `${listed.join(', ')} +${rest}` : listed.join(', ');
    }
    const columns =
      id === `${key}:low`
        ? this.lows()
        : id === `${key}:q1`
          ? this.q1s()
          : id === `${key}:q3`
            ? this.q3s()
            : id === `${key}:high`
              ? this.highs()
              : null;
    if (!columns) return null;
    const value = this.read(columns, x);
    return value === null ? null : this.scene.writeValue(value, unit);
  }

  /**
   * See `PctMark.rowsIn`: a row per box in the window.
   *
   * @since next
   */
  override rowsIn(id: string, window: PctWindow): readonly number[] | null {
    if (id !== this.key()) return null;
    const { xs } = this.boxes();
    const [lo, hi] = pctIndicesIn(xs, window, 0);
    return [...xs.subarray(lo, hi)];
  }

  /**
   * See `PctMark.readings`: the medians, whose positions are the series' readings.
   *
   * @since next
   */
  override readings(): PctColumns {
    return this.medians();
  }

  /** The box holding at `x`: the last one at or before it. */
  private boxAt(x: number): PctQuantiles | null {
    const { xs, quantiles } = this.boxes();
    let at = -1;
    for (let i = 0; i < xs.length && xs[i] <= x; i++) at = i;
    return at < 0 ? null : quantiles[at];
  }

  private read(columns: PctColumns, x: number): number | null {
    return pctValueAt(columns, x, 'step');
  }

  private warnOnUnordered(): void {
    const at = pctFirstUnordered(this.medians());
    if (at < 0) return;
    console.warn(
      `[pct-box] The rows of "${this.name()}" are not ordered by \`x\`: row ${at} stands ` +
        'before the one ahead of it. A chart reads its rows in order and does not sort them.',
    );
  }
}
