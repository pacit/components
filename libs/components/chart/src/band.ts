import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { pctSeriesColor } from './line';
import type { PctAccessor, PctColumns } from './model/columns';
import { pctWriteDuration } from './model/duration';
import type { PctDomain } from './model/scale';
import {
  pctSegmentAt,
  pctSegmentsOf,
  pctSegmentTotals,
  type PctSegment,
} from './model/segments';
import type { PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctLegendExtra,
  type PctMarkColumn,
  type PctMarkLayer,
  type PctMarkNote,
  type PctSeriesIdentity,
  type PctSwatchContext,
} from './scene';

/** The columns of a mark that has no readings of its own: nothing for the table to walk. */
const NO_READINGS: PctColumns = {
  xs: new Float64Array(0),
  ys: new Float64Array(0),
  length: 0,
};

/** The places of the palette a state takes when its colour is not given. */
const PLACES = 8;

/**
 * How a state of a band is drawn and named: a palette place from 1 to 8 or any CSS colour, and
 * the label the legend, the tooltip and the table write for the state's key.
 *
 * @since next
 */
export interface PctBandState {
  readonly color?: number | string;
  readonly label?: string;
}

/**
 * A band of states along the horizontal axis — a heat pump's mode through a day, a door open
 * and shut, a machine running or idle: one block per segment of `data`, in the colour of its
 * state. It brings no series and no value axis: it draws in a lane of its own under the plot
 * (`lane`, a strip of the scene's `band-height`), as a tint across the plot behind the series
 * (`lane="plot"`), or, as the only mark of a scene, in the whole picture. The tooltip names
 * the state under the cursor and how long it held, the legend lists the states with a toggle
 * each, the data table gets a column with a row per segment, and a reader hears how long
 * each state held in the window
 * ([0104](../../../../docs/decisions/0104-a-state-band-draws-in-a-lane-the-scene-lends-and-alone-takes-the-plot.md)).
 *
 * @example
 * <pct-band [data]="modes" from="from" to="to" state="mode" label="Mode"
 *   [states]="{ heating: { color: 1, label: 'Heating' }, defrost: { color: 'tomato' } }" />
 *
 * @since next
 */
@Component({
  selector: 'pct-band',
  templateUrl: './band.html',
  styleUrl: './band.scss',
  providers: [{ provide: PctMark, useExisting: PctBand }],
})
export class PctBand<T> extends PctMark {
  /**
   * The rows: one segment each.
   *
   * @since next
   */
  readonly data = input.required<readonly T[]>();
  /**
   * Where a segment starts: a position on the x axis, read off the row by a key or a function.
   *
   * @since next
   */
  readonly from = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * Where a segment ends.
   *
   * @since next
   */
  readonly to = input.required<PctAccessor<NoInfer<T>, number>>();
  /**
   * The segment's state: a key of `states`, read as text, so a number or a boolean is one too.
   *
   * @since next
   */
  readonly state =
    input.required<
      PctAccessor<NoInfer<T>, string | number | boolean | null | undefined>
    >();
  /**
   * The states by key: a colour and a label each. A state missing here, or given no colour,
   * takes the next free place of the palette; one given no label is written by its key. The
   * order here is the legend's; states met in the data alone follow.
   *
   * @since next
   */
  readonly states = input<Readonly<Record<string, PctBandState>>>({});
  /**
   * The band's name: the header of its column in the table and the subject of its sentence in
   * the description.
   *
   * @since next
   */
  readonly label = input('');
  /**
   * The identity the band is hidden by (`hiddenSeries`): the label when unset. A state is
   * hidden by `id:state`, which its legend toggle writes.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * Where the band draws: `plot`, a tint across the whole plot behind the series, which the
   * scene reads as no lane; any other name, a lane of its own beside the plot — `below`, the
   * default — which bands that name alike share.
   *
   * @since next
   */
  override readonly lane = input<string | null, string>('below', {
    transform: (name: string) => (name === 'plot' ? null : name),
  });
  /**
   * The states stand in the legend, each with a toggle that hides its segments; set by default.
   *
   * @since next
   */
  readonly legend = input(true, { transform: booleanAttribute });

