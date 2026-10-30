import {
  computed,
  Directive,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import type { PctColumns } from './model/columns';
import type { PctPyramid } from './model/decimate';
import type { PctInterval } from './model/intervals';
import type { PctDomain, PctScale } from './model/scale';
import type { PctStacked } from './model/stack';
import type { PctCurve } from './model/value-at';
import type { PctWindow } from './model/window';

/**
 * The two sides of a chart and the contract between them
 * ([0099](../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)):
 * the scene owns the scales, the window and the colours; a mark owns its data and its drawing.
 * Each knows the other through the abstract class here and nothing else, so a new mark is a
 * new class and never a change to the scene.
 */

/**
 * What a series is told apart by on the picture: its palette place, or a colour of the
 * consumer's own (`place` `custom`, `color` set). The rows of a reading and the entries of a
 * legend carry it, and a mark's swatch draws it.
 *
 * @since next
 */
export interface PctSeriesIdentity {
  readonly id: string;
  /** The palette place, or `custom` for a colour of the consumer's own. */
  readonly place: number | 'custom';
  /** The consumer's own colour, `null` for a palette place. */
  readonly color: string | null;
}

/**
 * The context of a mark's swatch template: the series, and the form asked for.
 *
 * @since next
 */
export interface PctSwatchContext {
  readonly $implicit: PctSeriesIdentity;
  /** `swatch` draws the line with its dash and its marker; `marker` the marker alone. */
  readonly form: 'swatch' | 'marker';
}

/**
 * The marker of each palette place, as a path in a box of twelve: a circle, a square, a
 * triangle, a diamond, a triangle on its point, a plus, a hexagon and a star — eight shapes a
 * reader with no colour tells apart, and the dash patterns of `line.scss` their twins (0102).
 *
 * @since next
 */
export const PCT_SERIES_MARKERS: readonly string[] = [
  'M6 1a5 5 0 1 1 0 10a5 5 0 1 1 0-10z',
  'M1.5 1.5h9v9h-9z',
  'M6 1l5.5 10h-11z',
  'M6 0.5l5.5 5.5-5.5 5.5-5.5-5.5z',
  'M6 11l-5.5-10h11z',
  'M4.5 1h3v3.5h3.5v3h-3.5v3.5h-3v-3.5h-3.5v-3h3.5z',
  'M6 0.8l4.5 2.6v5.2l-4.5 2.6-4.5-2.6v-5.2z',
  'M6 0.5l1.6 3.4 3.7 0.5-2.7 2.6 0.7 3.7-3.3-1.8-3.3 1.8 0.7-3.7-2.7-2.6 3.7-0.5z',
];

/**
 * A series as a mark declares it.
 *
 * @since next
 */
export interface PctSeriesSpec {
  /** Stable across changes of data: the colour, the axis and the hidden state follow it. */
  readonly id: string;
  /** What the legend, the tooltip and the data table call it. */
  readonly name: string;
  /**
   * The unit of its values, which decides its value axis: series of one unit share one.
   * `''` is a plain number; `'boolean'` is a yes/no axis from 0 to 1.
   */
  readonly unit: string;
  readonly curve: PctCurve;
  /** A palette place from 1 to 8, any CSS colour, or `undefined` for the next free place. */
  readonly color: number | string | undefined;
  /** The value axis keeps zero in its domain: an area or a bar grows from it. */
  readonly fromZero: boolean;
}

/**
 * The scene as a mark sees it: what to draw with.
 *
 * @since next
 */
@Directive({
  // A base: no selector and no host of its own; the scene that extends it has both.
})
export abstract class PctChartScene {
  /**
   * The horizontal scale, or `null` before the scene knows its size or has a window.
   *
   * @since next
   */
  abstract readonly xScale: Signal<PctScale | null>;
  /**
   * The vertical scale of each unit on the chart.
   *
   * @since next
   */
  abstract readonly yScales: Signal<ReadonlyMap<string, PctScale>>;
  /**
   * The window the plot shows.
   *
   * @since next
   */
  abstract readonly shown: Signal<PctWindow | null>;
  /**
   * The width of the plot, in CSS pixels.
   *
   * @since next
   */
  abstract readonly plotWidth: Signal<number>;
  /**
   * The grid a path is rounded to: `1 / devicePixelRatio`.
   *
   * @since next
   */
  abstract readonly pixel: Signal<number>;
  /**
   * The palette place of each series, from 1 to 8.
   *
   * @since next
   */
  abstract readonly places: Signal<ReadonlyMap<string, number>>;
  /**
   * The ids of the series not drawn.
   *
   * @since next
   */
  abstract readonly hiddenSeries: Signal<readonly string[]>;

  /**
   * Whether the lines draw their dash patterns always (`all`) or only where the colours are
   * gone, under forced colours (`color`, the default): the second channel of 0102.
   *
   * @since next
   */
  abstract readonly distinct: Signal<'color' | 'all'>;

  /**
   * The zone whose wall clock the time axis reads, and the locale the chart writes in.
   *
   * @since next
   */
  abstract readonly timeZone: Signal<string | undefined>;
  /**
   * The locale the chart writes in.
   *
   * @since next
   */
  abstract readonly effectiveLocale: Signal<string>;

  /**
   * The bands of the horizontal axis the bars stand in: the calendar intervals of the window
   * (`interval` on the scene) or one per category (`categories`); empty on a scene with
   * neither, where no bar can stand.
   *
   * @since next
   */
  abstract readonly bands: Signal<readonly PctWindow[]>;

  /**
   * The calendar interval the bars of a time axis stand in, `undefined` without bars.
   *
   * @since next
   */
  abstract readonly interval: Signal<PctInterval | undefined>;

  /**
   * The width of a text in the chart's font, in pixels: what a mark thins its labels by.
   *
   * @since next
   */
  abstract measure(text: string): number;

  /**
   * The interval selected on the chart, or `null`: a bar's band, or a span the application
   * set (0101).
   *
   * @since next
   */
  abstract readonly selected: Signal<PctWindow | null>;

  /**
   * Where a bar mark's group stands among the groups on the scene: its index, and how many
   * there are, so the groups of one band stand side by side.
   *
   * @since next
   */
  abstract groupOf(group: string): {
    readonly index: number;
    readonly count: number;
  };

  /**
   * Where a stacked series' bars stand in their stack at each band: `from` and `to` per band,
   * `null` where the series has no bar (`pctStack`).
   *
   * @since next
   */
  abstract stackedOf(
    stack: string,
    id: string,
  ): readonly (PctStacked | null)[] | null;
}

/**
 * A mark as the scene sees it.
 *
 * @since next
 */
@Directive({
  // A base: no selector and no host of its own; each mark that extends it has both.
})
export abstract class PctMark {
  /**
   * The drawing, stamped into the scene's data layer. Every element in it is written `svg:`.
   *
   * @since next
   */
  abstract readonly template: Signal<TemplateRef<unknown>>;
  /**
   * The series the mark brings to the axes, the legend and the data table.
   *
   * @since next
   */
  abstract readonly series: Signal<readonly PctSeriesSpec[]>;
  /**
   * The positions the mark's data span, for the window shown when none is set.
   *
   * @since next
   */
  abstract readonly span: Signal<PctDomain | null>;

  /**
   * The template that draws a series' identity small — its colour, its dash and its marker
   * — for the legend (`form` `swatch`) and for a marker on the cursor's line or in the tooltip
   * (`form` `marker`). Stamped with a `PctSwatchContext`.
   *
   * @since next
   */
  abstract readonly swatch: Signal<TemplateRef<PctSwatchContext>>;
  /**
   * The lowest and highest value a series shows in `window`, as drawn.
   *
   * @since next
   */
  abstract extent(id: string, window: PctWindow): PctDomain | null;
  /**
   * The value of a series at `x`, as drawn.
   *
   * @since next
   */
  abstract valueAt(id: string, x: number): number | null;
  /**
   * The readings of a series, for the data table.
   *
   * @since next
   */
  abstract readings(id: string): PctColumns;

  /**
   * The pyramid of a series' readings, which decimates them at the cost of the pixels; `null`
   * when the mark keeps none, and the readings are scanned.
   *
   * @since next
   */
  pyramidOf(id: string): PctPyramid | null {
    void id;
    return null;
  }

  /**
   * The group and the stack a mark's bars stand in, or `null` for a mark that draws no bars.
   * Marks of one group stand side by side in a band; marks of one stack stand on each other.
   *
   * @since next
   */
  readonly band: Signal<{
    readonly group: string;
    readonly stack: string | null;
  } | null> = computed(() => null);

  /**
   * A series' values, one per band of the scene, for the stacks: `null` where it has none.
   *
   * @since next
   */
  valuesIn(
    id: string,
    bands: readonly PctWindow[],
  ): readonly (number | null)[] {
    void id;
    return bands.map(() => null);
  }

  /**
   * The positions worth a row of the data table, or `null` for a mark whose readings are
   * decimated into rows: a bar mark answers its bands' starts.
   *
   * @since next
   */
  rowsIn(id: string, window: PctWindow): readonly number[] | null {
    void id;
    void window;
    return null;
  }

  /**
   * The band at `x`, for the selection: the interval a bar stands in, or `null` where nothing
   * of this mark is to select.
   *
   * @since next
   */
  bandAt(id: string, x: number): PctWindow | null {
    void id;
    void x;
    return null;
  }

  /**
   * What a press at a position of the plot picks of this series: the index of the bar there
   * when the press is on it, or `null`. The mark emits its `pick`.
   *
   * @since next
   */
  pickAt(id: string, x: number, y: number): boolean {
    void id;
    void x;
    void y;
    return false;
  }

  /**
   * The notes the mark adds to the reading at `x`, after the series' rows: a bars mark with a
   * compared period writes the difference between the two. The default has none.
   *
   * @since next
   */
  notesAt(x: number): readonly PctMarkNote[] {
    void x;
    return [];
  }
}

/**
 * A line of the tooltip that is no series' value: a name and a text, written by a mark beside
 * the rows (`PctMark.notesAt`). It draws no swatch and the legend does not list it.
 *
 * @since next
 */
export interface PctMarkNote {
  /** Unique among the notes of the chart: the series' key and what the note is about. */
  readonly id: string;
  readonly name: string;
  readonly text: string;
}

/**
 * What aligns the plots of charts that share a time axis: the room the widest value axes take
 * on each side. `pctChartSync` provides it; a scene takes the larger of its own room and this.
 *
 * @since next
 */
@Directive({
  // A base: no selector and no host of its own; `pctChartSync` extends it and has both.
})
export abstract class PctChartAlign {
  /**
   * The room on each side, in pixels.
   *
   * @since next
   */
  abstract readonly room: Signal<{
    readonly left: number;
    readonly right: number;
  }>;
}
