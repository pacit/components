import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  signal,
  type Signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  nextPctId,
  PCT_TEXTS,
  pctQuantityFormat,
} from '@pacit/components/core';
import { PctSkeleton } from '@pacit/components/skeleton';
import type { PctChartReading, PctChartReadingRow } from './chart';
import type { PctLegendSource } from './legend';
import {
  pctArcPath,
  pctArcPoint,
  pctFoldOthers,
  pctPieLabels,
  pctSlices,
} from './model/arc';
import { pctRead, type PctAccessor } from './model/columns';
import { pctPlaces } from './model/places';
import type { PctSummary } from './model/summarize';
import { pctMeasureText } from './measure';
import {
  PCT_SERIES_HATCHES,
  type PctMark,
  type PctSeriesSpec,
  type PctSwatchContext,
} from './scene';

/** The id of the slice the smallest values fold into: no row of the consumer's carries it. */
const OTHERS = 'pct-others';
/** The leader from the rim to a label, in pixels, and the gap before the text. */
const LEADER = 12;

/**
 * What a press on a slice picks: the slice's series, the row of the data and its index — `null`
 * and `-1` for the slice of the rest — its value and its share of the total shown.
 *
 * @since next
 */
export interface PctSlicePick<T> {
  readonly series: string;
  readonly index: number;
  readonly row: T | null;
  readonly value: number;
  readonly share: number;
}

/** A slice as the data give it, before it is drawn. */
interface PctSliceEntry<T> {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly row: T | null;
  readonly value: number | null;
  readonly color: number | string | undefined;
}

/** A slice as drawn: its path, its middle angle and what the tooltip and the labels write. */
interface PctSliceView {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly value: number;
  readonly share: number;
  readonly middle: number;
  readonly path: string;
  readonly place: number | 'custom';
  readonly color: string | null;
  readonly selected: boolean;
}

/**
 * What a table reads off a pie: the legend's source, the pie's name, and each slice's value and
 * share in the pie's unit and locale. `PctPie<T>` implements it for every `T`, so `pct-chart-table` takes a
 * pie of any row.
 *
 * @since next
 */
export interface PctShareSource extends PctLegendSource {
  readonly ariaLabel: Signal<string>;
  readonly ariaLabelledby: Signal<string>;
  readonly unit: Signal<string>;
  readonly effectiveLocale: Signal<string>;
  shareOf(id: string): number | null;
  valueAt(id: string): number | null;
  writeValue(value: number | null): string;
}

/**
 * A pie, or a donut: the shares of a whole, each slice a series of the picture
 * ([0115](../../../../docs/decisions/0115-a-pie-is-a-scene-of-shares-and-a-gauge-is-a-meter-drawn-as-an-arc.md)).
 * It is a scene of its own — no axes, no window — and takes `pct-chart`'s companions: the
 * legend lists the slices with a toggle each, the table holds a row per slice with its value
 * and its share, and both read it through the same contract as a chart.
 *
 * **Few slices, read by name.** A pie with twenty slices is a picture of nothing, so the
 * `others` largest values stand on their own and the rest fold into one slice of the rest,
 * named by the texts; six by default. Each slice is painted by its palette place, as a bar is,
 * and under forced colours by a hatch of its place, so the colours are never its only channel
 * (0102); with `labels` on, each slice carries its name and its share beside the rim, on a
 * leader, thinned where they would cover each other, and the legend and the table hold the rest.
 *
 * **A named picture and its one stop.** The drawing is a picture named by `ariaLabel`, with a
 * description generated from the shares when none is given; its cursor is the platform's
 * range, one step per slice, which the arrow keys move and a reader reads by the slice's
 * name, value and share (0103). Enter selects the slice under the cursor, and a selected slice
 * stands out of the circle.
 *
 * @example
 * <pct-pie #pie ariaLabel="Energy by room" [data]="rooms" value="kwh" name="room" unit="kWh" labels />
 * <pct-chart-legend [chart]="pie" value="latest" />
 * <pct-chart-table [chart]="pie" summary="sum" />
 *
 * @since next
 */
