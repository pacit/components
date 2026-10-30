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
  PctAnnouncer,
  pctQuantityFormat,
} from '@pacit/components/core';
import { PctSkeleton } from '@pacit/components/skeleton';
import { PctChartZoom } from './chart-zoom';
import type { PctColumns } from './model/columns';
import { pctCursorJump, pctCursorStep } from './model/cursor';
import {
  pctIntervals,
  pctIntervalText,
  type PctInterval,
} from './model/intervals';
import { pctStack, type PctStacked } from './model/stack';
import {
  PCT_GESTURE_IDLE,
  pctGestureStep,
  type PctGestureAction,
  type PctGestureState,
} from './model/gestures';
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
import {
  pctWindowFollow,
  pctWindowTransform,
  type PctWindow,
  type PctWindowChange,
} from './model/window';
import {
  PctChartAlign,
  PctChartScene,
  PctMark,
  type PctSeriesSpec,
  type PctSwatchContext,
  type PctMarkNote,
} from './scene';

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
  /** The ticks: each one's value, its pixel along the axis, and its text. */
  readonly ticks: readonly {
    readonly at: number;
    readonly px: number;
    readonly text: string;
  }[];
  /**
   * The pixel the axis line stands at across the plot — an x in a vertical chart, a y in a
   * horizontal one — and the side its labels are on: `start` is left or below.
   */
  readonly line: number;
  readonly side: 'start' | 'end';
  /** The palette places of the series on this axis, at most three, for the dots by the unit. */
  readonly places: readonly number[];
}