  private readonly scene = inject(PctChartScene);
  private readonly texts = inject(PCT_TEXTS);

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  override readonly series = computed(() => []);
  override readonly layer = computed<PctMarkLayer>(() =>
    this.lane() === null ? 'back' : 'data',
  );

  /** The identity: `id`, the label, or the kind's name. */
  private readonly key = computed(
    () => this.id() || this.label() || this.texts().chartBand,
  );
  /** The name written and read: the label, or the kind's name. */
  private readonly name = computed(
    () => this.label() || this.texts().chartBand,
  );
  private readonly hidden = computed(() =>
    this.scene.hiddenSeries().includes(this.key()),
  );

  private readonly segments = computed(() =>
    pctSegmentsOf(this.data(), this.from(), this.to(), this.state()),
  );

  override readonly span = computed<PctDomain | null>(() => {
    const segments = this.segments();
    if (segments.length === 0) return null;
    return [
      segments[0].from,
      segments.reduce((to, s) => Math.max(to, s.to), -Infinity),
    ];
  });

  /** The states' keys: those of `states` in their order, then those met in the data alone. */
  private readonly keys = computed(() => {
    const keys = Object.keys(this.states());
    for (const s of this.segments())
      if (!keys.includes(s.state)) keys.push(s.state);
    return keys;
  });

  /**
   * The identity of each state: its given place or colour, else the next free place of the
   * palette, from 1, round again past 8.
   */
  private readonly identities = computed(() => {
    const states = this.states();
    const key = this.key();
    const given = new Map<string, number | string>();
    for (const state of this.keys()) {
      const color = pctSeriesColor(states[state]?.color);
      if (color !== undefined) given.set(state, color);
    }
    const taken = new Set(
      [...given.values()].filter((c) => typeof c === 'number'),
    );
    let next = 1;
    const identities = new Map<string, PctSeriesIdentity>();
    for (const state of this.keys()) {
      let color = given.get(state);
      if (color === undefined) {
        while (taken.has(next)) next++;
        color = ((next - 1) % PLACES) + 1;
        next++;
      }
      identities.set(state, {
        id: `${key}:${state}`,
        place: typeof color === 'string' ? 'custom' : color,
        color: typeof color === 'string' ? color : null,
      });
    }
    return identities;
  });

  private readonly hiddenStates = computed(() => {
    const hidden = new Set(this.scene.hiddenSeries());
    return new Set(
      [...this.identities()]
        .filter(([, identity]) => hidden.has(identity.id))
        .map(([state]) => state),
    );
  });

  private labelOf(state: string): string {
    return this.states()[state]?.label ?? state;
  }

  /** The segment at `x`, unless the band or its state is hidden. */
  private segmentAt(x: number): PctSegment | null {
    if (this.hidden()) return null;
    const segment = pctSegmentAt(this.segments(), x);
    return segment && !this.hiddenStates().has(segment.state) ? segment : null;
  }

  /** How long a stretch of the axis is: a duration on a time axis, a number on any other. */
  private writeLength(length: number): string {
    return this.scene.xKind() === 'time'
      ? pctWriteDuration(length, this.scene.effectiveLocale())
      : this.scene.writeValue(length, '');
  }

  /** Whether the band is a tint across the plot, behind the series. */
  protected readonly tinted = computed(() => this.lane() === null);