@Component({
  selector: 'pct-pie',
  imports: [NgTemplateOutlet, PctSkeleton],
  templateUrl: './pie.html',
  styleUrl: './pie.scss',
  host: {
    class: 'pct-pie',
    '[attr.aria-busy]': 'loading() || !measured() ? "true" : null',
  },
})
export class PctPie<T> implements PctShareSource {
  /**
   * The rows, each a slice.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * A slice's value, its size among the others; a value that is not a positive finite number
   * draws no slice and stands in the table as it is, a gap for `null`.
   *
   * @since next
   */
  readonly value =
    input.required<PctAccessor<NoInfer<T>, number | null | undefined>>();
  /**
   * What a slice is called: in the legend, the tooltip, the table and the label beside it.
   *
   * @since next
   */
  readonly name = input.required<PctAccessor<NoInfer<T>, string>>();
  /**
   * The slice's id, stable across changes of the data; the name when unset.
   *
   * @since next
   */
  readonly id = input<PctAccessor<NoInfer<T>, string> | undefined>(undefined);
  /**
   * A slice's colour: a palette place from 1 to 8, any CSS colour, or `undefined` for the next
   * free place, which the slice keeps while it stays.
   *
   * @since next
   */
  readonly color = input<
    PctAccessor<NoInfer<T>, number | string | undefined> | undefined
  >(undefined);
  /**
   * The unit of the values, written after each; `''` is a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The locale the values and the shares are written in: the application's when unset.
   *
   * @since next
   */
  readonly locale = input('');
  /**
   * The hole in the middle, as a share of the radius from 0 (a pie) to 0.9; a value outside
   * is held at the ends.
   *
   * @since next
   */
  readonly donut = input(0, { transform: numberAttribute });
  /**
   * Where the first slice starts, in degrees clockwise from twelve o'clock.
   *
   * @since next
   */
  readonly startAngle = input(0, { transform: numberAttribute });
  /**
   * The most slices that stand on their own: the largest values; the rest, where they are two
   * or more, fold into one slice of the rest. `Infinity` draws every slice.
   *
   * @since next
   */
  readonly others = input(6, { transform: numberAttribute });
  /**
   * The name and the share written beside each slice (`auto`, where they fit), or none, left to
   * the legend.
   *
   * @since next
   */
  readonly labels = input<'auto' | 'none'>('auto');
  /**
   * A skeleton in place of the picture while the data are on their way.
   *
   * @since next
   */
  readonly loading = input(false, { transform: booleanAttribute });
  /**
   * The picture's name, which a reader announces and the table takes as its caption. Give this
   * or `ariaLabelledby`.
   *
   * @since next
   */
  readonly ariaLabel = input('');
  /**
   * As `ariaLabel`, for a name that already stands on the page.
   *
   * @since next
   */
  readonly ariaLabelledby = input('');
  /**
   * What the picture shows, for a reader, in a sentence; unset, the slices' names and shares.
   *
   * @since next
   */
  readonly description = input('');
  /**
   * The ids of the slices not drawn: what the legend's toggles write. The shares are of the
   * slices drawn.
   *
   * @since next
   */
  readonly hiddenSeries = model<readonly string[]>([]);
  /**
   * The id of the slice that stands out of the circle, or `null`: what a press on a slice, or
   * Enter on the cursor's slice, toggles.
   *
   * @since next
   */
  readonly selected = model<string | null>(null);
  /**
   * The id of the slice under the cursor — the pointer's, or the range's — or `null`.
   *
   * @since next
   */
  readonly cursor = model<string | null>(null);
  /**
   * A press on a slice: its series, its row and index, its value and its share.
   *
   * @since next
   */
  readonly pick = output<PctSlicePick<T>>();

  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly document = inject(DOCUMENT);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly tooltipBox =
    viewChild<ElementRef<HTMLElement>>('tooltipBox');
  private readonly rangeInput =
    viewChild<ElementRef<HTMLInputElement>>('rangeInput');
  /**
   * The slices' swatch: a block of the slice's colour, hatched under forced colours.
   *
   * @since next
   */
  readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatchTemplate');

