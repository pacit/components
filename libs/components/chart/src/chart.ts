import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  contentChild,
  contentChildren,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  LOCALE_ID,
  model,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  pctQuantityFormat,
} from '@pacit/components/core';
import { PctSkeleton } from '@pacit/components/skeleton';
import type { PctColumns } from './model/columns';
import { pctCursorJump, pctCursorStep } from './model/cursor';
import { pctThinLabels, pctTooltipPlace } from './model/layout';
import { pctDomainOf } from './model/extent';
import { pctLinear, type PctDomain, type PctScale } from './model/scale';
import { pctAxisSlots, type PctAxisSlot } from './model/slots';
import { pctFractionDigits, pctNiceStep, pctTicks } from './model/ticks';
import {
  pctTimeStep,
  pctTimeTicks,
  pctTimeTickText,
  type PctTimeLabel,
} from './model/time-ticks';
import type { PctWindow } from './model/window';
import { PctChartScene, PctMark, type PctSeriesSpec } from './scene';

/**
 * A value axis the consumer configures by its unit. Without one, an axis takes its domain
 * from the data in the window.
 *
 * @example
 * <pct-chart ariaLabel="Indoor climate">
 *   <pct-axis unit="%" [floor]="0" [ceiling]="100" />
 *   <pct-line [data]="humidity" x="at" y="value" name="Humidity" unit="%" />
 * </pct-chart>
 *
 * @since next
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- an element beside the marks: it configures the scene, draws nothing and holds no content, so a component's template and sheet would be empty
  selector: 'pct-axis',
})
export class PctAxis {
  /**
   * The unit whose axis this configures, as the series write it.
   *
   * @since next
   */
  readonly unit = input.required<string>();
  /**
   * A lower end kept whatever the data say.
   *
   * @since next
   */
  readonly floor = input<number | undefined>(undefined);
  /**
   * An upper end kept whatever the data say.
   *
   * @since next
   */
  readonly ceiling = input<number | undefined>(undefined);
  /**
   * Zero stays in the domain.
   *
   * @since next
   */
  readonly includeZero = input(false, { transform: booleanAttribute });
}

/**
 * A value axis as the scene lays it out: what a legend or a custom axis reads off `axes()`.
 *
 * @since next
 */
export interface PctAxisLayout {
  readonly unit: string;
  readonly slot: PctAxisSlot;
  readonly domain: PctDomain;
  readonly scale: PctScale;
  /** The ticks: where each stands, and its text. */
  readonly ticks: readonly {
    readonly at: number;
    readonly y: number;
    readonly text: string;
  }[];
  /** Where the axis line stands, and the side its labels are on. */
  readonly x: number;
  readonly side: 'start' | 'end';
  /** The palette places of the series on this axis, at most three, for the dots by the unit. */
  readonly places: readonly number[];
}

/** A tick of the horizontal axis as the scene draws it. */
interface PctXTick {
  readonly x: number;
  /** Where its label's middle stands: on the tick, or inside the box when that is too near an edge. */
  readonly middle: number;
  readonly text: string;
  readonly shown: boolean;
  readonly label: PctTimeLabel | 'value';
}

/**
 * What the chart reads under its cursor: the position, written as the axis writes it, and
 * every series shown there. What the tooltip draws and the cursor's range says, and what a
 * legend of the application's own reads off `reading()`.
 *
 * @since next
 */
export interface PctChartReading {
  /** The cursor's position on the horizontal axis. */
  readonly x: number;
  /** The position written: a time in the chart's zone, or a number. */
  readonly text: string;
  /** Every series shown, in the chart's order. */
  readonly rows: readonly PctChartReadingRow[];
}

/**
 * One series' value under the cursor.
 *
 * @since next
 */
export interface PctChartReadingRow {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  /** The palette place, or `custom` for a colour of the consumer's own. */
  readonly place: number | 'custom';
  /** The consumer's own colour, `null` for a palette place. */
  readonly color: string | null;
  /** The value, computed as the series is drawn; `null` in a gap. */
  readonly value: number | null;
  /** The value written, with its unit: `21.4 °C`, `On`, or the gap's word. */
  readonly text: string;
}

/**
 * The context of a `pctChartTooltip` template: the reading under the cursor.
 *
 * @since next
 */
export interface PctChartTooltipContext {
  readonly $implicit: PctChartReading;
}

/**
 * A tooltip of the consumer's own: an `<ng-template pctChartTooltip let-reading>` inside the
 * chart, stamped in place of the default rows, with the reading under the cursor.
 *
 * @example
 * <pct-chart ariaLabel="Supply air">
 *   <ng-template pctChartTooltip let-reading>{{ reading.text }} · {{ reading.rows[0].text }}</ng-template>
 * </pct-chart>
 *
 * @since next
 */
