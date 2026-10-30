import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  isDevMode,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PCT_TEXTS, pctQuantityFormat } from '@pacit/components/core';
import {
  pctColumnsOf,
  pctRead,
  type PctAccessor,
  type PctColumns,
} from './model/columns';
import { pctIntervalNext, pctIntervalStart } from './model/intervals';
import { pctThinLabels } from './model/layout';
import type { PctDomain } from './model/scale';
import type { PctStacked } from './model/stack';
import type { PctWindow } from './model/window';
import { pctSeriesColor } from './line';
import {
  PCT_SERIES_MARKERS,
  PctChartScene,
  PctMark,
  type PctMarkNote,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/**
 * What a press on a bar picks: the series, the band's index and the row the bar was drawn
 * from, with the bar's value and the band's start.
 *
 * @since next
 */
export interface PctPick<T> {
  readonly series: string;
  readonly index: number;
  readonly row: T;
  readonly x: number;
  readonly y: number;
}

/** One bar as drawn: its band's index, its rectangle, and the value it stands for. */
interface PctBar {
  readonly index: number;
  readonly x: number;
  readonly width: number;
  readonly y: number;
  readonly height: number;
  readonly value: number;
  /** The label over the bar: its text, its middle and whether it is shown. */
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelShown: boolean;
  /** Whether the bar's band is the chart's selection: its label is shown and bold. */
  readonly selected: boolean;
  /** The compared period's bar, drawn lighter. */
  readonly compared: boolean;
}

/** The share of a band the bars of a group take. */
const INNER = 0.8;

/**
 * A series of bars, one per band of the scene — a calendar interval of `timeZone` or a
 * category — drawn from the rows whose `x` falls in the band
 * ([0099](../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
 * Where several rows fall in one band the last stands; a band with none has no bar, and a
 * zero is a line. The bars of every `pct-bars` on the scene share each band: marks with the
 * same `group` stand on each other when they share a `stack`, and side by side otherwise; a
 * mark's own group when none is named.
 *
 * **A period compared by position.** `compare` is a second set of rows laid beside the first
 * band for band, the i-th row to the i-th band — February next to March is twenty-eight days
 * beside thirty-one, and the three bands March has over are empty. The compared bars are a
 * second series, named by `compareName`, and drawn lighter.
 *
 * A press on a bar emits `pick`, and selects the bar's band on the scene.
 *
 * @example
 * <pct-chart ariaLabel="Energy by day" timeZone="Europe/Warsaw" interval="day">
 *   <pct-bars [data]="days" x="at" y="energy" name="Heat pump" unit="kWh" [compare]="lastMonth" compareName="Last month" />
 * </pct-chart>
 *
 * @since next
 */
@Component({
  selector: 'pct-bars',
  templateUrl: './bars.html',
  styleUrl: './bars.scss',
  providers: [{ provide: PctMark, useExisting: PctBars }],
})
export class PctBars<T> extends PctMark {
  /**
   * The rows, each with a position and a value.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * The position of a row: an instant on a time axis, a category's index on a band axis.
   *
   * @since next
   */
  readonly x = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * The value of a row; `null` or anything but a finite number is no bar.
   *
   * @since next
   */
  readonly y = input.required<PctAccessor<NoInfer<T>, number | null>>();
  /**
   * The series' name: what the legend, the tooltip and the table call it.
   *
   * @since next
   */
  readonly name = input.required<string>();
  /**
   * The series' id, which tells it apart in `hiddenSeries` and the reading; the name when unset.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The unit the value axis is chosen by: `°C`, `kWh`, `%`, any text.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The colour: a palette place from 1 to 8, or any CSS colour; the next free place when
   * unset (0102).
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });
  /**
   * The group the bars stand in: marks of one group stand side by side in a band. Unset, a
   * mark's `stack` is its group, so stacked marks stand on each other, and a mark with
   * neither is a group of its own.
   *
   * @since next
   */
  readonly group = input('');
  /**
   * The stack the bars stand on: marks of one stack, in their order, stand on each other,
   * positives up from zero and negatives down from it.
   *
   * @since next
   */
  readonly stack = input<string | undefined>(undefined);
  /**
   * A period compared by position: its i-th row stands beside the i-th band.
   *
   * @since next
   */
  readonly compare = input<readonly T[] | undefined>(undefined);
  /**
   * The compared series' name.
   *
   * @since next
   */
  readonly compareName = input('');
  /**
   * Where the compared bar stands: before the current one (an earlier period, the default)
   * or after it.
   *
   * @since next
   */
  readonly compareSide = input<'before' | 'after'>('before');
  /**
   * Writes each bar's value over it, thinned where they would touch.
   *
   * @since next
   */
  readonly labels = input(false, { transform: booleanAttribute });
  /**
   * A press on a bar: the series, the band's index and the row.
   *
   * @since next
   */
  readonly pick = output<PctPick<T>>();

  private readonly scene = inject(PctChartScene);

  /**
   * See `PctMark.template`.
   *
   * @since next
   */
  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  /**
   * See `PctMark.swatch`.
   *
   * @since next
   */
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  private readonly key = computed(() => this.id() || this.name());
  private readonly compareKey = computed(() => `${this.key()}:compare`);

  /**
   * See `PctMark.series`.
   *
   * @since next
   */
  override readonly series = computed<readonly PctSeriesSpec[]>(() => {
    const own: PctSeriesSpec = {
      id: this.key(),
      name: this.name(),
      unit: this.unit(),
      curve: 'step',
      color: this.color(),
      fromZero: true,
    };
    return this.compare()
      ? [
          own,
          {
            ...own,
            id: this.compareKey(),
            name: this.compareName() || this.name(),
          },
        ]
      : [own];
  });

  // Marks of one stack stand on each other, so the stack is their group unless one is named.
  /**
   * See `PctMark.band`.
   *
   * @since next
   */
  override readonly band = computed(() => ({
    group: this.group() || this.stack() || this.key(),
    stack: this.stack() ?? null,
  }));

  /** The rows' positions and values, as columns. */
  private readonly readingsOf = computed<PctColumns>(() =>
    pctColumnsOf(this.data(), this.x(), this.y()),
  );

  /**
   * See `PctMark.span`.
   *
   * @since next
   */
  override readonly span = computed<PctDomain | null>(() => {
    const { xs, length } = this.readingsOf();
    if (length === 0) return null;
    const interval = this.scene.interval();
    if (!interval) return [xs[0], xs[length - 1]];
    const zone = this.scene.timeZone();
    const last = pctIntervalStart(xs[length - 1], interval, zone);
    return [
      pctIntervalStart(xs[0], interval, zone),
      pctIntervalNext(last, interval, zone),
    ];
  });

  /** The value of each band: the last row that falls in it, or none. */
  private readonly values = computed<readonly (number | null)[]>(() =>
    this.valuesOf(this.readingsOf(), this.scene.bands()),
  );

  /** The compared period's value at each band, by position. */
  private readonly comparedValues = computed<readonly (number | null)[]>(() => {
    const rows = this.compare();
    const y = pctRead(this.y());
    return this.scene.bands().map((_, i) => {
      const row = rows?.[i];
      if (row === undefined) return null;
      const value = y(row, i);
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    });
  });

  private valuesOf(
    columns: PctColumns,
    bands: readonly PctWindow[],
  ): readonly (number | null)[] {
    const { xs, ys, length } = columns;
    let i = 0;
    return bands.map((band) => {
      let value: number | null = null;
      while (i < length && xs[i] < band.from) i++;
      for (; i < length && xs[i] < band.to; i++)
        value = Number.isNaN(ys[i]) ? null : ys[i];
      return value;
    });
  }

  /** Where this mark's bars stand in their band: the group's sub-band, split for a comparison. */
  private readonly place = computed(() =>
    typeof this.color() === 'string'
      ? ('custom' as const)
      : (this.scene.places().get(this.key()) ?? 1),
  );
  protected readonly custom = computed(() => {
    const color = this.color();
    return typeof color === 'string' ? color : null;
  });
  protected readonly placeOf = this.place;

  private readonly format = computed(() =>
    pctQuantityFormat(this.scene.effectiveLocale(), {
      fractionDigits: [0, 2],
    }),
  );

  /** The bars drawn: the current series' and the compared period's. */
  protected readonly drawn = computed<readonly PctBar[]>(() => {
    const scale = this.scene.xScale();
    const y = this.scene.yScales().get(this.unit());
    const bands = this.scene.bands();
    const hidden = new Set(this.scene.hiddenSeries());
    if (!scale || !y || bands.length === 0) return [];
    const { index, count } = this.scene.groupOf(this.band().group);
    const stack = this.stack();
    const stacked = stack ? this.scene.stackedOf(stack, this.key()) : null;
    const comparedStacked = stack
      ? this.scene.stackedOf(stack, this.compareKey())
      : null;
    const compared = this.compare() && !hidden.has(this.compareKey());
    const own = !hidden.has(this.key());
    const gap = 2;
    const bars: PctBar[] = [];
    bands.forEach((band, i) => {
      const x0 = scale.map(band.from);
      const x1 = scale.map(band.to);
      const slot = (x1 - x0) * INNER;
      const start = x0 + ((x1 - x0) * (1 - INNER)) / 2;
      const sub = slot / count;
      const left = start + index * sub + gap / 2;
      const width = Math.max(1, sub - gap);
      const halves = compared ? 2 : 1;
      const each = Math.max(1, (width - (halves - 1) * gap) / halves);
      const sides =
        this.compareSide() === 'before'
          ? ['compared', 'own']
          : ['own', 'compared'];
      sides.forEach((side, s) => {
        const isCompared = side === 'compared';
        if (isCompared ? !compared : !own) return;
        const value = isCompared ? this.comparedValues()[i] : this.values()[i];
        if (value === null) return;
        const column = isCompared ? comparedStacked : stacked;
        const from = column?.[i]?.from ?? 0;
        const to = column?.[i]?.to ?? value;
        const top = Math.min(y.map(from), y.map(to));
        const bottom = Math.max(y.map(from), y.map(to));
        const bx = compared ? left + s * (each + gap) : left;
        bars.push({
          index: i,
          x: bx,
          width: compared ? each : width,
          y: top,
          height: Math.max(1, bottom - top),
          value,
          label: this.format().format(value),
          labelX: bx + (compared ? each : width) / 2,
          labelY: value >= 0 ? top - 4 : bottom + 4,
          labelShown: false,
          selected: false,
          compared: isCompared,
        });
      });
    });
    if (!this.labels()) return bars;
    // The labels of the current bars, thinned where they would touch; the compared bars carry
    // none, their value is the tooltip's. The selected band's label is never thinned away.
    const selected = this.scene.selected();
    const chosen = selected
      ? bands.findIndex((b) => b.from === selected.from && b.to === selected.to)
      : -1;
    const labelled = bars.filter((b) => !b.compared);
    const shown = pctThinLabels(
      labelled.map((b) => b.labelX),
      labelled.map((b) => this.scene.measure(b.label)),
      4,
    );
    const visible = new Set(labelled.filter((_, i) => shown[i]));
    return bars.map((b) => {
      const isChosen = b.index === chosen && !b.compared;
      return {
        ...b,
        selected: isChosen,
        labelShown: isChosen || visible.has(b),
      };
    });
  });

  private readonly texts = inject(PCT_TEXTS);

  /** The difference between a bar and the compared period's, as a signed percentage. */
  private readonly percent = computed(() =>
    pctQuantityFormat(this.scene.effectiveLocale(), {
      unit: 'percent',
      signDisplay: 'exceptZero',
      fractionDigits: [0, 1],
    }),
  );

  /**
   * See `PctMark.notesAt`: with a compared period, the difference between the bar under `x`
   * and the compared one, in percent of the compared — none where either is missing or the
   * compared is zero.
   *
   * @since next
   */
  override notesAt(x: number): readonly PctMarkNote[] {
    const hidden = new Set(this.scene.hiddenSeries());
    if (
      !this.compare() ||
      hidden.has(this.key()) ||
      hidden.has(this.compareKey())
    )
      return [];
    const i = this.scene.bands().findIndex((b) => x >= b.from && x < b.to);
    if (i < 0) return [];
    const own = this.values()[i];
    const compared = this.comparedValues()[i];
    if (own === null || compared === null || compared === 0) return [];
    return [
      {
        id: `${this.key()}:difference`,
        name: this.texts().chartDifference,
        text: this.percent().format(
          ((own - compared) / Math.abs(compared)) * 100,
        ),
      },
    ];
  }

  /** The marker's path: the bars' swatch is a square, the second place's shape. */
  protected readonly squarePath = PCT_SERIES_MARKERS[1];

  constructor() {
    super();
    if (isDevMode()) afterRenderEffect(() => this.warnOnNoBands());
  }

  /**
   * See `PctMark.extent`.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    if (id !== this.key() && id !== this.compareKey()) return null;
    const values = id === this.key() ? this.values() : this.comparedValues();
    const stack = this.stack();
    const column = stack ? this.scene.stackedOf(stack, id) : null;
    let min = 0;
    let max = 0;
    let any = false;
    this.scene.bands().forEach((band, i) => {
      if (band.to <= window.from || band.from >= window.to) return;
      const value = values[i];
      if (value === null) return;
      any = true;
      const from = column?.[i]?.from ?? 0;
      const to = column?.[i]?.to ?? value;
      min = Math.min(min, from, to);
      max = Math.max(max, from, to);
    });
    return any ? [min, max] : null;
  }

  /**
   * See `PctMark.valueAt`.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    if (id !== this.key() && id !== this.compareKey()) return null;
    const i = this.scene.bands().findIndex((b) => x >= b.from && x < b.to);
    if (i < 0) return null;
    return (id === this.key() ? this.values() : this.comparedValues())[i];
  }

  /**
   * See `PctMark.readings`.
   *
   * @since next
   */
  override readings(id: string): PctColumns {
    const bands = this.scene.bands();
    const values = id === this.key() ? this.values() : this.comparedValues();
    return {
      xs: Float64Array.from(bands.map((b) => b.from)),
      ys: Float64Array.from(values.map((v) => v ?? NaN)),
      length: bands.length,
    };
  }

  /**
   * See `PctMark.valuesIn`.
   *
   * @since next
   */
  override valuesIn(
    id: string,
    bands: readonly PctWindow[],
  ): readonly (number | null)[] {
    if (id === this.compareKey()) {
      const rows = this.compare();
      const y = pctRead(this.y());
      return bands.map((_, i) => {
        const row = rows?.[i];
        const value = row === undefined ? null : y(row, i);
        return typeof value === 'number' && Number.isFinite(value)
          ? value
          : null;
      });
    }
    return this.valuesOf(this.readingsOf(), bands);
  }

  /**
   * See `PctMark.rowsIn`.
   *
   * @since next
   */
  override rowsIn(id: string, window: PctWindow): readonly number[] | null {
    void id;
    return this.scene
      .bands()
      .filter((b) => b.to > window.from && b.from < window.to)
      .map((b) => b.from);
  }

  /**
   * See `PctMark.bandAt`.
   *
   * @since next
   */
  override bandAt(id: string, x: number): PctWindow | null {
    void id;
    return this.scene.bands().find((b) => x >= b.from && x < b.to) ?? null;
  }

  /**
   * See `PctMark.pickAt`.
   *
   * @since next
   */
  override pickAt(id: string, x: number, y: number): boolean {
    if (id !== this.key()) return false;
    const bar = this.drawn().find(
      (b) =>
        !b.compared &&
        x >= b.x &&
        x <= b.x + b.width &&
        y >= b.y &&
        y <= b.y + b.height,
    );
    if (!bar) return false;
    const band = this.scene.bands()[bar.index];
    // The last row in the band, read off the rows themselves: the columns leave out a row
    // with no finite position, so their index is not the rows'.
    const position = pctRead(this.x());
    let row: T | undefined;
    this.data().forEach((r, i) => {
      const at = position(r, i);
      if (at >= band.from && at < band.to) row = r;
    });
    if (row === undefined) return false;
    this.pick.emit({
      series: this.key(),
      index: bar.index,
      row,
      x: band.from,
      y: bar.value,
    });
    return true;
  }

  private warnOnNoBands(): void {
    if (this.scene.bands().length > 0 || this.data().length === 0) return;
    console.warn(
      `[pct-bars] "${this.name()}" has no band to stand in: a time axis holds bars only with ` +
        'an `interval` on the chart, and a `band` axis with its `categories`.',
    );
  }
}
