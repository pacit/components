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
  pctColumnsOf,
  pctFirstUnordered,
  type PctAccessor,
  type PctColumns,
} from './model/columns';
import { pctExtent } from './model/extent';
import { pctBandPath } from './model/path';
import type { PctDomain } from './model/scale';
import { pctSpacing } from './model/stats';
import { pctValueAt, type PctCurve } from './model/value-at';
import { pctIndicesIn, type PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctMarkColumn,
  type PctMarkNote,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** One candle drawn: its wick from low to high and its body from open to close, in pixels. */
interface PctCandle {
  readonly x: number;
  readonly wick: {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  };
  readonly body: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /** Closed at or above its open. */
  readonly rise: boolean;
}

/** The thinnest and the widest a candle's body is drawn, in pixels. */
const BODY_MIN = 2;
const BODY_MAX = 24;
/** The share of the smallest spacing between candles a body takes. */
const BODY_SHARE = 0.6;

/**
 * A series of two values at a time
 * ([0106](../../../../docs/decisions/0106-an-area-stands-on-its-stack-and-a-range-is-two-values-at-a-time.md)):
 * a `low` and a `high` drawn as a band between them — the day's temperatures, a forecast's
 * spread, the bounds of a measurement — and, with an `open` and a `close` too, candles: a wick
 * from the low to the high and a body from the open to the close, in the skin's rise colour
 * where the close stands at or above the open and its fall colour where it stands under.
 *
 * **The data are the consumer's rows**, read as a line's are: `x` names the position, each of
 * the values its column; a row with a gap in either of a pair is a gap. The tooltip and the
 * table read a band as `low – high` and a candle as its close, with its open, high and low on
 * lines and in columns of their own. The series' value, for the axis and the cursor's marker,
 * is the high of a band and the close of a candle.
 *
 * @example
 * <pct-range [data]="days" x="at" low="min" high="max" name="Temperature" unit="°C" />
 * <pct-range [data]="days" x="at" low="l" high="h" open="o" close="c" name="PCT" unit="€" />
 *
 * @since next
 */
@Component({
  selector: 'pct-range',
  templateUrl: './range.html',
  styleUrl: './range.scss',
  providers: [{ provide: PctMark, useExisting: PctRange }],
})
export class PctRange<T> extends PctMark {
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
   * The low of a row: a key of the row or a function of it; `null` is a gap.
   *
   * @since next
   */
  readonly low = input.required<PctAccessor<NoInfer<T>, number | null>>();
  /**
   * The high of a row: a key of the row or a function of it; `null` is a gap.
   *
   * @since next
   */
  readonly high = input.required<PctAccessor<NoInfer<T>, number | null>>();
  /**
   * The open of a row, which with `close` turns the band into candles.
   *
   * @since next
   */
  readonly open = input<PctAccessor<NoInfer<T>, number | null> | null>(null);
  /**
   * The close of a row, which with `open` turns the band into candles.
   *
   * @since next
   */
  readonly close = input<PctAccessor<NoInfer<T>, number | null> | null>(null);
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
   * How a band's edges are joined: `linear`, `monotone`, `step`, `step-before`. Candles hold
   * each reading until the next whatever is set here.
   *
   * @since next
   */
  readonly curve = input<PctCurve>('linear');
  /**
   * The series' colour: a palette place from 1 to 8, or any CSS colour. Unset, the series
   * takes the next free place. A candle's body is the skin's rise or fall colour whatever the
   * series' own.
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });
  /**
   * How far the last reading of a stepped band holds: `now`, for data written when they change.
   *
   * @since next
   */
  readonly end = input<number | null>(null);

  private readonly scene = inject(PctChartScene);
  private readonly texts = inject(PCT_TEXTS);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  private readonly key = computed(() => this.id() || this.name());
  private readonly held = computed(() => this.end() ?? undefined);
  /** Candles, when both the open and the close are named. */
  protected readonly candles = computed(
    () => this.open() !== null && this.close() !== null,
  );
  /** How the values are read at a position: a candle holds, a band follows its curve. */
  private readonly curveOf = computed<PctCurve>(() =>
    this.candles() ? 'step' : this.curve(),
  );

  /** The rows' columns: the lows and the highs, a gap in either a gap in both. */
  private readonly pair = computed(() => {
    const lows = pctColumnsOf(this.data(), this.x(), this.low());
    const highs = pctColumnsOf(this.data(), this.x(), this.high());
    return mask(lows, highs);
  });
  private readonly lows = computed(() => this.pair().a);
  private readonly highs = computed(() => this.pair().b);
  /** The opens and the closes, masked with each other; empty columns for a band. */
  private readonly ends = computed(() => {
    const open = this.open();
    const close = this.close();
    if (open === null || close === null) return null;
    return mask(
      pctColumnsOf(this.data(), this.x(), open),
      pctColumnsOf(this.data(), this.x(), close),
    );
  });
  private readonly opens = computed(() => this.ends()?.a ?? null);
  private readonly closes = computed(() => this.ends()?.b ?? null);

  override readonly series = computed<readonly PctSeriesSpec[]>(() => [
    {
      id: this.key(),
      name: this.name(),
      unit: this.unit(),
      curve: this.curveOf(),
      color: this.color(),
      fromZero: false,
    },
  ]);

  override readonly span = computed<PctDomain | null>(() => {
    const { xs, length } = this.highs();
    if (length === 0) return null;
    return [xs[0], Math.max(xs[length - 1], this.held() ?? -Infinity)];
  });

  private readonly scales = computed(() => {
    const x = this.scene.xScale();
    const y = this.scene.yScales().get(this.unit());
    return x && y ? { x, y } : null;
  });
  private readonly horizontal = computed(
    () => this.scene.orientation() === 'horizontal',
  );

  /** The indices of the rows drawn: the window's, and one beyond each edge. */
  private readonly drawn = computed(() => {
    const window = this.scene.shown();
    if (!window) return null;
    return pctIndicesIn(this.highs().xs, window);
  });

  /** The band's path between the lows and the highs. */
  protected readonly bandPath = computed(() => {
    const scales = this.scales();
    const drawn = this.drawn();
    if (!scales || !drawn || this.candles()) return '';
    const [lo, hi] = drawn;
    const highs = this.highs();
    const tops = {
      xs: highs.xs.subarray(lo, hi),
      ys: highs.ys.subarray(lo, hi),
      length: hi - lo,
    };
    return pctBandPath(
      tops,
      this.lows().ys.subarray(lo, hi),
      scales.x,
      scales.y,
      this.curve(),
      {
        end: this.held(),
        pixel: this.scene.pixel(),
        transpose: this.horizontal(),
      },
    );
  });

  /** The candles in the window: a wick and a body each, the body's width from their spacing. */
  protected readonly drawnCandles = computed<readonly PctCandle[]>(() => {
    const scales = this.scales();
    const drawn = this.drawn();
    const opens = this.opens();
    const closes = this.closes();
    if (!scales || !drawn || !opens || !closes) return [];
    const [lo, hi] = drawn;
    const { xs, ys: highs } = this.highs();
    const lows = this.lows().ys;
    const horizontal = this.horizontal();
    const spacing = pctSpacing(xs.subarray(lo, hi), scales.x);
    const width = Math.min(
      BODY_MAX,
      Math.max(BODY_MIN, Math.round(spacing * BODY_SHARE)),
    );
    const candles: PctCandle[] = [];
    for (let i = lo; i < hi; i++) {
      const open = opens.ys[i];
      const close = closes.ys[i];
      if (Number.isNaN(highs[i]) || Number.isNaN(open) || Number.isNaN(close))
        continue;
      const along = Math.round(scales.x.map(xs[i]));
      const top = scales.y.map(highs[i]);
      const bottom = scales.y.map(lows[i]);
      const a = scales.y.map(open);
      const b = scales.y.map(close);
      const near = Math.min(a, b);
      const length = Math.max(1, Math.abs(a - b));
      candles.push({
        x: xs[i],
        wick: horizontal
          ? { x1: top, y1: along, x2: bottom, y2: along }
          : { x1: along, y1: top, x2: along, y2: bottom },
        body: horizontal
          ? { x: near, y: along - width / 2, width: length, height: width }
          : { x: along - width / 2, y: near, width, height: length },
        rise: close >= open,
      });
    }
    return candles;
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
   * See `PctMark.extent`: from the lowest low to the highest high in the window.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    if (id !== this.key()) return null;
    const curve = this.curveOf();
    const low = pctExtent(this.lows(), window, curve, this.held());
    const high = pctExtent(this.highs(), window, curve, this.held());
    if (!low || !high) return low ?? high;
    return [Math.min(low[0], high[0]), Math.max(low[1], high[1])];
  }

  /**
   * See `PctMark.valueAt`: a band's high, a candle's close.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    if (id !== this.key()) return null;
    return pctValueAt(
      this.closes() ?? this.highs(),
      x,
      this.curveOf(),
      this.held(),
    );
  }

  /**
   * See `PctMark.readAt`: a band reads `low – high`, bare in a cell; a candle reads its close,
   * as a number.
   *
   * @since next
   */
  override readAt(id: string, x: number, bare = false): string | null {
    if (id !== this.key() || this.candles()) return null;
    const low = this.read(this.lows(), x);
    const high = this.read(this.highs(), x);
    if (low === null || high === null) return null;
    const unit = bare ? '' : this.unit();
    return `${this.scene.writeValue(low, unit)} – ${this.scene.writeValue(high, unit)}`;
  }

  /**
   * See `PctMark.notesAt`: a candle's open, high and low on lines of their own.
   *
   * @since next
   */
  override notesAt(x: number): readonly PctMarkNote[] {
    if (!this.candles() || this.hidden()) return [];
    return this.columns().flatMap((column) => {
      const text = this.textAt(column.id, x);
      return text === null ? [] : [{ id: column.id, name: column.name, text }];
    });
  }

  /**
   * See `PctMark.columns`: a candle's open, high and low, after the series' close.
   *
   * @since next
   */
  override readonly columns = computed<readonly PctMarkColumn[]>(() => {
    if (!this.candles() || this.hidden()) return [];
    const key = this.key();
    return [
      { id: `${key}:open`, name: this.texts().chartOpen },
      { id: `${key}:high`, name: this.texts().chartHigh },
      { id: `${key}:low`, name: this.texts().chartLow },
    ];
  });

  /**
   * See `PctMark.textAt`: the column's value at `x`, written with the unit.
   *
   * @since next
   */
  override textAt(id: string, x: number): string | null {
    const key = this.key();
    const columns =
      id === `${key}:open`
        ? this.opens()
        : id === `${key}:high`
          ? this.highs()
          : id === `${key}:low`
            ? this.lows()
            : null;
    if (!columns) return null;
    const value = this.read(columns, x);
    return value === null ? null : this.scene.writeValue(value, this.unit());
  }

  /**
   * See `PctMark.rowsIn`: a row per candle in the window; a band is decimated like a line.
   *
   * @since next
   */
  override rowsIn(id: string, window: PctWindow): readonly number[] | null {
    if (id !== this.key() || !this.candles()) return null;
    const { xs } = this.highs();
    const [lo, hi] = pctIndicesIn(xs, window, 0);
    return [...xs.subarray(lo, hi)];
  }

  /**
   * See `PctMark.readings`: the highs, whose positions are the series' readings.
   *
   * @since next
   */
  override readings(): PctColumns {
    return this.highs();
  }

  private read(columns: PctColumns, x: number): number | null {
    return pctValueAt(columns, x, this.curveOf(), this.held());
  }

  private warnOnUnordered(): void {
    const at = pctFirstUnordered(this.highs());
    if (at < 0) return;
    console.warn(
      `[pct-range] The rows of "${this.name()}" are not ordered by \`x\`: row ${at} stands ` +
        'before the one ahead of it. A chart reads its rows in order and does not sort them.',
    );
  }
}

/** Two columns of one set of rows, a gap in either made a gap in both. */
function mask(
  a: PctColumns,
  b: PctColumns,
): { readonly a: PctColumns; readonly b: PctColumns } {
  const ya = Float64Array.from(a.ys);
  const yb = Float64Array.from(b.ys);
  for (let i = 0; i < a.length; i++) {
    if (Number.isNaN(ya[i]) || Number.isNaN(yb[i])) {
      ya[i] = NaN;
      yb[i] = NaN;
    }
  }
  return {
    a: { xs: a.xs, ys: ya, length: a.length },
    b: { xs: a.xs, ys: yb, length: a.length },
  };
}