@Directive({
  // The template is the slot: a tooltip of the consumer's own, stamped by the scene.
  selector: 'ng-template[pctChartTooltip]',
})
export class PctChartTooltip {
  /**
   * The template the scene stamps.
   *
   * @since next
   */
  readonly template = inject<TemplateRef<PctChartTooltipContext>>(TemplateRef);

  /**
   * Types the template's context for the compiler.
   *
   * @since next
   */
  static ngTemplateContextGuard(
    directive: PctChartTooltip,
    context: unknown,
  ): context is PctChartTooltipContext {
    void directive;
    void context;
    return true;
  }
}

/** The yes/no unit: an axis from 0 to 1 with two labels. */
const BOOLEAN = 'boolean';
/** About how far apart the ticks of a value axis stand, in pixels. */
const ROW = 48;
/** The space between a plot and the edge where no axis stands. */
const EDGE = 8;
/** How long a finger rests before the cursor follows it, in milliseconds. */
const HOLD = 300;
/** How far a finger moves before a press is no tap, in pixels. */
const SLOP = 8;
/** How near the cursor's line a tap clears it, in pixels. */
const NEAR = 12;
const HOUR = 3_600_000;

/** One canvas for every chart's text measurements, made when first needed. */
let measuring: CanvasRenderingContext2D | null | undefined;

/**
 * A chart: a scene of scales and the marks drawn on them
 * ([0099](../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
 * The marks — `pct-line` and those that follow it — stand inside it; the scene owns the
 * scales, the window, the colours and the axes, and draws in layers: the data in one `<svg>`,
 * the axes in a second, each on a compositor layer of its own, so a change of one does not
 * repaint the other
 * ([0100](../../../../docs/decisions/0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)).
 *
 * **A named picture.** The drawing is `role="img"` named by `ariaLabel` (or `ariaLabelledby`), with `description` as its
 * description; the data a reader can walk is `pct-chart-table` beside it
 * ([0103](../../../../docs/decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)).
 * No APG pattern covers a chart; the WAI tutorial on complex images is the one it follows.
 *
 * **Axes by unit.** Each unit gets a value axis — the first on the left, the second on the
 * right, the third and fourth outside them — and keeps it while it stays on the chart. A
 * series' colour is the palette's next place when its id first appears, and stays
 * ([0102](../../../../docs/decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)).
 *
 * **Before it knows its size** — on the server, and in the first frame — it draws a skeleton
 * of its own shape, so nothing moves when it does.
 *
 * @example
 * <pct-chart ariaLabel="Heat recovery, last 24 hours" timeZone="Europe/Warsaw" style="height: 320px">
 *   <pct-line [data]="supply" x="at" y="value" name="Supply air" unit="°C" curve="step" />
 *   <pct-line [data]="heater" x="at" y="on" name="Heater" unit="boolean" curve="step" />
 * </pct-chart>
 *
 * @since next
 */
