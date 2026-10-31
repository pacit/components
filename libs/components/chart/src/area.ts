import {
  Component,
  TemplateRef,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  isDevMode,
  viewChild,
} from '@angular/core';
import { pctSeriesColor } from './line';
import {
  pctColumnsOf,
  pctFirstUnordered,
  type PctAccessor,
  type PctColumns,
} from './model/columns';
import { pctDecimate, pctPyramid, type PctPyramid } from './model/decimate';
import { pctExtent } from './model/extent';
import { pctAreaPath, pctBandPath, pctLinePath } from './model/path';
import type { PctDomain } from './model/scale';
import { pctValueAt, type PctCurve } from './model/value-at';
import { pctIndicesIn, type PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** The columns of a stacked area: the stack's positions and the series' start and end at each. */
interface PctAreaColumns {
  readonly xs: Float64Array;
  readonly from: Float64Array;
  readonly to: Float64Array;
}

/**
 * A series drawn as an area: alone, from zero to its value; on a `stack`, from the top of the
 * areas under it to its own, so a sum reads as a whole and each part as a layer of it
 * ([0106](../../../../docs/decisions/0106-an-area-stands-on-its-stack-and-a-range-is-two-values-at-a-time.md)).
 * With `normalize`, every layer of the stack is its share of the position's total, in percent,
 * and the picture is a hundred tall everywhere.
 *
 * **The data are the consumer's rows**, read as a line's are (`pct-line`): `x` and `y` name the
 * columns, a `null` is a gap. The areas of one stack stand at every position any of them has a
 * reading at, each read there as it is drawn (`valueAt`), so stacks of unequal series still add
 * up; a gap in one is a zero for the ones above it and a gap for itself.
 *
 * **What is drawn**: an area alone is decimated to the pixel as a line is; a stacked one is
 * drawn at its stack's positions in the window, rounded to the pixel.
 *
 * @example
 * <pct-area [data]="rows" x="at" y="gas" name="Gas" unit="kW" stack="energy" />
 * <pct-area [data]="rows" x="at" y="solar" name="Solar" unit="kW" stack="energy" />
 *
 * @since next
 */
@Component({
  selector: 'pct-area',
  templateUrl: './area.html',
  styleUrl: './area.scss',
  providers: [{ provide: PctMark, useExisting: PctArea }],
})
export class PctArea<T> extends PctMark {
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
   * The value of a row: a key of the row or a function of it; `null` is a gap.
   *
   * @since next
   */
  readonly y = input.required<PctAccessor<NoInfer<T>, number | null>>();
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
   * The unit of the values, which decides the value axis. A normalized area's unit is `%`
   * whatever is set here, and the value in this unit is written beside its share.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * How the readings are joined: `linear`, `monotone`, `step`, `step-before`.
   *
   * @since next
   */
  readonly curve = input<PctCurve>('linear');
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
  /**
   * The stack the area stands on: areas naming one stack stand on each other in the order of
   * their declaration. Unset, the area stands on zero alone.
   *
   * @since next
   */
  readonly stack = input('');
  /**
   * Draws the stack as shares of its total: each layer is its value's share of the position's
   * total, in percent, and the unit is `%`. Set on any member, it holds for the whole stack. An
   * area alone normalized is a hundred everywhere it has a value.
   *
   * @since next
   */
  readonly normalize = input(false, { transform: booleanAttribute });
  /**
   * How far the last reading of a step holds: `now`, for data written when they change.
   *
   * @since next
   */
  readonly end = input<number | null>(null);

  private readonly scene = inject(PctChartScene);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  private readonly key = computed(() => this.id() || this.name());
  /** Whether the series stands in a stack drawn as shares: asked here, or by another member. */
  private readonly normalized = computed(() => {
    const stacked = this.stacked();
    return stacked !== null && this.scene.stackNormalized(stacked.stack);
  });
  /** The unit the series stands in: `%` when normalized. */
  private readonly unitOf = computed(() =>
    this.normalized() ? '%' : this.unit(),
  );

  /** The rows as two columns of numbers. */
  private readonly readingsOf = computed<PctColumns>(() =>
    pctColumnsOf(this.data(), this.x(), this.y()),
  );
  private readonly pyramid = computed(() => pctPyramid(this.readingsOf()));
  private readonly held = computed(() => this.end() ?? undefined);

  override readonly series = computed<readonly PctSeriesSpec[]>(() => [
    {
      id: this.key(),
      name: this.name(),
      unit: this.unitOf(),
      curve: this.curve(),
      color: this.color(),
      fromZero: true,
    },
  ]);

  /**
   * See `PctMark.stacked`: the named stack, or the series' own when it is normalized alone.
   *
   * @since next
   */
  override readonly stacked = computed(() =>
    this.stack() || this.normalize()
      ? { stack: this.stack() || this.key(), normalize: this.normalize() }
      : null,
  );

  override readonly span = computed<PctDomain | null>(() => {
    const { xs, length } = this.readingsOf();
    if (length === 0) return null;
    return [xs[0], Math.max(xs[length - 1], this.held() ?? -Infinity)];
  });

  /** The stack's columns for this series, or `null` for an area alone or one the stack left out. */
  private readonly stackColumns = computed<PctAreaColumns | null>(() => {
    const stacked = this.stacked();
    return stacked ? this.scene.areaStackOf(stacked.stack, this.key()) : null;
  });
  /** The top of the series on its stack, as columns. */
  private readonly tops = computed<PctColumns | null>(() => {
    const columns = this.stackColumns();
    return columns
      ? { xs: columns.xs, ys: columns.to, length: columns.xs.length }
      : null;
  });
  /** The bottom of the series on its stack, as columns. */
  private readonly bottoms = computed<PctColumns | null>(() => {
    const columns = this.stackColumns();
    return columns
      ? { xs: columns.xs, ys: columns.from, length: columns.xs.length }
      : null;
  });
  /** The series' share of its stack at each position, as columns; `null` unless normalized. */
  private readonly shares = computed<PctColumns | null>(() => {
    const columns = this.stackColumns();
    if (!columns || !this.normalized()) return null;
    const ys = columns.to.map((to, i) => to - columns.from[i]);
    return { xs: columns.xs, ys, length: columns.xs.length };
  });

  /** What this frame draws: the readings decimated to the plot's pixels (an area alone). */
  private readonly drawn = computed(() => {
    const window = this.scene.shown();
    if (!window || this.stacked()) return null;
    return pctDecimate(
      this.readingsOf(),
      window,
      this.scene.plotWidth(),
      this.pyramid(),
    );
  });

  /**
   * The stack's columns in the window, with one position beyond each edge so the area reaches
   * the frame; `null` for an area alone.
   */
  private readonly drawnStack = computed<PctAreaColumns | null>(() => {
    const window = this.scene.shown();
    const columns = this.stackColumns();
    if (!window || !columns) return null;
    const [lo, hi] = pctIndicesIn(columns.xs, window);
    return {
      xs: columns.xs.subarray(lo, hi),
      from: columns.from.subarray(lo, hi),
      to: columns.to.subarray(lo, hi),
    };
  });

  private readonly scales = computed(() => {
    const x = this.scene.xScale();
    const y = this.scene.yScales().get(this.unitOf());
    return x && y ? { x, y } : null;
  });

  private readonly options = computed(() => ({
    end: this.held(),
    pixel: this.scene.pixel(),
    transpose: this.scene.orientation() === 'horizontal',
  }));

  /** The area's fill: the band between its bottom and its top on a stack, from zero alone. */
  protected readonly fill = computed(() => {
    const scales = this.scales();
    if (!scales) return '';
    const stack = this.drawnStack();
    if (stack) {
      const tops = { xs: stack.xs, ys: stack.to, length: stack.xs.length };
      return pctBandPath(
        tops,
        stack.from,
        scales.x,
        scales.y,
        this.curve(),
        this.options(),
      );
    }
    const drawn = this.drawn();
    if (!drawn) return '';
    const [low, high] = scales.y.domain;
    return pctAreaPath(
      drawn,
      scales.x,
      scales.y,
      this.curve(),
      Math.min(high, Math.max(low, 0)),
      this.options(),
    );
  });

  /** The area's top edge, drawn as a line so the layer's shape reads where the tints meet. */
  protected readonly edge = computed(() => {
    const scales = this.scales();
    if (!scales) return '';
    const stack = this.drawnStack();
    const top = stack
      ? { xs: stack.xs, ys: stack.to, length: stack.xs.length }
      : this.drawn();
    if (!top) return '';
    return pctLinePath(top, scales.x, scales.y, this.curve(), this.options());
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
   * See `PctMark.extent`: on a stack, the series' top and bottom in the window; alone, its
   * values.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    if (id !== this.key()) return null;
    const tops = this.tops();
    const bottoms = this.bottoms();
    if (!tops || !bottoms) {
      return this.stacked()
        ? null
        : pctExtent(
            this.readingsOf(),
            window,
            this.curve(),
            this.held(),
            this.pyramid(),
          );
    }
    const above = pctExtent(tops, window, this.curve(), this.held());
    const below = pctExtent(bottoms, window, this.curve(), this.held());
    if (!above || !below) return above ?? below;
    return [Math.min(above[0], below[0]), Math.max(above[1], below[1])];
  }

  /**
   * See `PctMark.valueAt`: the value read as the area is drawn; a normalized area's share, in
   * percent.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    if (id !== this.key()) return null;
    if (this.normalized()) {
      const shares = this.shares();
      return shares ? pctValueAt(shares, x, this.curve(), this.held()) : null;
    }
    return pctValueAt(this.readingsOf(), x, this.curve(), this.held());
  }

  /**
   * See `PctMark.drawnAt`: the top of the series on its stack.
   *
   * @since next
   */
  override drawnAt(id: string, x: number): number | null {
    const tops = this.tops();
    return id === this.key() && tops
      ? pctValueAt(tops, x, this.curve(), this.held())
      : null;
  }

  /**
   * See `PctMark.readAt`: a normalized area reads its share and, after it in brackets, its
   * value in the unit the data came in.
   *
   * @since next
   */
  override readAt(id: string, x: number, bare = false): string | null {
    if (id !== this.key() || !this.normalized()) return null;
    const share = this.valueAt(id, x);
    if (share === null) return null;
    const value = this.rowValueAt(id, x);
    return `${this.scene.writeValue(share, bare ? '' : '%')} (${this.scene.writeValue(value, this.unit())})`;
  }

  /**
   * See `PctMark.rowValueAt`: the value of the rows, whatever the stack makes of it.
   *
   * @since next
   */
  override rowValueAt(id: string, x: number): number | null {
    return id === this.key()
      ? pctValueAt(this.readingsOf(), x, this.curve(), this.held())
      : null;
  }

  /**
   * See `PctMark.readings`.
   *
   * @since next
   */
  override readings(): PctColumns {
    return this.readingsOf();
  }
  /**
   * See `PctMark.pyramidOf`.
   *
   * @since next
   */
  override pyramidOf(): PctPyramid {
    return this.pyramid();
  }

  private warnOnUnordered(): void {
    const at = pctFirstUnordered(this.readingsOf());
    if (at < 0) return;
    console.warn(
      `[pct-area] The rows of "${this.name()}" are not ordered by \`x\`: row ${at} stands ` +
        'before the one ahead of it. A chart reads its rows in order and does not sort them.',
    );
  }
}
