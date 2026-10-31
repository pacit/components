import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import type { PctPick } from './bars';
import { pctSeriesColor } from './line';
import type { PctAccessor, PctColumns } from './model/columns';
import {
  pctLargestSize,
  pctNearestPoint,
  pctPointAt,
  pctPointRadius,
  pctPointsIn,
  pctPointsOf,
  pctThinPoints,
} from './model/points';
import type { PctDomain } from './model/scale';
import type { PctWindow } from './model/window';
import {
  PCT_SERIES_MARKERS,
  PctChartScene,
  PctMark,
  type PctMarkColumn,
  type PctMarkNote,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** One point as drawn: where its centre stands in the layer, how wide it is, which point it is. */
interface PctDrawnPoint {
  /**
   * The index of the point in the ordered set.
   *
   * @since next
   */
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** A cell of the thinning grid, in pixels: two points closer than this draw one mark. */
const CELL = 2;
/** The radius under which no bubble goes, so a size of none or zero is still a point. */
const LEAST = 2;
/** How far from a point's edge a press still picks it. */
const REACH = 2;
/** The marker shapes are drawn in a box of twelve: the radius they are drawn at. */
const SHAPE = 6;

/**
 * A series of points on a chart — a scatter, or bubbles when `size` is read: each row a mark
 * at its `x` and `y`, the series' marker shape in the series' colour
 * ([0105](../../../../../docs/decisions/0105-a-point-is-picked-by-distance-and-the-y-window-is-the-first-axiss.md)).
 * No ARIA pattern covers a chart; the WAI tutorial "Complex images" does, and the scene
 * (`pct-chart`) implements it for every mark.
 *
 * **Rows in any order.** A scatter's rows have no order of their own, so the points are sorted
 * by `x` here; a row whose `x` or `y` is not a finite number is no point.
 *
 * **Bubbles.** `size` reads a number off each row and the mark's AREA grows with it: the
 * largest size draws the `maxRadius`, the rest the radius whose area is in proportion, and
 * none under two pixels. The size is a column of its own in the tooltip and the table, named
 * by `sizeName` (`chartSize` by default) and written with `sizeUnit`.
 *
 * **Thinned to the pixel.** Two points closer than two pixels draw one mark, and a bubble
 * wider than that is never dropped; fifty thousand rows draw at most a mark per four pixels.
 *
 * **The cursor stands on a point.** The scene puts the cursor on the point nearest to the
 * pointer, and a press on a point emits `pick` with its row.
 *
 * @since next
 */
@Component({
  selector: 'pct-points',
  templateUrl: './points.html',
  styleUrl: './points.scss',
  providers: [{ provide: PctMark, useExisting: PctPoints }],
})
export class PctPoints<T> extends PctMark {
  /**
   * The rows, in any order.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * Where a row stands on the horizontal axis: a key of the row or a function of it.
   *
   * @since next
   */
  readonly x = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * A row's value; a value that is not a finite number is no point.
   *
   * @since next
   */
  readonly y =
    input.required<PctAccessor<NoInfer<T>, number | null | undefined>>();
  /**
   * The series' name: the legend's entry, the tooltip's row, the reader's sentence.
   *
   * @since next
   */
  readonly name = input.required<string>();
  /**
   * The series' id, where two series share a name; the name otherwise.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The unit of `y`, which picks the axis; `''` is a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * A palette place from 1 to 8, or a CSS colour of the consumer's own (0102).
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });
  /**
   * A row's size, for bubbles: the mark's area grows with it. Unset, every point is `radius` wide.
   *
   * @since next
   */
  readonly size = input<
    PctAccessor<NoInfer<T>, number | null | undefined> | undefined
  >(undefined);
  /**
   * The name of the size in the tooltip and the table; `chartSize` when empty.
   *
   * @since next
   */
  readonly sizeName = input('');
  /**
   * The unit the size is written with.
   *
   * @since next
   */
  readonly sizeUnit = input('');
  /**
   * The radius of a point in pixels, when `size` is not read.
   *
   * @since next
   */
  readonly radius = input(4);
  /**
   * The radius of the largest bubble in pixels, when `size` is read.
   *
   * @since next
   */
  readonly maxRadius = input(16);
  /**
   * Hollow marks: the series' colour as an outline, for points that overlap.
   *
   * @since next
   */
  readonly hollow = input(false, { transform: booleanAttribute });
  /**
   * A press on a point: the series, the point's index in the ordered set, its row, its `x` and `y`.
   *
   * @since next
   */
  readonly pick = output<PctPick<T>>();

  private readonly scene = inject(PctChartScene);
  private readonly texts = inject(PCT_TEXTS);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  /** The marker shape of a palette place, the first one for a consumer's own colour (0102). */
  protected markerOf(place: number | 'custom'): string {
    return PCT_SERIES_MARKERS[
      place === 'custom' ? 0 : (place - 1) % PCT_SERIES_MARKERS.length
    ];
  }

  private readonly key = computed(() => this.id() || this.name());
  private readonly sizeKey = computed(() => `${this.key()}:size`);
  protected readonly sized = computed(() => this.size() !== undefined);

  private readonly points = computed(() =>
    pctPointsOf(this.data(), this.x(), this.y(), this.size()),
  );
  private readonly largest = computed(() => pctLargestSize(this.points()));

  /** @since next */
  override readonly series = computed<readonly PctSeriesSpec[]>(() => [
    {
      id: this.key(),
      name: this.name(),
      unit: this.unit(),
      curve: 'linear',
      color: this.color(),
      fromZero: false,
    },
  ]);

  /** @since next */
  override readonly span = computed<PctDomain | null>(() => {
    const { xs, length } = this.points();
    return length === 0 ? null : [xs[0], xs[length - 1]];
  });

  private readonly scales = computed(() => {
    const x = this.scene.xScale();
    const y = this.scene.yScales().get(this.unit());
    return x && y ? { x, y } : null;
  });

  protected readonly place = computed(() =>
    typeof this.color() === 'string'
      ? 'custom'
      : (this.scene.places().get(this.key()) ?? 1),
  );

  protected readonly custom = computed(() => {
    const color = this.color();
    return typeof color === 'string' ? color : null;
  });

  protected readonly shape = computed(() => this.markerOf(this.place()));

  protected readonly hidden = computed(() =>
    this.scene.hiddenSeries().includes(this.key()),
  );

  /**
   * The points in the window, placed, thinned to the grid. The positions are kept as columns
   * beside the marks, for the nearest-point search a pointer asks for on every move.
   */
  protected readonly drawn = computed<{
    readonly marks: readonly PctDrawnPoint[];
    readonly xs: Float64Array;
    readonly ys: Float64Array;
  }>(() => {
    const none = {
      marks: [],
      xs: new Float64Array(0),
      ys: new Float64Array(0),
    };
    const window = this.scene.shown();
    const scales = this.scales();
    if (this.hidden() || !window || !scales) return none;
    const points = this.points();
    const [start, end] = pctPointsIn(points, window);
    const horizontal = this.scene.orientation() === 'horizontal';
    const sized = this.sized();
    const largest = this.largest();
    const indices: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const radii: number[] = [];
    for (let i = start; i < end; i++) {
      const along = scales.x.map(points.xs[i]);
      const across = scales.y.map(points.ys[i]);
      if (!Number.isFinite(across)) continue;
      indices.push(i);
      xs.push(horizontal ? across : along);
      ys.push(horizontal ? along : across);
      radii.push(
        sized
          ? pctPointRadius(points.sizes[i], largest, this.maxRadius(), LEAST)
          : this.radius(),
      );
    }
    // A plain point is thinned whatever its radius; a bubble wider than a cell is kept.
    const kept = pctThinPoints(xs, ys, radii, CELL, sized ? CELL : Infinity);
    const marks: PctDrawnPoint[] = [];
    const keptX = new Float64Array(kept.length);
    const keptY = new Float64Array(kept.length);
    kept.forEach((k, j) => {
      marks.push({ index: indices[k], x: xs[k], y: ys[k], r: radii[k] });
      keptX[j] = xs[k];
      keptY[j] = ys[k];
    });
    return { marks, xs: keptX, ys: keptY };
  });

  /** The transform that puts a shape drawn in its box of twelve at a point, `r` wide. */
  protected placing(point: PctDrawnPoint): string {
    const scale = point.r / SHAPE;
    return `translate(${point.x - point.r} ${point.y - point.r}) scale(${scale})`;
  }

  /**
   * The lowest and highest value of the points in the window, for the axis's domain.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    if (id !== this.key()) return null;
    const points = this.points();
    const [start, end] = pctPointsIn(points, window);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = start; i < end; i++) {
      lo = Math.min(lo, points.ys[i]);
      hi = Math.max(hi, points.ys[i]);
    }
    return lo <= hi ? [lo, hi] : null;
  }

  /**
   * The value of the point AT `x` — the cursor stands on points — and none between them.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    if (id !== this.key()) return null;
    const at = pctPointAt(this.points(), x);
    return at < 0 ? null : this.points().ys[at];
  }

  /**
   * The points as columns — the sizes as the values when the size column is asked for.
   *
   * @since next
   */
  override readings(id: string): PctColumns {
    const points = this.points();
    return id === this.sizeKey() ? { ...points, ys: points.sizes } : points;
  }

  /**
   * The size, as a column of words beside the series, while `size` is read and the series shown.
   *
   * @since next
   */
  override readonly columns = computed<readonly PctMarkColumn[]>(() =>
    this.sized() && !this.hidden()
      ? [
          {
            id: this.sizeKey(),
            name: this.sizeName() || this.texts().chartSize,
          },
        ]
      : [],
  );

  /**
   * The size of the point AT `x`, written with `sizeUnit`, for the size column of the table.
   *
   * @since next
   */
  override textAt(id: string, x: number): string | null {
    if (id !== this.sizeKey() || !this.sized()) return null;
    const at = pctPointAt(this.points(), x);
    if (at < 0) return null;
    const size = this.points().sizes[at];
    return this.scene.writeValue(
      Number.isFinite(size) ? size : null,
      this.sizeUnit(),
    );
  }

  /**
   * The size of the point under the cursor, as a row of the tooltip under the series' own.
   *
   * @since next
   */
  override notesAt(x: number): readonly PctMarkNote[] {
    const text = this.textAt(this.sizeKey(), x);
    if (text === null || this.hidden()) return [];
    return [
      {
        id: this.sizeKey(),
        name: this.sizeName() || this.texts().chartSize,
        text,
      },
    ];
  }

  /**
   * The drawn point nearest to a pixel, and how far it stands.
   *
   * @since next
   */
  override nearAt(
    x: number,
    y: number,
  ): { readonly at: number; readonly distance: number } | null {
    const { marks, xs, ys } = this.drawn();
    const nearest = pctNearestPoint(xs, ys, x, y);
    if (!nearest) return null;
    return {
      at: this.points().xs[marks[nearest.index].index],
      distance: nearest.distance,
    };
  }

  /**
   * A press within a point's reach picks it: `pick` with its row, and `true`.
   *
   * @since next
   */
  override pickAt(id: string, x: number, y: number): boolean {
    if (id !== this.key()) return false;
    const { marks, xs, ys } = this.drawn();
    const nearest = pctNearestPoint(xs, ys, x, y);
    if (!nearest) return false;
    const mark = marks[nearest.index];
    if (nearest.distance > mark.r + REACH) return false;
    const points = this.points();
    this.pick.emit({
      series: this.key(),
      index: mark.index,
      row: this.data()[points.rows[mark.index]],
      x: points.xs[mark.index],
      y: points.ys[mark.index],
    });
    return true;
  }
}