@Component({
  selector: 'pct-chart',
  imports: [NgTemplateOutlet, PctSkeleton],
  templateUrl: './chart.html',
  styleUrl: './chart.scss',
  providers: [{ provide: PctChartScene, useExisting: PctChart }],
  host: {
    class: 'pct-chart',
    '[attr.aria-busy]': 'loading() || !measured() ? "true" : null',
  },
})
export class PctChart extends PctChartScene {
  /**
   * The chart's name, which a reader announces with the picture, and which the data table
   * takes as its caption. A picture with no name is a hole in the page: give this or
   * `ariaLabelledby`.
   *
   * @since next
   */
  readonly ariaLabel = input('');
  /**
   * As `ariaLabel`, for a name that already stands on the page: a heading over the chart.
   *
   * @since next
   */
  readonly ariaLabelledby = input('');
  /**
   * What the picture shows, in a sentence or two — the trend, the range, what stands out. A
   * reader hears it after the name.
   *
   * @since next
   */
  readonly description = input('');
  /**
   * What the horizontal axis holds: instants (`time`, milliseconds since the epoch) or plain
   * numbers (`linear`).
   *
   * @since next
   */
  readonly x = input<'time' | 'linear'>('time');
  /**
   * The zone whose wall clock the time axis reads: its ticks fall on its whole hours and
   * midnights. The runtime's own when unset — under SSR the server's, so pass it.
   *
   * @since next
   */
  readonly timeZone = input<string | undefined>(undefined);
  /**
   * Overrides the application's `LOCALE_ID` for the numbers and times the axes write.
   *
   * @since next
   */
  readonly locale = input('');
  /**
   * Which value axes draw grid lines: the first, every one, or none.
   *
   * @since next
   */
  readonly grid = input<'first' | 'all' | 'none'>('first');
  /**
   * The data are on their way: the chart shows a skeleton of its shape and tells a reader it
   * is busy.
   *
   * @since next
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /**
   * The stretch of the horizontal axis on show, or `null` for all the data have
   * ([0101](../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)).
   * A change of the data changes it not.
   *
   * @since next
   */
  readonly window = model<PctWindow | null>(null);
  /**
   * The ids of the series not drawn. A hidden series keeps its colour and its axis, and adds
   * nothing to the axis's domain.
   *
   * @since next
   */
  override readonly hiddenSeries = model<readonly string[]>([]);
  /**
   * Where the cursor stands on the horizontal axis — an instant or a number, as `x` says — or
   * `null` for none
   * ([0101](../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)).
   * The pointer, the keys and a reader move it; a change of the window or of the data leaves it
   * where it is.
   *
   * @since next
   */
  readonly cursor = model<number | null>(null);
  /**
   * How the pointer moves the cursor. `hover`: a mouse's cursor follows it and a press pins it,
   * a tap places it and a finger held still drags it. `tap`: only a press or a tap places it.
   * `none`: no cursor at all and no tab stop — a picture alone.
   *
   * @since next
   */
  readonly cursorMode = input<'hover' | 'tap' | 'none'>('hover');
  /**
   * The tooltip by the cursor: `auto` writes the time and every series' value, or stamps the
   * `pctChartTooltip` template when there is one; `none` draws none, for a legend that shows
   * the reading instead.
   *
   * @since next
   */
  readonly tooltip = input<'auto' | 'none'>('auto');

  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly document = inject(DOCUMENT);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  /**
   * The marks inside the chart, in the order they are written.
   *
   * @since next
   */
  readonly marks = contentChildren(PctMark, { descendants: true });
  private readonly axisConfigs = contentChildren(PctAxis, {
    descendants: true,
  });

  private readonly tooltipTemplate = contentChild(PctChartTooltip);
  private readonly tooltipBox =
    viewChild<ElementRef<HTMLElement>>('tooltipBox');
  private readonly rangeInput =
    viewChild<ElementRef<HTMLInputElement>>('rangeInput');

  protected readonly ids = {
    clip: nextPctId('pct-chart-clip'),
    description: nextPctId('pct-chart-description'),
    keys: nextPctId('pct-chart-keys'),
  };

  private readonly size = signal({ width: 0, height: 0 });
  private readonly font = signal({ family: 'sans-serif', px: 13 });
  /** The gap between an axis and its labels: the `axis-gap` token, read with the font. */
  private readonly gap = signal(6);
  private readonly pixelState = signal(1);
  override readonly pixel = this.pixelState.asReadonly();
  /** The scene knows its size: before that, on the server and in the first frame, a skeleton. */
  protected readonly measured = computed(
    () => this.size().width > 0 && this.size().height > 0,
  );

  /**
   * The locale the axes and the data table write in: `locale`, or the application's.
   *
   * @since next
   */
  readonly effectiveLocale = computed(() => this.locale() || this.appLocale);

  /**
   * Every series the marks declare, in the order of the marks.
   *
   * @since next
   */
  readonly series = computed<readonly PctSeriesSpec[]>(() =>
    this.marks().flatMap((mark) => mark.series()),
  );

  private readonly placesState = linkedSignal<
    readonly PctSeriesSpec[],
    ReadonlyMap<string, number>
  >({
    source: this.series,
    computation: (series, previous) => placesOf(series, previous?.value),
  });
  override readonly places = this.placesState.asReadonly();

  private readonly units = computed(() => this.series().map((s) => s.unit));

  private readonly slotsState = linkedSignal<
    readonly string[],
    ReadonlyMap<string, PctAxisSlot>
  >({
    source: this.units,
    computation: (units, previous) =>
      pctAxisSlots(units, previous?.value ?? new Map()),
  });
  /**
   * Where the value axis of each unit stands. A unit keeps its slot while a series of it
   * stays on the chart.
   *
   * @since next
   */
  readonly slots = this.slotsState.asReadonly();

  override readonly shown = computed<PctWindow | null>(() => {
    const window = this.window();
    if (window) return window;
    let from = Infinity;
    let to = -Infinity;
    for (const mark of this.marks()) {
      const span = mark.span();
      if (!span) continue;
      from = Math.min(from, span[0]);
      to = Math.max(to, span[1]);
    }
    if (!(from <= to)) return null;
    return from === to ? { from: from - 1, to: to + 1 } : { from, to };
  });

  private readonly lineHeight = computed(() => Math.ceil(this.font().px * 1.4));