  /** The segments as drawn: cut to the window, in the lane's strip or across the plot. */
  protected readonly drawn = computed(() => {
    if (this.hidden()) return [];
    const scale = this.scene.xScale();
    const shown = this.scene.shown();
    const lane = this.lane();
    const frame =
      lane === null ? this.scene.frame() : this.scene.laneFrame(lane);
    if (!scale || !shown || !frame) return [];
    const horizontal = this.scene.orientation() === 'horizontal';
    const hidden = this.hiddenStates();
    const identities = this.identities();
    const { left, top, right, bottom } = frame;
    return this.segments().flatMap((segment) => {
      if (hidden.has(segment.state)) return [];
      const from = Math.max(segment.from, shown.from);
      const to = Math.min(segment.to, shown.to);
      if (to <= from) return [];
      const a = scale.map(from);
      const b = scale.map(to);
      const identity = identities.get(segment.state)!;
      return [
        {
          index: segment.index,
          place: identity.place,
          color: identity.color,
          ...(horizontal
            ? { x: left, y: a, width: right - left, height: b - a }
            : { x: a, y: top, width: b - a, height: bottom - top }),
        },
      ];
    });
  });

  /**
   * No series: no extent.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    void id;
    void window;
    return null;
  }

  /**
   * No series: no value.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    void id;
    void x;
    return null;
  }

  /**
   * The segments' starts, for the keys to step along; the state's place among the keys as the
   * value.
   *
   * @since next
   */
  override readings(id: string): PctColumns {
    if (id !== this.key()) return NO_READINGS;
    const keys = this.keys();
    const segments = this.segments();
    return {
      xs: Float64Array.from(segments.map((s) => s.from)),
      ys: Float64Array.from(segments.map((s) => keys.indexOf(s.state))),
      length: segments.length,
    };
  }

  /**
   * A row per segment of the window whose state is shown: each start inside it, and the
   * window's start where a segment holds across it.
   *
   * @since next
   */
  override rowsIn(id: string, window: PctWindow): readonly number[] | null {
    if (id !== this.key()) return null;
    const rows = new Set<number>();
    const hidden = this.hiddenStates();
    for (const s of this.segments()) {
      if (hidden.has(s.state)) continue;
      if (s.to <= window.from || s.from >= window.to) continue;
      rows.add(Math.max(s.from, window.from));
    }
    return [...rows].sort((a, b) => a - b);
  }

  override readonly columns = computed<readonly PctMarkColumn[]>(() =>
    this.hidden() ? [] : [{ id: this.key(), name: this.name() }],
  );

  /**
   * The state's label at `x`, for the band's column of the table; a gap where no segment
   * stands, or the band or the state is hidden.
   *
   * @since next
   */
  override textAt(id: string, x: number): string | null {
    if (id !== this.key()) return null;
    const segment = this.segmentAt(x);
    return segment ? this.labelOf(segment.state) : null;
  }

  /**
   * The tooltip's line: the state under the cursor, with its swatch, and how long it held.
   *
   * @since next
   */
  override notesAt(x: number): readonly PctMarkNote[] {
    const segment = this.segmentAt(x);
    if (!segment) return [];
    const identity = this.identities().get(segment.state)!;
    return [
      {
        id: identity.id,
        name: this.labelOf(segment.state),
        text: this.writeLength(segment.to - segment.from),
        swatch: { template: this.swatch(), identity },
      },
    ];
  }

  override readonly legendEntries = computed<readonly PctLegendExtra[]>(() =>
    this.legend() && !this.hidden()
      ? this.keys().map((state) => ({
          ...this.identities().get(state)!,
          name: this.labelOf(state),
        }))
      : [],
  );

  /**
   * How long each state held in the window — `Mode: Heating 8 hr; Off 9 hr, 30 min.` — or
   * nothing while hidden, or with no segment in the window.
   *
   * @since next
   */
  override describe(): string {
    if (this.hidden()) return '';
    const window = this.scene.shown();
    if (!window) return '';
    const hidden = this.hiddenStates();
    const totals = pctSegmentTotals(
      this.segments().filter((s) => !hidden.has(s.state)),
      window,
    );
    const parts = this.keys()
      .filter((state) => totals.has(state))
      .map(
        (state) =>
          `${this.labelOf(state)} ${this.writeLength(totals.get(state)!)}`,
      );
    return parts.length === 0 ? '' : `${this.name()}: ${parts.join('; ')}.`;
  }
}
