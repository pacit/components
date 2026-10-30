import { Directive, type Signal, type TemplateRef } from '@angular/core';
import type { PctColumns } from './model/columns';
import type { PctPyramid } from './model/decimate';
import type { PctDomain, PctScale } from './model/scale';
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
}

/**
 * What aligns the plots of charts that share a time axis: the room the widest value axes take
 * on each side. `pctChartSync` provides it; a scene takes the larger of its own room and this.
 *
 * @since next
 */
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