  /**
   * What each series shows in the window, read once per window and per set of hidden series:
   * neither the height nor the width of the chart changes it.
   */
  private readonly extents = computed(() => {
    const shown = this.shown();
    const hidden = new Set(this.hiddenSeries());
    const extents = new Map<string, PctDomain | null>();
    if (!shown) return extents;
    for (const s of this.series()) {
      if (hidden.has(s.id)) continue;
      extents.set(s.id, this.markOf(s.id)?.extent(s.id, shown) ?? null);
    }
    return extents;
  });

  /** The plot's top and bottom: room for the units above it and the time below it. */
  private readonly rows = computed(() => {
    const { height } = this.size();
    const line = this.lineHeight();
    const top = this.slots().size > 0 ? line + this.gap() : EDGE;
    const bottom = height - line - this.gap();
    return { top, bottom: Math.max(top + 1, bottom) };
  });

  /** The value axes: domain, ticks and labels, before their horizontal place is known. */
  private readonly valueAxes = computed(() => {
    const extents = this.extents();
    const { top, bottom } = this.rows();
    const target = Math.max(2, Math.floor((bottom - top) / ROW));
    const format = (digits: number) =>
      pctQuantityFormat(this.effectiveLocale(), {
        fractionDigits: [0, digits],
      });
    const configs = new Map(this.axisConfigs().map((c) => [c.unit(), c]));
    const places = this.places();
    return [...this.slots()].map(([unit, slot]) => {
      const series = this.series().filter((s) => s.unit === unit);
      let domain: PctDomain;
      let ticks: readonly { at: number; text: string }[];
      if (unit === BOOLEAN) {
        domain = [0, 1];
        ticks = [
          { at: 0, text: this.texts().chartOff },
          { at: 1, text: this.texts().chartOn },
        ];
      } else {
        const config = configs.get(unit);
        domain = pctDomainOf(
          series.map((s) => extents.get(s.id) ?? null),
          {
            target,
            includeZero:
              config?.includeZero() || series.some((s) => s.fromZero),
            floor: config?.floor(),
            ceiling: config?.ceiling(),
          },
        );
        const values = pctTicks(domain, target);
        // A lone tick is written to the step the axis would have had: 0.5, not 1.
        const step =
          values.length > 1
            ? values[1] - values[0]
            : pctNiceStep(domain[1] - domain[0], target);
        const writer = format(pctFractionDigits(step));
        ticks = values.map((at) => ({ at, text: writer.format(at) }));
      }
      // The room of an axis: its widest label, or its unit written above it when that is wider.
      const width = Math.max(
        0,
        ...ticks.map((t) => this.measure(t.text)),
        unit === BOOLEAN ? 0 : this.measure(unit),
      );
      const dots = series
        .map((s) =>
          typeof s.color === 'string' ? null : (places.get(s.id) ?? null),
        )
        .filter((p): p is number => p !== null)
        .slice(0, 3);
      return { unit, slot, domain, ticks, width, places: dots };
    });
  });

  /** The plot's left and right, after the value axes have taken their room. */
  private readonly columns = computed(() => {
    const { width } = this.size();
    const room = (slot: PctAxisSlot) => {
      const axis = this.valueAxes().find((a) => a.slot === slot);
      return axis ? axis.width + this.gap() * 2 : 0;
    };
    const left = Math.max(EDGE, room('left') + room('left-outer'));
    const right = width - Math.max(EDGE, room('right') + room('right-outer'));
    return { left, right: Math.max(left + 1, right) };
  });

  override readonly plotWidth = computed(
    () => this.columns().right - this.columns().left,
  );

  /**
   * The value axes as drawn.
   *
   * @since next
   */
  readonly axes = computed<readonly PctAxisLayout[]>(() => {
    const { top, bottom } = this.rows();
    const { left, right } = this.columns();
    // An outer axis stands beyond the inner one's room, and on the plot's edge without one.
    const widthOf = (slot: PctAxisSlot) => {
      const axis = this.valueAxes().find((a) => a.slot === slot);
      return axis ? axis.width + this.gap() * 2 : 0;
    };
    return this.valueAxes().map((axis) => {
      const scale = pctLinear(axis.domain, [bottom, top]);
      const x =
        axis.slot === 'left'
          ? left
          : axis.slot === 'left-outer'
            ? left - widthOf('left')
            : axis.slot === 'right'
              ? right
              : right + widthOf('right');
      return {
        unit: axis.unit,
        slot: axis.slot,
        domain: axis.domain,
        scale,
        ticks: axis.ticks.map((t) => ({ ...t, y: scale.map(t.at) })),
        x,
        side: axis.slot.startsWith('left')
          ? ('start' as const)
          : ('end' as const),
        places: axis.places,
      };
    });
  });

  override readonly yScales = computed(
    () => new Map(this.axes().map((axis) => [axis.unit, axis.scale])),
  );