/** A tick of the x axis as the scene draws it. */
interface PctXTick {
  /** The pixel along the axis. */
  readonly px: number;
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
  /** What the marks add after the rows — a compared period's difference — or none. */
  readonly notes: readonly PctMarkNote[];
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
/** The length of a tick mark, in pixels. */
const TICK = 4;
/** A value label's room along a horizontal axis. */
const LABEL = 80;
/** The dots of the series by a unit, at most. */
const DOTS = 3;

/** A line of the drawing, in the layer's pixels. */
interface PctSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}
/** How long a finger rests before the cursor follows it, in milliseconds. */
const HOLD = 300;
/** How near the cursor's line a tap clears it, in pixels. */
const NEAR = 12;
const HOUR = 3_600_000;
/** How long the window rests before its new range is announced, in milliseconds. */
const SETTLE = 300;
/** The shortest window on a time axis unless the consumer says otherwise: two minutes. */
const MIN_SPAN_TIME = 120_000;
/** How much of the window the arrows with Shift move it. */
const STEP = 0.1;

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
  imports: [NgTemplateOutlet, PctSkeleton, PctChartZoom],
  templateUrl: './chart.html',
  styleUrl: './chart.scss',
  providers: [{ provide: PctChartScene, useExisting: PctChart }],
  host: {
    '[class.horizontal]': 'horizontal()',
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
  readonly x = input<'time' | 'linear' | 'band'>('time');
  /**
   * The categories of a `band` axis, in order: each a band the bars stand in, labelled by it.
   * A series on such an axis gives `x` as the category's index (its middle is `index + 0.5`).
   *
   * @since next
   */
  readonly categories = input<readonly string[]>([]);
  /**
   * The calendar interval the bars of a time axis stand in — each bar a whole hour, day,
   * week, month or year of `timeZone`. A time axis without one holds no bars.
   *
   * @since next
   */
  override readonly interval = input<PctInterval | undefined>(undefined);
  /**
   * The zone whose wall clock the time axis reads: its ticks fall on its whole hours and
   * midnights. The runtime's own when unset — under SSR the server's, so pass it.
   *
   * @since next
   */
  readonly timeZone = input<string | undefined>(undefined);

  /**
   * Which way the x axis runs. `vertical`, the default, lays it along the bottom with the
   * values up the sides; `horizontal` lays it down the left side with the values along the
   * bottom — bars grow to the right, the cursor's line lies across, a drag up and down pans.
   *
   * @since next
   */
  override readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  protected readonly horizontal = computed(
    () => this.orientation() === 'horizontal',
  );
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
   * The interval selected on the chart, or `null`: a tap on a bar's band selects it and a
   * second lets it go, as Enter and Space do at the cursor; the application sets it too
   * ([0101](../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)).
   *
   * @since next
   */
  override readonly selected = model<PctWindow | null>(null);
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
  /**
   * How the window moves: `x` — a drag and a wheel with Ctrl pan and zoom it along the
   * horizontal axis, two fingers pinch it, a double tap returns it, the keys and the zoom
   * buttons do the same; `none` — it stays where the application puts it, and a drag across
   * the plot is the page's.
   *
   * @since next
   */
  readonly zoom = input<'x' | 'none'>('x');
  /**
   * The lines draw their dash patterns always (`all`), or only where the colours are gone,
   * under forced colours (`color`, the default): eight dashed lines are noise where the
   * colours tell them apart, and the legend and the tooltip draw the pattern beside each name
   * either way ([0102](../../../../docs/decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)).
   *
   * @since next
   */
  override readonly distinct = input<'color' | 'all'>('color');
  /**
   * Where the window returns on a double tap, the `0` key and the zoom buttons' last one: a
   * window, or `null` for all the data.
   *
   * @since next
   */
  readonly defaultWindow = input<PctWindow | null>(null);
  /**
   * The chart draws its zoom buttons over the plot's corner while `zoom` is `x`: the
   * single-pointer twin of the pinch and the drag. Off, render `pct-chart-zoom` elsewhere, or
   * buttons of your own on `zoomBy`, `panBy` and `home` — removing them removes the twin.
   *
   * @since next
   */
  readonly zoomButtons = input(true, { transform: booleanAttribute });
  /**
   * How far the window can go: it stops at a limit and keeps its span. The data's own span
   * when unset.
   *
   * @since next
   */
  readonly limits = input<PctWindow | null>(null);
  /**
   * The narrowest window, in the axis's units: two minutes on a time axis, a millionth of the
   * data's span on a numeric one, when unset.
   *
   * @since next
   */
  readonly minSpan = input<number | undefined>(undefined);
  /**
   * The window follows the present: while its end touches `now()`, it moves with the clock
   * every second and keeps its span. A window the reader moved back stays where it was put.
   *
   * @since next
   */
  readonly follow = input(false, { transform: booleanAttribute });
  /**
   * The clock `follow` reads: `Date.now` unless a test or a replay gives another.
   *
   * @since next
   */
  readonly now = input<() => number>(() => Date.now());

  protected readonly texts = inject(PCT_TEXTS);
  /** The chart itself, for the zoom bar it draws. */
  protected readonly self = this;
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

  /**
   * The span of every series' data, from the first reading to the last (or the end a step is
   * held to); `null` while there is none.
   *
   * @since next
   */
  readonly dataSpan = computed<PctWindow | null>(() => {
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

  override readonly shown = computed<PctWindow | null>(() => {
    const window = this.window();
    if (window) return window;
    // A band axis is as wide as its categories, whatever the data say.
    if (this.x() === 'band') {
      const count = this.categories().length;
      return count > 0 ? { from: 0, to: count } : null;
    }
    return this.dataSpan();
  });

  override readonly bands = computed<readonly PctWindow[]>(() => {
    const shown = this.shown();
    if (!shown) return [];
    if (this.x() === 'band')
      return this.categories().map((_, i) => ({ from: i, to: i + 1 }));
    const interval = this.interval();
    if (this.x() !== 'time' || !interval) return [];
    return pctIntervals(shown, interval, this.timeZone());
  });

  /** The groups of bars on the scene, in the order of their marks: side by side in a band. */
  private readonly groups = computed(() => {
    const groups: string[] = [];
    for (const mark of this.marks()) {
      const band = mark.band();
      if (band && !groups.includes(band.group)) groups.push(band.group);
    }
    return groups;
  });

  /**
   * See `PctChartScene.groupOf`.
   *
   * @since next
   */
  override groupOf(group: string): {
    readonly index: number;
    readonly count: number;
  } {
    const groups = this.groups();
    return { index: Math.max(0, groups.indexOf(group)), count: groups.length };
  }

  /** The stacks on the scene: for each, the series on it in order, and their stacked values. */
  private readonly stacks = computed(() => {
    const bands = this.bands();
    const hidden = new Set(this.hiddenSeries());
    const members = new Map<string, string[]>();
    const values = new Map<string, (readonly (number | null)[])[]>();
    for (const mark of this.marks()) {
      const stack = mark.band()?.stack;
      if (!stack) continue;
      for (const s of mark.series()) {
        if (hidden.has(s.id)) continue;
        members.set(stack, [...(members.get(stack) ?? []), s.id]);
        values.set(stack, [
          ...(values.get(stack) ?? []),
          mark.valuesIn(s.id, bands),
        ]);
      }
    }
    return new Map(
      [...members].map(([stack, ids]) => [
        stack,
        { ids, stacked: pctStack(values.get(stack) ?? []) },
      ]),
    );
  });

  /**
   * See `PctChartScene.stackedOf`.
   *
   * @since next
   */
  override stackedOf(
    stack: string,
    id: string,
  ): readonly (PctStacked | null)[] | null {
    const found = this.stacks().get(stack);
    if (!found) return null;
    const at = found.ids.indexOf(id);
    return at < 0 ? null : found.stacked[at];
  }

  override readonly lineHeight = computed(() =>
    Math.ceil(this.font().px * 1.4),
  );

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

  /**
   * The plot's top and bottom. Vertical: room for the units above it and the time below it.
   * Horizontal: a line of labels for each value axis along the bottom (`left` slots) and the
   * top (`right` slots).
   */
  private readonly rows = computed(() => {
    const { height } = this.size();
    const line = this.lineHeight();
    if (this.horizontal()) {
      const slots = [...this.slots().values()];
      const room = (side: 'left' | 'right') =>
        slots.filter((s) => s.startsWith(side)).length * (line + this.gap());
      const top = Math.max(EDGE, room('right'));
      const bottom = height - Math.max(EDGE, room('left'));
      return { top, bottom: Math.max(top + 1, bottom) };
    }
    const top = this.slots().size > 0 ? line + this.gap() : EDGE;
    const bottom = height - line - this.gap();
    return { top, bottom: Math.max(top + 1, bottom) };
  });

  /** The value axes: domain, ticks and labels, before their horizontal place is known. */
  private readonly valueAxes = computed(() => {
    const extents = this.extents();
    const { top, bottom } = this.rows();
    // A tick every ROW pixels up the side, or every LABEL pixels along the bottom.
    const target = this.horizontal()
      ? Math.max(2, Math.floor(this.acrossLength() / LABEL))
      : Math.max(2, Math.floor((bottom - top) / ROW));
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
  /**
   * The room this chart's value axes take on each side of the plot, in pixels — what
   * `pctChartSync` reads to give charts on one time axis the same plot edges.
   *
   * @since next
   */
  readonly axisRoom = computed(() => {
    if (this.horizontal()) {
      // The x axis's labels on the left; on the right each value axis's unit and its dots.
      const labels = Math.max(
        0,
        ...this.xTickDefs().map((t) => this.measure(t.text)),
      );
      const units = Math.max(
        0,
        ...[...this.slots().keys()].map((unit) =>
          unit === BOOLEAN ? 0 : this.measure(unit) + 6 + DOTS * 8,
        ),
      );
      return {
        left: Math.max(EDGE, labels + TICK + this.gap() * 2),
        right: Math.max(EDGE, units + this.gap()),
      };
    }
    const room = (slot: PctAxisSlot) => {
      const axis = this.valueAxes().find((a) => a.slot === slot);
      return axis ? axis.width + this.gap() * 2 : 0;
    };
    return {
      left: Math.max(EDGE, room('left') + room('left-outer')),
      right: Math.max(EDGE, room('right') + room('right-outer')),
    };
  });

  /** Charts aligned by `pctChartSync` around this one. */
  private readonly align = inject(PctChartAlign, { optional: true });

  private readonly columns = computed(() => {
    const { width } = this.size();
    const own = this.axisRoom();
    const shared = this.align?.room();
    const left = Math.max(own.left, shared?.left ?? 0);
    const right = width - Math.max(own.right, shared?.right ?? 0);
    return { left, right: Math.max(left + 1, right) };
  });

  /** The pixels the value axes run across: the plot's height, or its width when horizontal. */
  private readonly acrossLength = computed(() =>
    this.horizontal()
      ? this.columns().right - this.columns().left
      : this.rows().bottom - this.rows().top,
  );

  /** The x axis's pixel range, in its own direction: left to right, or top to bottom. */
  private readonly alongRange = computed<readonly [number, number]>(() =>
    this.horizontal()
      ? [this.rows().top, this.rows().bottom]
      : [this.columns().left, this.columns().right],
  );

  override readonly plotWidth = computed(() => {
    const [start, end] = this.alongRange();
    return end - start;
  });

  /**
   * The value axes as drawn.
   *
   * @since next
   */
  readonly axes = computed<readonly PctAxisLayout[]>(() => {
    const { top, bottom } = this.rows();
    const { left, right } = this.columns();
    const horizontal = this.horizontal();
    // An outer axis stands beyond the inner one's room, and on the plot's edge without one.
    const widthOf = (slot: PctAxisSlot) => {
      const axis = this.valueAxes().find((a) => a.slot === slot);
      if (!axis) return 0;
      return horizontal
        ? this.lineHeight() + this.gap()
        : axis.width + this.gap() * 2;
    };
    // The inner edges: left and right, or, turned, bottom (`left` slots) and top.
    const start = horizontal ? bottom : left;
    const end = horizontal ? top : right;
    const out = horizontal ? 1 : -1;
    return this.valueAxes().map((axis) => {
      const scale = pctLinear(
        axis.domain,
        horizontal ? [left, right] : [bottom, top],
      );
      const line =
        axis.slot === 'left'
          ? start
          : axis.slot === 'left-outer'
            ? start + out * widthOf('left')
            : axis.slot === 'right'
              ? end
              : end - out * widthOf('right');
      return {
        unit: axis.unit,
        slot: axis.slot,
        domain: axis.domain,
        scale,
        ticks: axis.ticks.map((t) => ({ ...t, px: scale.map(t.at) })),
        line,
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
    return pctLinear([shown.from, shown.to], this.alongRange());
  });

  /** The ticks of the x axis before their pixels: where each stands and what it says. */
  private readonly xTickDefs = computed<
    readonly { at: number; text: string; label: PctTimeLabel | 'value' }[]
  >(() => {
    const shown = this.shown();
    if (!shown || !this.measured()) return [];
    const locale = this.effectiveLocale();
    let ticks: { at: number; text: string; label: PctTimeLabel | 'value' }[];
    const interval = this.interval();
    if (this.x() === 'band') {
      // One tick in the middle of each band, labelled with its category.
      ticks = this.categories().map((text, i) => ({
        at: i + 0.5,
        text,
        label: 'value',
      }));
    } else if (this.x() === 'time' && interval && this.bands().length > 0) {
      // Bars: one tick per interval, in its middle, labelled as the interval is.
      ticks = this.bands().map((band) => ({
        at: (band.from + band.to) / 2,
        text: pctIntervalText(band.from, interval, locale, this.timeZone()),
        label: 'time',
      }));
    } else if (this.x() === 'time') {
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
    return ticks;
  });

  /** The ticks of the x axis, thinned so no two labels touch. */
  protected readonly xTicks = computed<readonly PctXTick[]>(() => {
    const scale = this.xScale();
    const ticks = this.xTickDefs();
    if (!scale) return [];
    const horizontal = this.horizontal();
    const { width, height } = this.size();
    const pxs = ticks.map((t) => scale.map(t.at));
    // A label takes its width along the bottom, and a line's height down the side.
    const sizes = ticks.map((t) =>
      horizontal ? this.lineHeight() : this.measure(t.text),
    );
    const edge = horizontal ? height : width;
    // A label that would leave the chart's box stands inside it instead, against the edge.
    const middles = pxs.map((px, i) =>
      Math.min(edge - sizes[i] / 2, Math.max(sizes[i] / 2, px)),
    );
    const visible = pctThinLabels(
      middles,
      sizes,
      horizontal ? 0 : this.gap() * 2,
    );
    return ticks.map((t, i) => ({
      px: pxs[i],
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
    const { top, bottom, left, right } = this.plot();
    const horizontal = this.horizontal();
    // A `row` follows a value tick, a `column` an x tick, whichever way each runs.
    const across = (px: number): PctSegment =>
      horizontal
        ? { x1: px, x2: px, y1: top, y2: bottom }
        : { x1: left, x2: right, y1: px, y2: px };
    const along = (px: number): PctSegment =>
      horizontal
        ? { x1: left, x2: right, y1: px, y2: px }
        : { x1: px, x2: px, y1: top, y2: bottom };
    return {
      rows: axes.flatMap((a) => a.ticks.map((t) => across(t.px))),
      columns: this.xTicks().map((t) => along(t.px)),
    };
  });

  /** The x axis as drawn: its base line, a tick mark per tick, and the labels shown. */
  protected readonly xAxisView = computed(() => {
    const { top, bottom, left, right } = this.plot();
    const horizontal = this.horizontal();
    const base: PctSegment = horizontal
      ? { x1: left, x2: left, y1: top, y2: bottom }
      : { x1: left, x2: right, y1: bottom, y2: bottom };
    const ticks = this.xTicks();
    return {
      base,
      marks: ticks.map((t): PctSegment =>
        horizontal
          ? { x1: left - TICK, x2: left, y1: t.px, y2: t.px }
          : { x1: t.px, x2: t.px, y1: bottom, y2: bottom + TICK },
      ),
      labels: ticks
        .filter((t) => t.shown)
        .map((t) =>
          horizontal
            ? {
                x: left - TICK - 2,
                y: t.middle,
                anchor: 'end' as const,
                baseline: 'middle' as const,
                text: t.text,
                label: t.label,
              }
            : {
                x: t.middle,
                y: bottom + TICK + 2,
                anchor: 'middle' as const,
                baseline: 'hanging' as const,
                text: t.text,
                label: t.label,
              },
        ),
    };
  });

  /** The value axes as drawn: base line, labels, the unit and the dots of the series. */
  protected readonly axisViews = computed(() =>
    this.axes().map((axis) => {
      const { top, bottom, left, right } = this.plot();
      const horizontal = this.horizontal();
      const below = axis.side === 'start';
      const base: PctSegment = horizontal
        ? { x1: left, x2: right, y1: axis.line, y2: axis.line }
        : { x1: axis.line, x2: axis.line, y1: top, y2: bottom };
      // Horizontal: the labels under (or over) the line, the unit after its end.
      const labelY = below ? axis.line + TICK + 2 : axis.line - TICK - 2;
      const baseline = below ? ('hanging' as const) : ('auto' as const);
      const named = axis.unit && axis.unit !== BOOLEAN;
      return {
        unit: axis.unit,
        slot: axis.slot,
        base,
        labels: axis.ticks.map((t) =>
          horizontal
            ? {
                x: t.px,
                y: labelY,
                anchor: 'middle' as const,
                baseline,
                text: t.text,
              }
            : {
                x: below ? axis.line - 6 : axis.line + 6,
                y: t.px,
                anchor: below ? ('end' as const) : ('start' as const),
                baseline: 'middle' as const,
                text: t.text,
              },
        ),
        unitLabel: named
          ? horizontal
            ? { x: right + 6, y: labelY, anchor: 'start' as const, baseline }
            : {
                x: below ? axis.line - 6 : axis.line + 6,
                y: 0,
                anchor: below ? ('end' as const) : ('start' as const),
                baseline: 'hanging' as const,
              }
          : null,
        dots: axis.places.map((place, i) =>
          horizontal
            ? {
                place,
                cx:
                  right +
                  6 +
                  (named ? this.measure(axis.unit) + 6 : 0) +
                  2 +
                  i * 8,
                cy: labelY + (below ? 1 : -1) * (this.lineHeight() / 2),
              }
            : {
                place,
                cx: below ? axis.line - 2 - i * 8 : axis.line + 2 + i * 8,
                cy: top - 6,
              },
        ),
      };
    }),
  );

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
    const notes = this.marks().flatMap((m) => m.notesAt(x));
    return { x, text: this.writePosition(x, 'short'), rows, notes };
  });

  /** What the cursor's range says: the full position and every value, or that there is none. */
  protected readonly valueText = computed(() => {
    const reading = this.reading();
    if (!reading) return this.texts().chartNoCursor;
    const position = this.writePosition(reading.x, 'full');
    const values = [...reading.rows, ...reading.notes]
      .map((r) => `${r.name} ${r.text}`)
      .join(', ');
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

  private readonly tooltipSize = signal({ width: 0, height: 0 });

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
    const horizontal = this.horizontal();
    const along = scale.map(reading.x);
    const markers = reading.rows.flatMap((row) => {
      const across =
        row.value === null ? undefined : scales.get(row.unit)?.map(row.value);
      return across === undefined
        ? []
        : [
            {
              id: row.id,
              place: row.place,
              color: row.color,
              x: horizontal ? across : along,
              y: horizontal ? along : across,
            },
          ];
    });
    const { left, right } = this.columns();
    const { top, bottom } = this.rows();
    const { width, height } = this.tooltipSize();
    // The line across the plot at the cursor; the tooltip beside it, on the side with room.
    const line = horizontal
      ? { x: left, y: along, width: right - left, height: 0 }
      : { x: along, y: top, width: 0, height: bottom - top };
    const tooltip = horizontal
      ? {
          x: left + this.gap(),
          y:
            along + NEAR + height <= bottom
              ? along + NEAR
              : Math.max(top, along - NEAR - height),
        }
      : { x: pctTooltipPlace(along, width, left, right).left, y: top };
    return {
      along,
      line,
      markers,
      tooltip: { ...tooltip, measured: width > 0 },
    };
  });

  protected readonly customTooltip = computed(
    () => this.tooltipTemplate()?.template ?? null,
  );

  /** Whether the cursor stays where it was put, rather than following a mouse. */
  private readonly pinned = signal(false);
  /** The gesture under way on the plot, and the timer that raises a held finger. */
  private gesture: PctGestureState = PCT_GESTURE_IDLE;
  private holdTimer: ReturnType<typeof setTimeout> | undefined;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly announcer = inject(PctAnnouncer);
  /** The window's range as last said, so the same one is not said twice. */
  private announced = '';

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
      const box = this.tooltipBox()?.nativeElement;
      const width = box?.offsetWidth ?? 0;
      const height = box?.offsetHeight ?? 0;
      const now = this.tooltipSize();
      if (width !== now.width || height !== now.height)
        this.tooltipSize.set({ width, height });
    });
    destroyRef.onDestroy(() => {
      clearTimeout(this.holdTimer);
      clearTimeout(this.settleTimer);
    });
    // The present, in the browser alone: a window that touches it moves with the clock.
    afterRenderEffect((onCleanup) => {
      if (!this.follow()) return;
      const clock = this.now();
      let before = clock();
      const timer = setInterval(() => {
        const now = clock();
        const window = this.window();
        if (window) {
          const next = pctWindowFollow(window, before, now);
          if (next !== window) this.window.set(next);
        }
        before = now;
      }, 1000);
      onCleanup(() => clearInterval(timer));
    });
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

  /** The swatch template of the mark that declares a series, for the tooltip and the markers. */
  protected swatchOf(id: string): TemplateRef<PctSwatchContext> | null {
    return this.markOf(id)?.swatch() ?? null;
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
    if (this.onWindowKey(event)) {
      event.preventDefault();
      return;
    }
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
      case 'Enter':
      case ' ':
        // Selects the band under the cursor, where a bar stands; without one the key passes.
        if (from === null || !this.bandAt(from)) return;
        event.preventDefault();
        this.select(from);
        return;
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

  /**
   * Zooms the window by `factor` — 2 shows half as much — about `anchor`, a position on the
   * horizontal axis: the cursor when it is in the window, the middle otherwise.
   *
   * @since next
   */
  zoomBy(factor: number, anchor?: number): void {
    const shown = this.shown();
    if (!shown) return;
    const cursor = this.cursor();
    const about =
      anchor ??
      (cursor !== null && cursor >= shown.from && cursor <= shown.to
        ? cursor
        : (shown.from + shown.to) / 2);
    this.move({
      factor,
      anchor: (about - shown.from) / (shown.to - shown.from),
    });
  }

  /**
   * Moves the window by `fraction` of its span: −0.1 a tenth earlier, 1 a whole window later.
   *
   * @since next
   */
  panBy(fraction: number): void {
    this.move({ shift: fraction });
  }

  /**
   * Returns the window to `defaultWindow`.
   *
   * @since next
   */
  home(): void {
    this.window.set(this.defaultWindow());
    this.announceWindow();
  }

  /** The window after a change, held to the limits and the narrowest span. */
  private move(change: PctWindowChange): void {
    const shown = this.shown();
    if (!shown) return;
    const limits = this.limits() ?? this.dataSpan();
    const minSpan =
      this.minSpan() ??
      (this.x() === 'time'
        ? MIN_SPAN_TIME
        : ((limits ?? shown).to - (limits ?? shown).from) / 1e6);
    this.window.set(pctWindowTransform(shown, change, limits, minSpan));
    this.announceWindow();
  }

  /**
   * The window's range, said once it rests: a reader hears where the window went, not every
   * step of the way there.
   */
  private announceWindow(): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      const shown = this.shown();
      if (!shown) return;
      const range = `${this.writePosition(shown.from, 'full')} – ${this.writePosition(shown.to, 'full')}`;
      if (range === this.announced) return;
      if (this.announced) this.announcer.retract(this.announced);
      this.announced = range;
      this.announcer.announce(range);
    }, SETTLE);
  }

  /** The keys of the window, on the cursor's range (0103): zoom, pan, home. */
  private onWindowKey(event: KeyboardEvent): boolean {
    if (this.zoom() === 'none') return false;
    if (event.shiftKey && event.key === 'ArrowLeft') this.panBy(-STEP);
    else if (event.shiftKey && event.key === 'ArrowRight') this.panBy(STEP);
    else if (event.key === '+' || event.key === '=') this.zoomBy(2);
    else if (event.key === '-' || event.key === '_') this.zoomBy(0.5);
    else if (event.key === '0') this.home();
    else return false;
    return true;
  }

  /** Where the pointer is in the layer's own pixels, which a transform on an ancestor does not scale. */
  private layerPoint(event: PointerEvent | WheelEvent): {
    x: number;
    y: number;
  } | null {
    const layer = event.currentTarget as HTMLElement | null;
    if (!layer) return null;
    const box = layer.getBoundingClientRect();
    const scale = box.width > 0 ? layer.offsetWidth / box.width : 1;
    return {
      x: (event.clientX - box.left) * scale,
      y: (event.clientY - box.top) * scale,
    };
  }

  /** The position under a pixel of the layer, or `null` off the plot. */
  private positionAt(px: number): number | null {
    const scale = this.xScale();
    const [start, end] = this.alongRange();
    if (!scale || px < start || px > end) return null;
    return scale.invert(px);
  }

  private feed(
    event: PointerEvent,
    type: 'down' | 'move' | 'up' | 'cancel',
  ): void {
    const point = this.layerPoint(event);
    if (!point) return;
    // The machine reads `x` along the x axis, whichever way it runs.
    const horizontal = this.horizontal();
    const { state, action } = pctGestureStep(this.gesture, {
      type,
      id: event.pointerId,
      x: horizontal ? point.y : point.x,
      y: horizontal ? point.x : point.y,
      mouse: event.pointerType === 'mouse',
      at: event.timeStamp,
    });
    this.gesture = state;
    if (action)
      this.act(action, event.currentTarget as HTMLElement, event.pointerId);
  }

  /** What a gesture asked for, done. */
  private act(
    action: PctGestureAction,
    layer: HTMLElement,
    pointer: number,
  ): void {
    const width = Math.max(1, this.plotWidth());
    const [start] = this.alongRange();
    const moves = this.zoom() !== 'none';
    const cursors = this.cursorMode() !== 'none';
    switch (action.type) {
      case 'pan':
        if (moves) this.move({ shift: -action.dx / width });
        return;
      case 'pinch':
        if (moves)
          this.move({
            factor: action.factor,
            anchor: (action.about - start) / width,
            shift: -action.dx / width,
          });
        return;
      case 'double':
        if (moves) this.home();
        return;
      case 'hold': {
        const x = this.positionAt(action.x);
        if (!cursors || x === null) return;
        layer.setPointerCapture?.(pointer);
        this.place(x, true);
        return;
      }
      case 'drag': {
        const x = this.positionAt(action.x);
        if (cursors && x !== null) this.place(x, true);
        return;
      }
      case 'tap': {
        // A press on a bar picks it, and on a band selects it, whatever the cursor does.
        const at = this.positionAt(action.x);
        if (at !== null) {
          // The marks read the layer's own pixels, not the machine's.
          const [px, py] = this.horizontal()
            ? [action.y, action.x]
            : [action.x, action.y];
          for (const mark of this.marks())
            for (const s of mark.series()) if (mark.pickAt(s.id, px, py)) break;
          this.select(at);
        }
        if (!cursors) return;
        // On the pinned cursor's line a tap lets go; anywhere else on the plot it pins.
        const scale = this.xScale();
        const cursor = this.cursor();
        if (
          this.pinned() &&
          cursor !== null &&
          scale &&
          Math.abs(scale.map(cursor) - action.x) <= NEAR
        ) {
          this.place(null, false);
          return;
        }
        const x = this.positionAt(action.x);
        if (x !== null) this.place(x, true);
      }
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.cursorMode() === 'none' && this.zoom() === 'none') return;
    if (event.pointerType === 'mouse' && event.button > 0) return;
    clearTimeout(this.holdTimer);
    this.feed(event, 'down');
    const layer = event.currentTarget as HTMLElement;
    // A mouse's drag pans past the plot's edge as well: the layer keeps the button.
    if (event.pointerType === 'mouse') {
      layer.setPointerCapture?.(event.pointerId);
      return;
    }
    // A finger held still: the gesture machine hears of it when the time is up.
    const point = this.layerPoint(event);
    const id = event.pointerId;
    this.holdTimer = setTimeout(() => {
      if (!point) return;
      const { state, action } = pctGestureStep(this.gesture, {
        type: 'hold',
        id,
        x: point.x,
        y: point.y,
        mouse: false,
        at: event.timeStamp + HOLD,
      });
      this.gesture = state;
      if (action) this.act(action, layer, id);
    }, HOLD);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.gesture.pointers.has(event.pointerId)) {
      this.feed(event, 'move');
      if (this.gesture.mode !== 'pending') clearTimeout(this.holdTimer);
      return;
    }
    if (
      event.pointerType !== 'mouse' ||
      this.cursorMode() !== 'hover' ||
      this.pinned()
    )
      return;
    const point = this.layerPoint(event);
    // Along the x axis, whichever way it runs: the pointer's height on a turned chart.
    this.cursor.set(
      point ? this.positionAt(this.horizontal() ? point.y : point.x) : null,
    );
  }

  protected onPointerUp(event: PointerEvent): void {
    clearTimeout(this.holdTimer);
    this.feed(event, 'up');
  }

  protected onPointerCancel(event: PointerEvent): void {
    clearTimeout(this.holdTimer);
    this.feed(event, 'cancel');
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (
      event.pointerType === 'mouse' &&
      this.cursorMode() === 'hover' &&
      !this.pinned() &&
      this.gesture.mode === 'idle'
    )
      this.cursor.set(null);
  }

  /** Ctrl with the wheel — and a pinch on a laptop's pad, which arrives as one — zooms about the pointer. */
  protected onWheel(event: WheelEvent): void {
    if (!event.ctrlKey || this.zoom() === 'none') return;
    const point = this.layerPoint(event);
    if (!point) return;
    event.preventDefault();
    const [start] = this.alongRange();
    const width = Math.max(1, this.plotWidth());
    const along = this.horizontal() ? point.y : point.x;
    // A line of the wheel is about sixteen pixels of a pad's.
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
    this.move({
      factor: Math.exp(-delta * 0.002),
      anchor: Math.min(1, Math.max(0, (along - start) / width)),
    });
  }

  private writeValue(value: number | null, unit: string): string {
    if (value === null) return this.texts().chartGap;
    if (unit === BOOLEAN)
      return value >= 0.5 ? this.texts().chartOn : this.texts().chartOff;
    const number = this.valueFormat().format(value);
    return unit ? `${number} ${unit}` : number;
  }

  private writePosition(x: number, form: 'short' | 'full'): string {
    if (this.x() === 'band')
      return this.categories()[Math.floor(x)] ?? this.valueFormat().format(x);
    if (this.x() !== 'time') return this.valueFormat().format(x);
    const interval = this.interval();
    if (interval && this.bands().length > 0) {
      // Under bars the position is the bar's band, written as its label is.
      const band = this.bands().find((b) => x >= b.from && x < b.to);
      if (band)
        return pctIntervalText(
          band.from,
          interval,
          this.effectiveLocale(),
          this.timeZone(),
        );
    }
    return this.timeFormats()[form].format(x);
  }

  /** The band of the bars at `x`: the first mark's answer. */
  private bandAt(x: number): PctWindow | null {
    for (const mark of this.marks())
      for (const s of mark.series()) {
        const band = mark.bandAt(s.id, x);
        if (band) return band;
      }
    return null;
  }

  /** Selects the band at `x`, or lets the selected one go when it is the same. */
  private select(x: number): void {
    const band = this.bandAt(x);
    if (!band) return;
    const now = this.selected();
    this.selected.set(
      now && now.from === band.from && now.to === band.to ? null : band,
    );
  }

  /** The selection as drawn: the band's pixels inside the plot, or `null`. */
  protected readonly selectionView = computed(() => {
    const selected = this.selected();
    const scale = this.xScale();
    const shown = this.shown();
    if (!selected || !scale || !shown) return null;
    const [start, end] = this.alongRange();
    const from = Math.max(scale.map(selected.from), start);
    const to = Math.min(scale.map(selected.to), end);
    if (to <= from) return null;
    const { top, bottom, left, right } = this.plot();
    return this.horizontal()
      ? { x: left, y: from, width: right - left, height: to - from }
      : { x: from, y: top, width: to - from, height: bottom - top };
  });

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

  /**
   * A label's width: `measureText`, which matches the SVG's own width (0100, P3).
   *
   * @since next
   */
  override measure(text: string): number {
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
