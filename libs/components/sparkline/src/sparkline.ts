import {
  Component,
  computed,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  afterRenderEffect,
  booleanAttribute,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  pctQuantityFormat,
} from '@pacit/components/core';

/**
 * What a sparkline reads off a row: a key of the row holding a number, or a function of the
 * row and its index; unset, the rows are the numbers.
 *
 * @since next
 */
export type PctSparkValue<T> =
  keyof T | ((row: T, index: number) => number | null | undefined);

/** A point of the picture, in the box of a hundred by a hundred the drawing is laid in. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** A dot over the picture: where it stands, as a share of the box, and what it marks. */
interface Dot {
  readonly kind: 'last' | 'min' | 'max';
  readonly left: number;
  readonly top: number;
}

/** The side of the box the drawing is laid in: a hundred, stretched to the host. */
const BOX = 100;
/** The share of a slot a bar leaves empty, half on each side. */
const BAR_GAP = 0.2;

/** A number held to two decimals, as the paths write it. */
const two = (n: number) => Math.round(n * 100) / 100;

/**
 * A sparkline: one series drawn small, for a table's cell or a card — a line, bars or a band of
 * on and off, with no axes, no cursor and no legend
 * ([0116](../../../../docs/decisions/0116-a-sparkline-is-a-picture-with-no-scene.md)).
 *
 * **A picture, named and described.** The host is an image — the `img` role, there being no
 * APG pattern for a picture — named by the consumer (`ariaLabel` or `ariaLabelledby`: what is
 * drawn only the application knows) and described by the words the picture holds: the lowest
 * and the highest value and the last, with the unit, in the locale. The values themselves stand
 * in the row beside it, so there is no table.
 *
 * **No scene.** It imports nothing of `@pacit/components/chart`, measures nothing and observes
 * no size: the drawing is laid in a box of a hundred by a hundred and stretched to the host,
 * the line kept at its width by `vector-effect`, and the dots stand over it in HTML so they stay
 * round. The server draws all of it.
 *
 * @example
 * <pct-sparkline [data]="week()" value="kwh" unit="kWh" ariaLabel="Energy this week" />
 * <pct-sparkline [data]="[3, 5, 4, 8]" kind="bars" ariaLabel="Orders" [extremes]="true" />
 *
 * @since next
 */