  override readonly xScale = computed<PctScale | null>(() => {
    const shown = this.shown();
    if (!shown || !this.measured()) return null;
    const { left, right } = this.columns();
    return pctLinear([shown.from, shown.to], [left, right]);
  });

  /** The ticks of the horizontal axis, thinned so no two labels touch. */
  protected readonly xTicks = computed<readonly PctXTick[]>(() => {
    const scale = this.xScale();
    const shown = this.shown();
    if (!scale || !shown) return [];
    const locale = this.effectiveLocale();
    let ticks: { at: number; text: string; label: PctTimeLabel | 'value' }[];
    if (this.x() === 'time') {
      const step = pctTimeStep(shown.to - shown.from, this.plotWidth());
      ticks = pctTimeTicks(shown, step, this.timeZone()).map((t) => ({
        at: t.at,
        label: t.label,
        text: pctTimeTickText(t, step, locale, this.timeZone()),
      }));
    } else {
      const values = pctTicks(
        [shown.from, shown.to],
        Math.max(2, Math.floor(this.plotWidth() / 80)),
      );
      const step = values.length > 1 ? values[1] - values[0] : 0;
      const writer = pctQuantityFormat(locale, {
        fractionDigits: [0, pctFractionDigits(step)],
      });
      ticks = values.map((at) => ({
        at,
        text: writer.format(at),
        label: 'value',
      }));
    }
    const { width } = this.size();
    const xs = ticks.map((t) => scale.map(t.at));
    const widths = ticks.map((t) => this.measure(t.text));
    // A label that would leave the chart's box stands inside it instead, against the edge.
    const middles = xs.map((x, i) =>
      Math.min(width - widths[i] / 2, Math.max(widths[i] / 2, x)),
    );
    const visible = pctThinLabels(middles, widths, this.gap() * 2);
    return ticks.map((t, i) => ({
      x: xs[i],
      middle: middles[i],
      text: t.text,
      label: t.label,
      shown: visible[i],
    }));
  });

  /** The plot's rectangle, for the clip and the grid. */
  protected readonly plot = computed(() => ({
    ...this.rows(),
    ...this.columns(),
  }));

  /** The lines of the grid: along the first axis's ticks (or every axis's), and the time's. */
  protected readonly gridLines = computed(() => {
    const grid = this.grid();
    if (grid === 'none') return { rows: [], columns: [] };
    const axes =
      grid === 'all'
        ? this.axes()
        : this.axes()
            .filter((a) => a.slot === 'left')
            .slice(0, 1);
    return {
      rows: axes.flatMap((a) => a.ticks.map((t) => t.y)),
      columns: this.xTicks().map((t) => t.x),
    };
  });

  private readonly valueFormat = computed(() =>
    pctQuantityFormat(this.effectiveLocale(), { fractionDigits: [0, 3] }),
  );