  protected readonly ids = {
    description: nextPctId('pct-pie-description'),
    keys: nextPctId('pct-pie-keys'),
    hatch: nextPctId('pct-pie-hatch'),
  };
  protected readonly hatches = PCT_SERIES_HATCHES;

  private readonly size = signal({ width: 0, height: 0 });
  private readonly font = signal({ family: 'sans-serif', px: 13 });
  /** How far a selected slice stands out: the `pie-size-selected` token, read with the font. */
  private readonly explode = signal(8);
  private readonly tooltipSize = signal({ width: 0, height: 0 });
  /** The scene knows its size: before that, on the server and in the first frame, a skeleton. */
  protected readonly measured = computed(
    () => this.size().width > 0 && this.size().height > 0,
  );
  /** The height of a line of the picture's text. */
  private readonly lineHeight = computed(() => Math.ceil(this.font().px * 1.4));

  /**
   * The locale the values are written in: `locale`, or the application's.
   *
   * @since next
   */
  readonly effectiveLocale = computed(() => this.locale() || this.appLocale);
  private readonly valueFormat = computed(() =>
    pctQuantityFormat(this.effectiveLocale(), { fractionDigits: [0, 3] }),
  );
  private readonly shareFormat = computed(
    () =>
      new Intl.NumberFormat(this.effectiveLocale(), {
        style: 'percent',
        maximumFractionDigits: 0,
      }),
  );

  /** The rows read: a slice per row, the `others` largest on their own and the rest folded. */
  private readonly entries = computed<readonly PctSliceEntry<T>[]>(() => {
    const data = this.data();
    const value = pctRead(this.value());
    const name = pctRead(this.name());
    const idOf = this.id();
    const id = idOf ? pctRead(idOf) : null;
    const colorOf = this.color();
    const color = colorOf ? pctRead(colorOf) : null;
    const own = data.map((row, index): PctSliceEntry<T> => {
      const raw = value(row, index);
      const label = name(row, index);
      return {
        id: id?.(row, index) ?? label,
        name: label,
        index,
        row,
        value: typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
        color: color?.(row, index),
      };
    });
    const { kept, folded } = pctFoldOthers(
      own.map((e) => Math.max(0, e.value ?? 0)),
      this.others(),
    );
    const rest = folded.map((i) => own[i]);
    if (rest.length === 0) return own;
    return [
      ...kept.map((i) => own[i]),
      {
        id: OTHERS,
        name: this.texts().chartOthers,
        index: -1,
        row: null,
        value: rest.reduce((sum, e) => sum + Math.max(0, e.value ?? 0), 0),
        color: undefined,
      },
    ];
  });

  /**
   * Every slice as a series, in the order of the data, the slice of the rest last
   * (`PctLegendSource`).
   *
   * @since next
   */
  readonly series = computed<readonly PctSeriesSpec[]>(() =>
    this.entries().map((e) => ({
      id: e.id,
      name: e.name,
      unit: this.unit(),
      curve: 'linear',
      color: e.color,
      fromZero: false,
    })),
  );

  private readonly placesState = linkedSignal<
    readonly PctSeriesSpec[],
    ReadonlyMap<string, number>
  >({
    source: this.series,
    computation: (series, previous) => pctPlaces(series, previous?.value),
  });
  /**
   * The palette place of each slice, kept while the slice stays (`PctLegendSource`).
   *
   * @since next
   */
  readonly places = this.placesState.asReadonly();
  /**
   * No marks: a pie draws its own slices (`PctLegendSource`).
   *
   * @since next
   */
  readonly marks = signal<readonly PctMark[]>([]).asReadonly();

