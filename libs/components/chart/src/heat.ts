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
import type { PctPick } from './bars';
import { pctRead, type PctAccessor, type PctColumns } from './model/columns';
import {
  pctColorDomain,
  pctDiverging,
  pctRampStop,
  pctSequential,
  type PctColorScale,
} from './model/color';
import { pctIntervalNext, pctIntervalStart } from './model/intervals';
import type { PctDomain } from './model/scale';
import type { PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** The sequential ramp's steps: `heat-bg-1` to `heat-bg-8`. */
const STEPS = 8;
/** The diverging ramp's steps: `heat-bg-low`, `heat-bg-mid`, `heat-bg-high`. */
const DIVERGING_STEPS = 3;
const DIVERGING_NAMES = ['low', 'mid', 'high'] as const;
/** The room a label needs around its text to be written on a cell. */
const LABEL_ROOM = 4;
/** The swatch of a row in the legend: a deep step of the ramp, the same for every row. */
const SWATCH_COLOR = 'var(--pct-chart-heat-bg-6)';

/** A cell as drawn: its place, its two ramp steps and the label on it. */
interface PctCell {
  readonly band: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly value: number;
  /** The names of the two steps mixed, and the nearer one — the classes of the cell. */
  readonly from: string;
  readonly to: string;
  readonly step: string;
  /** The share of `to` in the mix, in percent. */
  readonly mix: number;
  /** Past the middle of the ramp: a filled box under forced colours. */
  readonly deep: boolean;
  readonly label: string | null;
}

/**
 * A heatmap: a value per cell of a grid, the columns the chart's bands along `x` — an
 * `interval` of time, or the categories of a `band` axis — and the rows the categories `y`
 * names, laid across the plot by the scene (`PctMark.rows`) and labelled at its side. Each
 * cell is painted on a ramp of the skin's tokens — sequential, from `heat-bg-1` to `heat-bg-8`,
 * or `diverging`, from `heat-bg-low` through `heat-bg-mid` to `heat-bg-high` — by mixing the two
 * steps its value falls between, so the theme paints it and the server draws it without
 * measuring a colour
 * ([0111](../../../../docs/decisions/0111-a-heatmap-is-rows-the-scene-lays-and-a-colour-the-stylesheet-mixes.md)).
 *
 * Every row is a series: the legend lists it, the tooltip reads its value at the cursor and
 * the data table carries it as a column, so a reader walks the heatmap as the table it is. A
 * `pct-chart-ramp` beside the chart shows the ramp with the domain's ends. With `labels`, each
 * cell wide enough carries its value, in dark text on the pale steps and light on the deep.
 * A press on a cell emits `pick` with its row.
 *
 * @example
 * <pct-chart ariaLabel="Power by hour and day" timeZone="Europe/Warsaw" interval="day">
 *   <pct-heat [data]="cells" x="day" y="hour" value="kw" name="Power" unit="kW" />
 * </pct-chart>
 * <pct-chart-ramp [chart]="chart" />
 *
 * @since next
 */
@Component({
  selector: 'pct-heat',
  templateUrl: './heat.html',
  styleUrl: './heat.scss',
  providers: [{ provide: PctMark, useExisting: PctHeat }],
})
export class PctHeat<T> extends PctMark {
  /**
   * The rows, each a cell: a position, a row's name and a value.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * Where a cell stands along the x axis: a time, placed in the chart's `interval`, or the
   * index of a `band` category.
   *
   * @since next
   */
  readonly x = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * The row a cell stands in: a category, laid across the plot and named at its side.
   *
   * @since next
   */
  readonly y = input.required<PctAccessor<NoInfer<T>, string>>();
  /**
   * A cell's value; a value that is not a finite number is a gap, drawn as no cell.
   *
   * @since next
   */
  readonly value =
    input.required<PctAccessor<NoInfer<T>, number | null | undefined>>();
  /**
   * The rows in order, top to bottom. Unset, the rows stand in the order the data first names
   * them.
   *
   * @since next
   */
  readonly rowOrder = input<readonly string[] | undefined>(undefined);
  /**
   * The mark's name: the ramp's title, and the description's subject.
   *
   * @since next
   */
  readonly name = input.required<string>();
  /**
   * The mark's id, where two heatmaps share a name; the name otherwise. A row's series is
   * `id:row`.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The unit of the values; `''` is a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The ramp: `sequential` from a low to a high, or `diverging` from a low through a middle to a
   * high, each side on its own reach.
   *
   * @since next
   */
  readonly scale = input<'sequential' | 'diverging'>('sequential');
  /**
   * The values the ramp's ends stand for — `[low, high]`, or `[low, mid, high]` for a diverging
   * ramp — held at the ends past them. Unset, the data's extent; a diverging ramp centres on
   * zero and reaches as far on both sides as the farther value.
   *
   * @since next
   */
  readonly domain = input<readonly number[] | undefined>(undefined);
  /**
   * Write each cell's value on it, where the cell is wide enough.
   *
   * @since next
   */
  readonly labels = input(false, { transform: booleanAttribute });
  /**
   * A press on a cell: its row's series, the band's index, the row of the data, the band's
   * start and the value.
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
  private readonly diverging = computed(() => this.scale() === 'diverging');

  /**
   * See `PctMark.rows`: the categories `y` names, in the order given or first met.
   *
   * @since next
   */
  override readonly rows = computed<readonly string[]>(() => {
    const given = this.rowOrder();
    if (given) return given;
    const read = pctRead(this.y());
    const seen: string[] = [];
    this.data().forEach((row, i) => {
      const name = read(row, i);
      if (!seen.includes(name)) seen.push(name);
    });
    return seen;
  });

  /**
   * See `PctMark.series`: one per row, in its row, with no axis and no palette place.
   *
   * @since next
   */
  override readonly series = computed<readonly PctSeriesSpec[]>(() =>
    this.rows().map((row) => ({
      id: this.seriesOf(row),
      name: row,
      unit: this.unit(),
      curve: 'step',
      color: SWATCH_COLOR,
      fromZero: false,
      row,
    })),
  );

  /** The positions of the data, as read: a row with no finite position is no cell. */
  private readonly positions = computed(() => {
    const at = pctRead(this.x());
    return this.data().map((row, i) => {
      const x = at(row, i);
      return typeof x === 'number' && Number.isFinite(x) ? x : NaN;
    });
  });

  /**
   * See `PctMark.span`: from the first cell's band to the end of the last.
   *
   * @since next
   */
  override readonly span = computed<PctDomain | null>(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const x of this.positions()) {
      if (Number.isNaN(x)) continue;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    if (lo > hi) return null;
    const interval = this.scene.interval();
    if (!interval) return [lo, hi];
    const zone = this.scene.timeZone();
    return [
      pctIntervalStart(lo, interval, zone),
      pctIntervalNext(pctIntervalStart(hi, interval, zone), interval, zone),
    ];
  });

  /**
   * The grid: a value per band and row, the last row of the data that falls in the cell
   * standing, and the index of that row for a pick.
   */
  private readonly grid = computed(() => {
    const bands = this.scene.bands();
    const rows = this.rows();
    const read = pctRead(this.value());
    const named = pctRead(this.y());
    const positions = this.positions();
    const values = rows.map(() => new Float64Array(bands.length).fill(NaN));
    const sources = rows.map(() => new Int32Array(bands.length).fill(-1));
    if (bands.length === 0) return { bands, values, sources };
    this.data().forEach((row, i) => {
      const x = positions[i];
      if (Number.isNaN(x)) return;
      const r = rows.indexOf(named(row, i));
      if (r < 0) return;
      const b = bandOf(bands, x);
      if (b < 0) return;
      const v = read(row, i);
      values[r][b] = typeof v === 'number' && Number.isFinite(v) ? v : NaN;
      sources[r][b] = i;
    });
    return { bands, values, sources };
  });

  /** The domain the ramp runs over: the consumer's, or that of the data with a position. */
  private readonly colorDomain = computed<readonly number[]>(() => {
    const read = pctRead(this.value());
    const positions = this.positions();
    const all = this.data().map((row, i) => {
      if (Number.isNaN(positions[i])) return NaN;
      const v = read(row, i);
      return typeof v === 'number' ? v : NaN;
    });
    return pctColorDomain(all, this.diverging(), this.domain());
  });

  /** A value's place on the ramp, from 0 to 1. */
  private readonly placeOf = computed(() => {
    const domain = this.colorDomain();
    return this.diverging()
      ? pctDiverging([domain[0], domain[1], domain[2]])
      : pctSequential([domain[0], domain[1]]);
  });

  /**
   * See `PctMark.colorScale`.
   *
   * @since next
   */
  override readonly colorScale = computed<PctColorScale>(() => ({
    kind: this.scale(),
    domain: this.colorDomain(),
    steps: this.diverging() ? DIVERGING_STEPS : STEPS,
    name: this.name(),
    unit: this.unit(),
  }));

  private readonly hidden = computed(() => {
    const hidden = new Set(this.scene.hiddenSeries());
    return new Set(this.rows().filter((row) => hidden.has(this.seriesOf(row))));
  });

  /** The cells drawn: every band in the window, every row not hidden, every value that is one. */
  protected readonly drawn = computed<readonly PctCell[]>(() => {
    const scale = this.scene.xScale();
    const { bands, values } = this.grid();
    if (!scale) return [];
    const rows = this.rows();
    const hidden = this.hidden();
    const horizontal = this.scene.orientation() === 'horizontal';
    const gap = this.scene.cellGap();
    const place = this.placeOf();
    const steps = this.diverging() ? DIVERGING_STEPS : STEPS;
    const stepName = (step: number) =>
      this.diverging() ? DIVERGING_NAMES[step - 1] : String(step);
    const labels = this.labels();
    const cells: PctCell[] = [];
    rows.forEach((row, r) => {
      if (hidden.has(row)) return;
      const frame = this.scene.rowFrame(row);
      if (!frame) return;
      bands.forEach((band, b) => {
        const value = values[r][b];
        const t = place(value);
        if (t === null) return;
        const a0 = Math.min(scale.map(band.from), scale.map(band.to)) + gap / 2;
        const a1 = Math.max(scale.map(band.from), scale.map(band.to)) - gap / 2;
        const along = Math.max(1, a1 - a0);
        const c0 = (horizontal ? frame.left : frame.top) + gap / 2;
        const c1 = (horizontal ? frame.right : frame.bottom) - gap / 2;
        const across = Math.max(1, c1 - c0);
        const stop = pctRampStop(t, steps);
        const text = labels ? this.scene.writeValue(value, '') : null;
        const width = horizontal ? across : along;
        const label =
          text !== null && this.scene.measure(text) + LABEL_ROOM <= width
            ? text
            : null;
        cells.push({
          band: b,
          row: r,
          x: horizontal ? c0 : a0,
          y: horizontal ? a0 : c0,
          width,
          height: horizontal ? along : across,
          value,
          from: stepName(stop.from),
          to: stepName(stop.to),
          step: stepName(stop.step),
          mix: Math.round(stop.mix * 100),
          deep: t >= 0.5,
          label,
        });
      });
    });
    return cells;
  });

  /**
   * See `PctMark.extent`: none — a series in a row has no value axis.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    void id;
    void window;
    return null;
  }

  /**
   * See `PctMark.valueAt`: the cell's value in the band under `x`, held across the band.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    const r = this.rowIndexOf(id);
    if (r < 0) return null;
    const { bands, values } = this.grid();
    const b = bandOf(bands, x);
    if (b < 0) return null;
    const value = values[r][b];
    return Number.isNaN(value) ? null : value;
  }

  /**
   * See `PctMark.readings`: the row's values at the bands' starts.
   *
   * @since next
   */
  override readings(id: string): PctColumns {
    const r = this.rowIndexOf(id);
    const { bands, values } = this.grid();
    if (r < 0)
      return { xs: new Float64Array(0), ys: new Float64Array(0), length: 0 };
    return {
      xs: Float64Array.from(bands.map((band) => band.from)),
      ys: values[r],
      length: bands.length,
    };
  }

  /**
   * See `PctMark.rowsIn`: the bands in the window, each a row of the table.
   *
   * @since next
   */
  override rowsIn(id: string, window: PctWindow): readonly number[] | null {
    if (this.rowIndexOf(id) < 0) return null;
    return this.scene
      .bands()
      .filter((b) => b.to > window.from && b.from < window.to)
      .map((b) => b.from);
  }

  /**
   * See `PctMark.bandAt`: the band under `x`.
   *
   * @since next
   */
  override bandAt(id: string, x: number): PctWindow | null {
    if (this.rowIndexOf(id) < 0) return null;
    const bands = this.scene.bands();
    const b = bandOf(bands, x);
    return b < 0 ? null : bands[b];
  }

  /**
   * See `PctMark.pickAt`: a press on a cell of the row's series picks the row of the data it
   * was drawn from.
   *
   * @since next
   */
  override pickAt(id: string, x: number, y: number): boolean {
    const r = this.rowIndexOf(id);
    if (r < 0) return false;
    const cell = this.drawn().find(
      (c) =>
        c.row === r &&
        x >= c.x &&
        x <= c.x + c.width &&
        y >= c.y &&
        y <= c.y + c.height,
    );
    if (!cell) return false;
    const { bands, sources } = this.grid();
    const source = sources[r][cell.band];
    if (source < 0) return false;
    this.pick.emit({
      series: id,
      index: cell.band,
      row: this.data()[source],
      x: bands[cell.band].from,
      y: cell.value,
    });
    return true;
  }

  /**
   * See `PctMark.describe`: the name, the rows and the reach of the ramp — `Power: 24 rows,
   * from 0 kW to 3.2 kW.` — so a reader knows what the colours say.
   *
   * @since next
   */
  override describe(): string {
    const rows = this.rows();
    if (rows.length === 0) return '';
    const domain = this.colorDomain();
    const unit = this.unit();
    const write = (v: number) => this.scene.writeValue(v, unit);
    return `${this.name()}: ${rows.length} rows, from ${write(domain[0])} to ${write(domain[domain.length - 1])}.`;
  }

  private seriesOf(row: string): string {
    return `${this.key()}:${row}`;
  }

  private rowIndexOf(id: string): number {
    const prefix = `${this.key()}:`;
    if (!id.startsWith(prefix)) return -1;
    return this.rows().indexOf(id.slice(prefix.length));
  }
}

/** The band holding `x` — the bands are in order and do not overlap — or `-1`. */
function bandOf(bands: readonly PctWindow[], x: number): number {
  let lo = 0;
  let hi = bands.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const band = bands[mid];
    if (x < band.from) hi = mid - 1;
    else if (x >= band.to) lo = mid + 1;
    else return mid;
  }
  return -1;
}