  /**
   * The time under the cursor, as precise as the window asks: seconds in a window of an hour
   * or less, the day in one of a day or more; `full` writes the day always, for a reader who
   * cannot glance at the axis.
   */
  private readonly timeFormats = computed(() => {
    const shown = this.shown();
    const span = shown ? shown.to - shown.from : 0;
    const clock: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: span <= HOUR ? '2-digit' : undefined,
      timeZone: this.timeZone(),
    };
    const day: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const locale = this.effectiveLocale();
    return {
      short: new Intl.DateTimeFormat(
        locale,
        span >= 24 * HOUR ? { ...day, ...clock } : clock,
      ),
      full: new Intl.DateTimeFormat(locale, {
        ...day,
        year: 'numeric',
        ...clock,
      }),
    };
  });

  /**
   * The reading under the cursor, `null` without one.
   *
   * @since next
   */
  readonly reading = computed<PctChartReading | null>(() => {
    const x = this.cursor();
    if (x === null) return null;
    const hidden = new Set(this.hiddenSeries());
    const places = this.places();
    const rows = this.series()
      .filter((s) => !hidden.has(s.id))
      .map((s): PctChartReadingRow => {
        const value = this.valueAt(s.id, x);
        const custom = typeof s.color === 'string';
        return {
          id: s.id,
          name: s.name,
          unit: s.unit,
          place: custom ? 'custom' : (places.get(s.id) ?? 1),
          color: custom ? (s.color as string) : null,
          value,
          text: this.writeValue(value, s.unit),
        };
      });
    return { x, text: this.writePosition(x, 'short'), rows };
  });

  /** What the cursor's range says: the full position and every value, or that there is none. */
  protected readonly valueText = computed(() => {
    const reading = this.reading();
    if (!reading) return this.texts().chartNoCursor;
    const position = this.writePosition(reading.x, 'full');
    const values = reading.rows.map((r) => `${r.name} ${r.text}`).join(', ');
    return values ? `${position}: ${values}` : position;
  });

  /**
   * The cursor's range, in distances from the window's start: its ends the window's and its
   * value the cursor's, or the middle while there is none (0103).
   */
  protected readonly range = computed(() => {
    const shown = this.shown();
    if (!shown || this.cursorMode() === 'none') return null;
    const cursor = this.cursor();
    const span = shown.to - shown.from;
    return {
      min: 0,
      max: span,
      value: cursor === null ? span / 2 : cursor - shown.from,
    };
  });

  private readonly tooltipWidth = signal(0);

  /**
   * The cursor as drawn: its line's position, a marker on every series with a value, and where
   * the tooltip stands — beside the line, on whichever side has the room.
   */
  protected readonly cursorView = computed(() => {
    const reading = this.reading();
    const scale = this.xScale();
    const shown = this.shown();
    if (!reading || !scale || !shown) return null;
    if (reading.x < shown.from || reading.x > shown.to) return null;
    const scales = this.yScales();
    const markers = reading.rows.flatMap((row) => {
      const y =
        row.value === null ? undefined : scales.get(row.unit)?.map(row.value);
      return y === undefined
        ? []
        : [{ id: row.id, place: row.place, color: row.color, y }];
    });
    const x = scale.map(reading.x);
    const { left, right } = this.columns();
    const width = this.tooltipWidth();
    return {
      x,
      markers,
      tooltip: {
        x: pctTooltipPlace(x, width, left, right).left,
        y: this.rows().top,
        measured: width > 0,
      },
    };
  });

  protected readonly customTooltip = computed(
    () => this.tooltipTemplate()?.template ?? null,
  );

  /** Whether the cursor stays where it was put, rather than following a mouse. */
  private readonly pinned = signal(false);
  /** A finger or a button down on the plot, until it lifts. */
  private press: {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    timer: ReturnType<typeof setTimeout> | undefined;
    held: boolean;
    moved: boolean;
  } | null = null;

  /**
   * Why nothing is drawn: `hidden` when every series is hidden, `empty` when none has a
   * reading in the window, `null` when something is drawn.
   */
  protected readonly nothing = computed<'empty' | 'hidden' | null>(() => {
    const series = this.series();
    const extents = this.extents();
    if ([...extents.values()].some((e) => e !== null)) return null;
    return series.length > 0 && extents.size === 0 ? 'hidden' : 'empty';
  });

  constructor() {
    super();
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.readMedium();
      this.readSize(this.host.clientWidth, this.host.clientHeight);
      // A web font that arrives after the first frame changes every label's width.
      const fonts = this.document.fonts;
      const onFonts = () => this.readMedium();
      fonts?.addEventListener?.('loadingdone', onFonts);
      destroyRef.onDestroy(() =>
        fonts?.removeEventListener?.('loadingdone', onFonts),
      );
      // Without an observer the size is read once: a chart in such an engine does not follow
      // its container, and draws at the size it first had.
      if (typeof ResizeObserver === 'undefined') return;
      // The content box, which a transform on an ancestor does not scale.
      const observer = new ResizeObserver(([entry]) => {
        this.readMedium();
        this.readSize(entry.contentRect.width, entry.contentRect.height);
      });
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    // The range's value after its ends, which the template has written by now: a value set
    // first is clamped to the ends it had then (0103).
    afterRenderEffect(() => {
      const input = this.rangeInput()?.nativeElement;
      const range = this.range();
      if (!input || !range) return;
      input.min = String(range.min);
      input.max = String(range.max);
      input.value = String(range.value);
    });
    // The tooltip is measured once drawn, and placed by its width: one frame hidden.
    afterRenderEffect(() => {
      this.reading();
      const width = this.tooltipBox()?.nativeElement.offsetWidth ?? 0;
      if (width !== this.tooltipWidth()) this.tooltipWidth.set(width);
    });
    destroyRef.onDestroy(() => clearTimeout(this.press?.timer));
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnnamed());
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnplaced());
    if (isDevMode()) afterRenderEffect(() => this.warnOnTwins());
  }

  /**
   * The value of a series at `x`, computed as the series is drawn: the reading that holds on
   * a step, the interpolation on a line, `null` in a gap.
   *
   * @since next
   */
  valueAt(id: string, x: number): number | null {
    return this.markOf(id)?.valueAt(id, x) ?? null;
  }

  /**
   * The mark that declares a series.
   *
   * @since next
   */
  markOf(id: string): PctMark | undefined {
    return this.marks().find((m) => m.series().some((s) => s.id === id));
  }

  /** The readings of every series shown, which the keys step along. */
  private shownColumns(): PctColumns[] {
    const hidden = new Set(this.hiddenSeries());
    return this.series()
      .filter((s) => !hidden.has(s.id))
      .flatMap((s) => {
        const readings = this.markOf(s.id)?.readings(s.id);
        return readings ? [readings] : [];
      });
  }

  /** The cursor one key further: the next reading that way, a pixel at least (0103). */
  private step(from: number | null, direction: 1 | -1): number | null {
    const shown = this.shown();
    if (!shown) return from;
    const pixel = (shown.to - shown.from) / Math.max(1, this.plotWidth());
    return (
      pctCursorStep(this.shownColumns(), from, direction, shown, pixel) ?? from
    );
  }

  private jump(target: number, direction: 1 | -1): number | null {
    const shown = this.shown();
    if (!shown) return this.cursor();
    return (
      pctCursorJump(this.shownColumns(), target, direction, shown) ??
      this.cursor()
    );
  }

  private place(x: number | null, pinned: boolean): void {
    this.pinned.set(pinned && x !== null);
    this.cursor.set(x);
  }

  /** The keys of the cursor's range: a range's own, each one landing on a reading (0103). */
  protected onKey(event: KeyboardEvent): void {
    const shown = this.shown();
    if (!shown) return;
    const from = this.cursor();
    const tenth = (shown.to - shown.from) / 10;
    let next: number | null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.step(from, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.step(from, -1);
        break;
      case 'PageUp':
        next = from === null ? this.step(null, 1) : this.jump(from + tenth, 1);
        break;
      case 'PageDown':
        next =
          from === null ? this.step(null, -1) : this.jump(from - tenth, -1);
        break;
      case 'Home':
        next = this.jump(shown.from, 1);
        break;
      case 'End':
        next = this.jump(shown.to, -1);
        break;
      case 'Escape':
      case 'Delete':
        // With no cursor the key is not the chart's: a dialog around it closes on Escape.
        if (from === null) return;
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.place(next, true);
  }

  /**
   * A change of the range's value that came without a key — a reader's swipe, an assistive
   * technology setting it: the cursor steps the way it was moved, and the range takes the
   * cursor's value back.
   */
  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const range = this.range();
    if (!range) return;
    const asked = Number(input.value);
    if (asked !== range.value)
      this.place(this.step(this.cursor(), asked > range.value ? 1 : -1), true);
    input.value = String(this.range()?.value ?? asked);
  }

  /** The position under the pointer, or `null` off the plot. */
  private pointedAt(event: PointerEvent): { x: number; px: number } | null {
    const scale = this.xScale();
    const layer = event.currentTarget as HTMLElement | null;
    if (!scale || !layer) return null;
    const box = layer.getBoundingClientRect();
    // The layer's own pixels, which a transform on an ancestor does not scale.
    const px =
      (event.clientX - box.left) *
      (box.width > 0 ? layer.offsetWidth / box.width : 1);
    const { left, right } = this.columns();
    if (px < left || px > right) return null;
    return { x: scale.invert(px), px };
  }

  protected onPointerMove(event: PointerEvent): void {
    const press = this.press;
    if (press && press.id === event.pointerId) {
      if (press.held) {
        const at = this.pointedAt(event);
        if (at) this.place(at.x, true);
      } else if (
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > SLOP
      ) {
        press.moved = true;
        clearTimeout(press.timer);
      }
      return;
    }
    if (
      event.pointerType !== 'mouse' ||
      this.cursorMode() !== 'hover' ||
      this.pinned()
    )
      return;
    this.cursor.set(this.pointedAt(event)?.x ?? null);
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (
      event.pointerType === 'mouse' &&
      this.cursorMode() === 'hover' &&
      !this.pinned()
    )
      this.cursor.set(null);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.cursorMode() === 'none' || !event.isPrimary || event.button > 0)
      return;
    clearTimeout(this.press?.timer);
    const layer = event.currentTarget as HTMLElement;
    const press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: undefined as ReturnType<typeof setTimeout> | undefined,
      held: false,
      moved: false,
    };
    this.press = press;
    if (event.pointerType === 'mouse') return;
    // A finger held still: the cursor follows it until it lifts.
    const at = this.pointedAt(event);
    press.timer = setTimeout(() => {
      if (this.press !== press || press.moved || !at) return;
      press.held = true;
      layer.setPointerCapture?.(press.id);
      this.place(at.x, true);
    }, HOLD);
  }

  protected onPointerUp(event: PointerEvent): void {
    const press = this.press;
    if (!press || press.id !== event.pointerId) return;
    clearTimeout(press.timer);
    this.press = null;
    if (press.held || press.moved) return;
    // A tap, or a click: on the pinned cursor's line it lets go, anywhere else it pins.
    const at = this.pointedAt(event);
    const scale = this.xScale();
    const cursor = this.cursor();
    if (
      this.pinned() &&
      cursor !== null &&
      scale &&
      at &&
      Math.abs(scale.map(cursor) - at.px) <= NEAR
    ) {
      this.place(null, false);
      return;
    }
    if (at) this.place(at.x, true);
  }

  protected onPointerCancel(event: PointerEvent): void {
    if (this.press?.id !== event.pointerId) return;
    clearTimeout(this.press.timer);
    this.press = null;
  }

  private writeValue(value: number | null, unit: string): string {
    if (value === null) return this.texts().chartGap;
    if (unit === BOOLEAN)
      return value >= 0.5 ? this.texts().chartOn : this.texts().chartOff;
    const number = this.valueFormat().format(value);
    return unit ? `${number} ${unit}` : number;
  }

  private writePosition(x: number, form: 'short' | 'full'): string {
    if (this.x() !== 'time') return this.valueFormat().format(x);
    return this.timeFormats()[form].format(x);
  }

  private readSize(rawWidth: number, rawHeight: number): void {
    const width = Math.round(rawWidth);
    const height = Math.round(rawHeight);
    const now = this.size();
    if (now.width !== width || now.height !== height)
      this.size.set({ width, height });
  }

  /** The font, the gap and the pixel ratio: what the skin and the screen decide. */
  private readMedium(): void {
    const view = this.document.defaultView;
    const style = view?.getComputedStyle(this.host);
    const px = parseFloat(style?.fontSize ?? '') || 13;
    const family = style?.fontFamily || 'sans-serif';
    const now = this.font();
    if (now.px !== px || now.family !== family) this.font.set({ family, px });
    const gap = parseFloat(
      style?.getPropertyValue('--pct-chart-axis-gap') ?? '',
    );
    if (gap >= 0) this.gap.set(gap);
    this.pixelState.set(1 / (view?.devicePixelRatio || 1));
  }

  /** A label's width: `measureText`, which matches the SVG's own width (0100, P3). */
  private measure(text: string): number {
    if (measuring === undefined) {
      measuring =
        this.document.createElement('canvas').getContext?.('2d') ?? null;
    }
    const { family, px } = this.font();
    if (!measuring) return text.length * px * 0.6;
    measuring.font = `${px}px ${family}`;
    return measuring.measureText(text).width;
  }

  private warnOnUnplaced(): void {
    const slots = this.slots();
    const lost = this.series().filter((s) => !slots.has(s.unit));
    if (lost.length === 0) return;
    console.warn(
      `[pct-chart] ${lost.map((s) => `"${s.name}" (${s.unit || 'no unit'})`).join(', ')} ` +
        'has no axis: a chart holds four units at most, and the series is not drawn. Ask ' +
        '`pctAxisFits` before adding one.',
    );
  }

  private warnOnTwins(): void {
    const seen = new Set<string>();
    const twins = new Set<string>();
    for (const s of this.series()) (seen.has(s.id) ? twins : seen).add(s.id);
    if (twins.size === 0) return;
    console.warn(
      `[pct-chart] Two series share the id ${[...twins].map((id) => `"${id}"`).join(', ')}. ` +
        'A series is told apart by its `id` (its `name` when unset): give each its own.',
    );
  }

  private warnOnUnnamed(): void {
    if (this.ariaLabel().trim() || this.ariaLabelledby().trim()) return;
    console.warn(
      '[pct-chart] A chart with neither `ariaLabel` nor `ariaLabelledby`. The picture is ' +
        'announced by its name, so a reader meets an image with none.',
    );
  }
}

/**
 * The palette place of each series: kept for a series already placed, the lowest free place
 * for a new one, from 1 to 8 and then round again. A series with a place of its own (a number)
 * takes it.
 */
function placesOf(
  series: readonly PctSeriesSpec[],
  previous: ReadonlyMap<string, number> | undefined,
): ReadonlyMap<string, number> {
  const places = new Map<string, number>();
  // A place the consumer gives wins; a place kept from before stays unless one of those took
  // it; every other series takes the lowest free place, and round again past eight.
  for (const s of series)
    if (typeof s.color === 'number') places.set(s.id, s.color);
  const given = new Set(places.values());
  for (const s of series) {
    const kept = previous?.get(s.id);
    if (!places.has(s.id) && kept !== undefined && !given.has(kept))
      places.set(s.id, kept);
  }
  for (const s of series) {
    if (places.has(s.id)) continue;
    const taken = new Set(places.values());
    const free = [1, 2, 3, 4, 5, 6, 7, 8].find((p) => !taken.has(p));
    places.set(s.id, free ?? (places.size % 8) + 1);
  }
  return places;
}