  /** The slices shown, with their shares of the total shown and their angles. */
  private readonly shown = computed(() => {
    const hidden = new Set(this.hiddenSeries());
    const entries = this.entries().filter(
      (e) => !hidden.has(e.id) && e.value !== null && e.value > 0,
    );
    const angles = pctSlices(
      entries.map((e) => e.value as number),
      (this.startAngle() * Math.PI) / 180,
    );
    return entries.map((e, i) => ({
      ...e,
      value: e.value as number,
      ...angles[i],
    }));
  });

  /** The label of a slice beside the rim: its name and its share. */
  private labelOf(name: string, share: number): string {
    return `${name} ${this.shareFormat().format(share)}`;
  }

  /** The circle: its middle, its radius and the room the labels take around it. */
  private readonly circle = computed(() => {
    const { width, height } = this.size();
    const explode = this.explode();
    const room =
      this.labels() === 'auto'
        ? Math.max(
            0,
            ...this.shown().map((s) =>
              this.measure(this.labelOf(s.name, s.share)),
            ),
          ) +
          LEADER * 1.5
        : 0;
    const vertical = this.labels() === 'auto' ? this.lineHeight() / 2 : 0;
    const radius = Math.max(
      0,
      Math.min(width / 2 - room, height / 2 - vertical) - explode,
    );
    return { cx: width / 2, cy: height / 2, radius };
  });

  /** The slices as drawn: a wedge or a ring's sector each, the selected one moved out. */
  protected readonly slices = computed<readonly PctSliceView[]>(() => {
    const { cx, cy, radius } = this.circle();
    const inner = radius * Math.min(0.9, Math.max(0, this.donut()));
    const places = this.places();
    const selected = this.selected();
    const explode = this.explode();
    return this.shown().map((s) => {
      const middle = (s.start + s.end) / 2;
      const isSelected = s.id === selected;
      const shift = isSelected
        ? pctArcPoint(0, 0, explode, middle)
        : { x: 0, y: 0 };
      const custom = typeof s.color === 'string';
      return {
        id: s.id,
        name: s.name,
        index: s.index,
        value: s.value,
        share: s.share,
        middle,
        path: pctArcPath(
          cx + shift.x,
          cy + shift.y,
          radius,
          inner,
          s.start,
          s.end,
        ),
        place: custom ? 'custom' : (places.get(s.id) ?? 1),
        color: custom ? (s.color as string) : null,
        selected: isSelected,
      };
    });
  });

  /** The labels beside the rim, thinned where they would cover each other. */
  protected readonly labelViews = computed(() => {
    if (this.labels() !== 'auto') return [];
    const { cx, cy, radius } = this.circle();
    const slices = this.slices();
    const texts = slices.map((s) => this.labelOf(s.name, s.share));
    return pctPieLabels(
      slices.map((s, i) => ({
        angle: s.middle,
        width: this.measure(texts[i]),
      })),
      cx,
      cy,
      radius,
      LEADER,
      this.lineHeight(),
      this.size(),
    ).map((label) => ({
      ...label,
      text: texts[label.index],
      points: label.leader.map(([x, y]) => `${x},${y}`).join(' '),
    }));
  });

  /**
   * What the cursor reads, or `null`: the slice under it as a row, and its share as a note
   * (`PctLegendSource`).
   *
   * @since next
   */
  readonly reading = computed<PctChartReading | null>(() => {
    const id = this.cursor();
    const slice = this.slices().find((s) => s.id === id);
    if (!slice) return null;
    const row: PctChartReadingRow = {
      id: slice.id,
      name: slice.name,
      unit: this.unit(),
      place: slice.place,
      color: slice.color,
      value: slice.value,
      at: null,
      text: this.writeValue(slice.value),
    };
    return {
      x: this.slices().indexOf(slice),
      text: slice.name,
      rows: [row],
      notes: [
        {
          id: `${slice.id}:share`,
          name: this.texts().chartShare,
          text: this.shareFormat().format(slice.share),
        },
      ],
    };
  });

