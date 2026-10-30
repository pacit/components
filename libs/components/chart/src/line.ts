import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  isDevMode,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  pctColumnsOf,
  pctFirstUnordered,
  type PctAccessor,
  type PctColumns,
} from './model/columns';
import { pctDecimate, pctPyramid, type PctPyramid } from './model/decimate';
import { pctExtent } from './model/extent';
import { pctAreaPath, pctLinePath } from './model/path';
import type { PctDomain } from './model/scale';
import { pctValueAt, type PctCurve } from './model/value-at';
import type { PctWindow } from './model/window';
import {
  PCT_SERIES_MARKERS,
  PctChartScene,
  PctMark,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/**
 * A series drawn as a line, a step or an area, on the chart it stands in
 * ([0099](../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
 *
 * **The data are the consumer's rows**, read once per change into two columns, with `x` and
 * `y` naming the columns: a key of the row whose value is of the right type, or a function of
 * the row. A `null` value — or anything that is not a finite number — is a gap, and the line
 * breaks there. The rows come ordered by `x`; in development an unordered row is reported, not
 * sorted.
 *
 * **What is drawn is decimated to the pixel**: the first, lowest, highest and last reading of
 * each column of pixels, so sixty thousand readings cost what a few thousand do and every peak
 * survives ([0100](../../../../docs/decisions/0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)).
 *
 * @example
 * <pct-line [data]="readings" x="at" y="value" name="Supply air" unit="°C" curve="step" [end]="now" />
 *
 * @since next
 */
@Component({
  selector: 'pct-line',
  templateUrl: './line.html',
  styleUrl: './line.scss',
  providers: [{ provide: PctMark, useExisting: PctLine }],
})
export class PctLine<T> extends PctMark {
  /**
   * The rows, ordered by `x`.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * Where a row stands on the horizontal axis: a numeric column, or a function of the row.
   *
   * @since next
   */
  readonly x = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * A row's value: a numeric column that may be `null`, or a function of the row.
   *
   * @since next
   */
  readonly y =
    input.required<PctAccessor<NoInfer<T>, number | null | undefined>>();
  /**
   * The series' name, which the axes, the legend and the data table write.
   *
   * @since next
   */
  readonly name = input.required<string>();
  /**
   * The series' identity, which its colour, its axis and its hidden state follow. The name
   * when unset.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The unit of the values, which decides the value axis: `°C`, `kWh`, `%`; `''` for a plain
   * number, `boolean` for a yes/no axis.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * How a reading passes to the next: `linear`, or a step — `step` holds a reading until the
   * next one, which is right for data written when they change.
   *
   * @since next
   */
  readonly curve = input<PctCurve>('linear');
  /**
   * The area between the line and zero is filled, and zero stays on the axis.
   *
   * @since next
   */
  readonly area = input(false, { transform: booleanAttribute });
  /**
   * The colour: a palette place from 1 to 8, or any CSS colour. The next free place when
   * unset, kept while the series stays
   * ([0102](../../../../docs/decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)).
   * A place written as text (`color="3"`) is the place; a number outside 1 to 8 is no place,
   * and the series takes the next free one.
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });
  /**
   * How far the last reading of a step holds: `now`, for data written when they change, whose
   * last value is still the value. Unset, a step ends at its last reading.
   *
   * @since next
   */
  readonly end = input<number | null>(null);

  private readonly scene = inject(PctChartScene);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  /** The marker's path, by the series' place: the eighth and on round again. */
  protected markerOf(place: number | 'custom'): string {
    return PCT_SERIES_MARKERS[
      place === 'custom' ? 0 : (place - 1) % PCT_SERIES_MARKERS.length
    ];
  }
  /** The lines draw their dashes always when the scene says so. */
  protected readonly dashed = computed(() => this.scene.distinct() === 'all');

  private readonly key = computed(() => this.id() || this.name());

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
      unit: this.unit(),
      curve: this.curve(),
      color: this.color(),
      fromZero: this.area(),
    },
  ]);

  override readonly span = computed<PctDomain | null>(() => {
    const { xs, length } = this.readingsOf();
    if (length === 0) return null;
    return [xs[0], Math.max(xs[length - 1], this.held() ?? -Infinity)];
  });

  /** What this frame draws: the readings decimated to the plot's pixels. */
  private readonly drawn = computed(() => {
    const window = this.scene.shown();
    if (!window) return null;
    return pctDecimate(
      this.readingsOf(),
      window,
      this.scene.plotWidth(),
      this.pyramid(),
    );
  });

  private readonly scales = computed(() => {
    const x = this.scene.xScale();
    const y = this.scene.yScales().get(this.unit());
    return x && y ? { x, y } : null;
  });

  protected readonly line = computed(() => {
    const drawn = this.drawn();
    const scales = this.scales();
    if (!drawn || !scales) return '';
    return pctLinePath(drawn, scales.x, scales.y, this.curve(), {
      end: this.held(),
      pixel: this.scene.pixel(),
    });
  });

  protected readonly fill = computed(() => {
    const drawn = this.drawn();
    const scales = this.scales();
    if (!this.area() || !drawn || !scales) return '';
    const [low, high] = scales.y.domain;
    return pctAreaPath(
      drawn,
      scales.x,
      scales.y,
      this.curve(),
      Math.min(high, Math.max(low, 0)),
      {
        end: this.held(),
        pixel: this.scene.pixel(),
      },
    );
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
   * See `PctMark.extent`.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    return id === this.key()
      ? pctExtent(
          this.readingsOf(),
          window,
          this.curve(),
          this.held(),
          this.pyramid(),
        )
      : null;
  }

  /**
   * See `PctMark.valueAt`.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
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
   * See `PctMark.pyramid`.
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
      `[pct-line] The rows of "${this.name()}" are not ordered by \`x\`: row ${at} stands ` +
        'before the one ahead of it. A chart reads its rows in order and does not sort them.',
    );
  }
}

/**
 * Reads a series' `color`: a whole number from 1 to 8, or its text, is a palette place; any
 * other text is a CSS colour; anything else is no colour, and the series takes a free place.
 *
 * @since next
 */
export function pctSeriesColor(
  value: number | string | null | undefined,
): number | string | undefined {
  const place =
    typeof value === 'string' && /^\s*\d+\s*$/.test(value)
      ? Number(value)
      : value;
  if (typeof place === 'number') {
    if (Number.isInteger(place) && place >= 1 && place <= 8) return place;
    if (isDevMode())
      console.warn(
        `[pct-line] \`color\` ${String(value)} is no place of the palette, which runs from 1 to 8: ` +
          'the series takes the next free place.',
      );
    return undefined;
  }
  return typeof place === 'string' && place.trim() !== '' ? place : undefined;
}