@Component({
  selector: 'pct-sparkline',
  templateUrl: './sparkline.html',
  styleUrl: './sparkline.scss',
  host: {
    class: 'pct-sparkline',
    role: 'img',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
    '[attr.aria-describedby]': 'ids.description',
    '[attr.data-pct-kind]': 'kind()',
    '[style.--_pct-sparkline-color]': 'color() || null',
  },
})
export class PctSparkline<T = number> {
  /**
   * The rows, in order: each a value, or a row `value` reads one from.
   *
   * @since next
   */
  readonly data = input<readonly T[]>([]);
  /**
   * How to read a row's value: a key or a function; unset, each row is its value. Anything that
   * is not a finite number is a gap.
   *
   * @since next
   */
  readonly value = input<PctSparkValue<T> | null>(null);
  /**
   * The drawing: a line, a bar per value, or a band with each slot on (a value of a half or
   * more) or off.
   *
   * @since next
   */
  readonly kind = input<'line' | 'bars' | 'band'>('line');
  /**
   * A line filled to the floor.
   *
   * @since next
   */
  readonly area = input(false, { transform: booleanAttribute });
  /**
   * The last value as a dot, on a line or bars.
   *
   * @since next
   */
  readonly last = input(true, { transform: booleanAttribute });
  /**
   * The lowest and the highest value as dots, on a line or bars.
   *
   * @since next
   */
  readonly extremes = input(false, { transform: booleanAttribute });
  /**
   * The value at the bottom of the box; unset, the lowest value — or nought for bars, which
   * rise from it.
   *
   * @since next
   */
  readonly floor = input<number | null>(null);
  /**
   * The value at the top of the box; unset, the highest value — or nought for bars.
   *
   * @since next
   */
  readonly ceiling = input<number | null>(null);
  /**
   * The colour of the drawing, any CSS colour; unset, `sparkline-fg`.
   *
   * @since next
   */
  readonly color = input('');
  /**
   * The unit the description writes after each value; `''` is a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The locale of the description's numbers: the application's when unset.
   *
   * @since next
   */
  readonly locale = input('');
  /**
   * The picture's name — what is drawn. Give this or `ariaLabelledby`.
   *
   * @since next
   */
  readonly ariaLabel = input('');
  /**
   * As `ariaLabel`, for a name that already stands on the page — a row's header, say.
   *
   * @since next
   */
  readonly ariaLabelledby = input('');

  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);
  protected readonly ids = {
    description: nextPctId('pct-sparkline-description'),
  };

  /** The values, a gap `null`. */
  protected readonly values = computed(() => {
    const accessor = this.value();
    const read =
      accessor === null
        ? (row: T) => row as unknown
        : typeof accessor === 'function'
          ? accessor
          : (row: T) => row[accessor] as unknown;
    return this.data().map((row, index) => {
      const value = read(row, index);
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    });
  });

  /** The values there are, gaps left out. */
  private readonly known = computed(() =>
    this.values().filter((v): v is number => v !== null),
  );

  /** The values at the bottom and the top of the box. */
  private readonly range = computed(() => {
    const known = this.known();
    const bars = this.kind() === 'bars';
    const low = Math.min(...known, ...(bars ? [0] : []));
    const high = Math.max(...known, ...(bars ? [0] : []));
    const floor = this.floor() ?? low;
    const ceiling = this.ceiling() ?? high;
    return { floor, ceiling: Math.max(floor, ceiling) };
  });

  /** A value's height in the box: the top at the ceiling, the middle where the range is none. */
  private yOf(value: number): number {
    const { floor, ceiling } = this.range();
    if (ceiling === floor) return BOX / 2;
    const held = Math.min(ceiling, Math.max(floor, value));
    return two(BOX - ((held - floor) / (ceiling - floor)) * BOX);
  }

  /** A value's place along the box: the middle of its slot for bars, the slot's edge for a line. */
  private xOf(index: number): number {
    const count = this.values().length;
    if (this.kind() !== 'line') return two(((index + 0.5) / count) * BOX);
    return count === 1 ? BOX / 2 : two((index / (count - 1)) * BOX);
  }

  /** The line's runs, broken at each gap. */
  private readonly runs = computed(() => {
    const runs: Point[][] = [];
    let run: Point[] = [];
    this.values().forEach((value, index) => {
      if (value === null) {
        if (run.length) runs.push(run);
        run = [];
        return;
      }
      run.push({ x: this.xOf(index), y: this.yOf(value) });
    });
    if (run.length) runs.push(run);
    return runs;
  });

  /** The line: a run each, a run of one point a dash across no width. */
  protected readonly line = computed(() =>
    this.runs()
      .map(
        (run) =>
          `M ${run[0].x} ${run[0].y}` +
          (run.length === 1
            ? ` L ${run[0].x} ${run[0].y}`
            : run
                .slice(1)
                .map((p) => ` L ${p.x} ${p.y}`)
                .join('')),
      )
      .join(' '),
  );

  /** The area under the line: each run closed down to the box's floor. */
  protected readonly fill = computed(() =>
    this.runs()
      .filter((run) => run.length > 1)
      .map(
        (run) =>
          `M ${run[0].x} ${BOX}` +
          run.map((p) => ` L ${p.x} ${p.y}`).join('') +
          ` L ${run[run.length - 1].x} ${BOX} Z`,
      )
      .join(' '),
  );

  /** The bars: a rectangle per value, from nought held in the box to the value. */
  protected readonly bars = computed(() => {
    const count = this.values().length;
    const slot = BOX / count;
    const { floor, ceiling } = this.range();
    const base = this.yOf(Math.min(ceiling, Math.max(floor, 0)));
    return this.values().flatMap((value, index) => {
      if (value === null) return [];
      const y = this.yOf(value);
      return [
        {
          index,
          x: two(index * slot + (slot * BAR_GAP) / 2),
          y: Math.min(y, base),
          width: two(slot * (1 - BAR_GAP)),
          height: two(Math.abs(base - y)),
        },
      ];
    });
  });

  /** The band: a slot per value, on at a half or more, a gap no slot at all. */
  protected readonly slots = computed(() => {
    const count = this.values().length;
    const slot = BOX / count;
    return this.values().flatMap((value, index) =>
      value === null
        ? []
        : [{ index, x: two(index * slot), width: two(slot), on: value >= 0.5 }],
    );
  });

  /** The dots over the picture: the last value, and the lowest and the highest when asked. */
  protected readonly dots = computed<readonly Dot[]>(() => {
    if (this.kind() === 'band') return [];
    const values = this.values();
    const known = this.known();
    if (known.length === 0) return [];
    const at = (kind: Dot['kind'], index: number): Dot => ({
      kind,
      left: this.xOf(index),
      top: this.yOf(values[index] as number),
    });
    const dots: Dot[] = [];
    if (this.extremes()) {
      dots.push(at('min', values.indexOf(Math.min(...known))));
      dots.push(at('max', values.indexOf(Math.max(...known))));
    }
    if (this.last()) {
      let lastIndex = values.length - 1;
      while (values[lastIndex] === null) lastIndex--;
      dots.push(at('last', lastIndex));
    }
    return dots;
  });

  /** The locale the words are written in. */
  private readonly effectiveLocale = computed(
    () => this.locale() || this.appLocale,
  );
  private readonly format = computed(() =>
    pctQuantityFormat(this.effectiveLocale(), { fractionDigits: [0, 3] }),
  );

  /** A value with the unit, as `pct-chart` writes one. */
  private write(value: number): string {
    const number = this.format().format(value);
    const unit = this.unit();
    return unit ? `${number} ${unit}` : number;
  }

  /**
   * What the picture says to a reader: the lowest and the highest value and the last, or that
   * there is nothing; a band says the last slot's state.
   *
   * @since next
   */
  readonly description = computed(() => {
    const known = this.known();
    if (known.length === 0) return this.texts().sparklineEmpty;
    const last = this.texts().sparklineLast;
    const lastValue = known[known.length - 1];
    if (this.kind() === 'band')
      return `${last} ${lastValue >= 0.5 ? this.texts().chartOn : this.texts().chartOff}`;
    const low = this.write(Math.min(...known));
    const high = this.write(Math.max(...known));
    return `${low} – ${high}, ${last} ${this.write(lastValue)}`;
  });

  constructor() {
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnnamed());
  }

  private warnOnUnnamed(): void {
    if (this.ariaLabel().trim() || this.ariaLabelledby().trim()) return;
    console.warn(
      '[pct-sparkline] A sparkline with neither `ariaLabel` nor `ariaLabelledby`. The picture ' +
        'is announced by its name — what is drawn — and only the application knows that.',
    );
  }
}