  /** What the cursor's range says: the slice's name, value and share, or that there is none. */
  protected readonly valueText = computed(() => {
    const reading = this.reading();
    if (!reading) return this.texts().chartNoCursor;
    const [row] = reading.rows;
    return `${row.name}: ${row.text}, ${reading.notes[0].text}`;
  });

  /** The range: a step per slice shown, its value the cursor's slice. */
  protected readonly range = computed(() => {
    const slices = this.slices();
    if (slices.length === 0) return null;
    const at = slices.findIndex((s) => s.id === this.cursor());
    return { max: slices.length - 1, value: at < 0 ? 0 : at };
  });

  /** The tooltip's place: beside the slice's middle, kept inside the box. */
  protected readonly tooltipView = computed(() => {
    const reading = this.reading();
    const slice = this.slices()[reading?.x ?? -1];
    if (!reading || !slice) return null;
    const { cx, cy, radius } = this.circle();
    const point = pctArcPoint(cx, cy, radius * 0.7, slice.middle);
    const { width, height } = this.tooltipSize();
    const box = this.size();
    return {
      measured: width > 0,
      x: Math.max(0, Math.min(box.width - width, point.x - width / 2)),
      y: Math.max(0, Math.min(box.height - height, point.y - height / 2)),
    };
  });

  /** The description a reader hears: the consumer's, or the slices' names and shares. */
  protected readonly fullDescription = computed(() => {
    const own = this.description().trim();
    if (own) return own;
    return this.slices()
      .map((s) => this.labelOf(s.name, s.share))
      .join(', ');
  });

  /** Why nothing is drawn: every slice hidden, or none with a value. */
  protected readonly nothing = computed<'empty' | 'hidden' | null>(() => {
    if (this.slices().length > 0) return null;
    const entries = this.entries();
    return entries.length > 0 &&
      entries.every((e) => this.hiddenSeries().includes(e.id))
      ? 'hidden'
      : 'empty';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.readMedium();
      this.readSize(this.host.clientWidth, this.host.clientHeight);
      const fonts = this.document.fonts;
      const onFonts = () => this.readMedium();
      fonts?.addEventListener?.('loadingdone', onFonts);
      destroyRef.onDestroy(() =>
        fonts?.removeEventListener?.('loadingdone', onFonts),
      );
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        this.readMedium();
        this.readSize(entry.contentRect.width, entry.contentRect.height);
      });
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    // The range's value after its ends, which the template has written by now (0103).
    afterRenderEffect(() => {
      const input = this.rangeInput()?.nativeElement;
      const range = this.range();
      if (!input || !range) return;
      input.max = String(range.max);
      input.value = String(range.value);
    });
    // The tooltip is measured once drawn, and placed by its size: one frame hidden.
    afterRenderEffect(() => {
      this.reading();
      const box = this.tooltipBox()?.nativeElement;
      const width = box?.offsetWidth ?? 0;
      const height = box?.offsetHeight ?? 0;
      const now = this.tooltipSize();
      if (width !== now.width || height !== now.height)
        this.tooltipSize.set({ width, height });
    });
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnnamed());
    if (isDevMode()) afterRenderEffect(() => this.warnOnTwins());
  }

  /**
   * A value written with the unit in the pie's locale, the gap for `null`.
   *
   * @since next
   */
  writeValue(value: number | null): string {
    if (value === null) return this.texts().chartGap;
    const number = this.valueFormat().format(value);
    const unit = this.unit();
    return unit ? `${number} ${unit}` : number;
  }

  /**
   * A slice's share of the total shown, written in percent; `null` for a slice not drawn.
   *
   * @since next
   */
  shareOf(id: string): number | null {
    return this.shown().find((s) => s.id === id)?.share ?? null;
  }

  /**
   * The value of a slice as the data give it, `null` for none or no such slice.
   *
   * @since next
   */
  valueAt(id: string): number | null {
    return this.entries().find((e) => e.id === id)?.value ?? null;
  }

  /**
   * The swatch of every slice: the same block, painted by the slice's place
   * (`PctLegendSource`).
   *
   * @since next
   */
  swatchOf(id: string): TemplateRef<PctSwatchContext> | null {
    void id;
    return this.swatch();
  }

  /**
   * The value and the share of a slice, whatever `mode` asks: a pie has no window to sum
   * (`PctLegendSource`).
   *
   * @since next
   */
  summaryOf(id: string, mode: 'latest' | PctSummary): string | null {
    void mode;
    const value = this.valueAt(id);
    const share = this.shareOf(id);
    const text = this.writeValue(value);
    return share === null
      ? text
      : `${text} (${this.shareFormat().format(share)})`;
  }

  /** The width of a text in the picture's font: what the labels are thinned by. */
  protected measure(text: string): number {
    return pctMeasureText(this.document, this.font(), text);
  }

  /** The reference of a place's hatch, for a slice or a swatch under forced colours. */
  protected hatchOf(place: number | 'custom'): string | null {
    return place === 'custom' ? null : `url(#${this.ids.hatch}-${place})`;
  }

  protected onEnter(slice: PctSliceView): void {
    this.cursor.set(slice.id);
  }

  protected onLeave(): void {
    this.cursor.set(null);
  }

  protected onPress(slice: PctSliceView): void {
    this.selected.set(this.selected() === slice.id ? null : slice.id);
    this.pick.emit({
      series: slice.id,
      index: slice.index,
      row: this.entries().find((e) => e.id === slice.id)?.row ?? null,
      value: slice.value,
      share: slice.share,
    });
  }

  protected onKey(event: KeyboardEvent): void {
    const slices = this.slices();
    if (slices.length === 0) return;
    const at = slices.findIndex((s) => s.id === this.cursor());
    const last = slices.length - 1;
    let next: number | null | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = at < 0 ? 0 : Math.min(last, at + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = at < 0 ? last : Math.max(0, at - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Escape':
        next = null;
        break;
      case 'Enter':
      case ' ':
        if (at >= 0) this.onPress(slices[at]);
        event.preventDefault();
        return;
      default:
        return;
    }
    event.preventDefault();
    this.cursor.set(next === null ? null : slices[next].id);
  }

  protected onInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const slice = this.slices()[value];
    if (slice) this.cursor.set(slice.id);
  }

  private readSize(rawWidth: number, rawHeight: number): void {
    const width = Math.round(rawWidth);
    const height = Math.round(rawHeight);
    const now = this.size();
    if (now.width !== width || now.height !== height)
      this.size.set({ width, height });
  }

  /** The font and the selected slice's shift: what the skin decides. */
  private readMedium(): void {
    const style = this.document.defaultView?.getComputedStyle(this.host);
    const px = parseFloat(style?.fontSize ?? '') || 13;
    const family = style?.fontFamily || 'sans-serif';
    const now = this.font();
    if (now.px !== px || now.family !== family) this.font.set({ family, px });
    const explode = parseFloat(
      style?.getPropertyValue('--pct-chart-pie-size-selected') ?? '',
    );
    if (explode >= 0) this.explode.set(explode);
  }

  private warnOnUnnamed(): void {
    if (this.ariaLabel().trim() || this.ariaLabelledby().trim()) return;
    console.warn(
      '[pct-pie] A pie with neither `ariaLabel` nor `ariaLabelledby`. The picture is ' +
        'announced by its name, so a reader meets an image with none.',
    );
  }

  private warnOnTwins(): void {
    const seen = new Set<string>();
    const twins = new Set<string>();
    for (const s of this.series()) (seen.has(s.id) ? twins : seen).add(s.id);
    if (twins.size === 0) return;
    console.warn(
      `[pct-pie] Two slices share the id ${[...twins].map((id) => `"${id}"`).join(', ')}. ` +
        'A slice is told apart by its `id` (its `name` when unset): give each its own.',
    );
  }
}
