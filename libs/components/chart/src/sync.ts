import {
  computed,
  contentChildren,
  Directive,
  effect,
  input,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { PctChart } from './chart';
import type { PctWindow } from './model/window';
import { PctChartAlign } from './scene';

/**
 * What charts in sync can share.
 *
 * @since next
 */
export type PctChartShared = 'window' | 'cursor';

const BOTH: readonly PctChartShared[] = ['window', 'cursor'];

const same = (a: unknown, b: unknown): boolean =>
  a === b ||
  (typeof a === 'object' &&
    typeof b === 'object' &&
    a !== null &&
    b !== null &&
    (a as PctWindow).from === (b as PctWindow).from &&
    (a as PctWindow).to === (b as PctWindow).to);

/**
 * Charts that move together
 * ([0101](../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)):
 * on a common ancestor it ties the window and the cursor of every chart inside it, and gives
 * their plots the same left and right edges, so two charts on one time axis whose value axes
 * differ in width still line up — a series over a band of states is two charts and this.
 *
 * The value names what is shared: both by default, or a list (`['window']`).
 *
 * @example
 * <div pctChartSync>
 *   <pct-chart ariaLabel="Supply air"> … </pct-chart>
 *   <pct-chart ariaLabel="Heater" style="height: 80px"> … </pct-chart>
 * </div>
 *
 * @since next
 */
@Directive({
  // An attribute on any ancestor: the charts are wherever the layout puts them.
  selector: '[pctChartSync]',
  providers: [{ provide: PctChartAlign, useExisting: PctChartSync }],
})
export class PctChartSync extends PctChartAlign {
  /**
   * What the charts share: the window, the cursor, or both (the default, and what an empty
   * attribute means).
   *
   * @since next
   */
  readonly pctChartSync = input<
    readonly PctChartShared[],
    readonly PctChartShared[] | '' | null | undefined
  >(BOTH, { transform: (value) => (value ? value : BOTH) });

  /**
   * The charts inside, at any depth.
   *
   * @since next
   */
  readonly charts = contentChildren(PctChart, { descendants: true });

  /**
   * The room of the widest value axes on each side of the charts inside.
   *
   * @since next
   */
  override readonly room = computed(() => {
    let left = 0;
    let right = 0;
    for (const chart of this.charts()) {
      const room = chart.axisRoom();
      left = Math.max(left, room.left);
      right = Math.max(right, room.right);
    }
    return { left, right };
  });

  constructor() {
    super();
    this.tie('window', (chart) => chart.window);
    this.tie('cursor', (chart) => chart.cursor);
  }

  /**
   * Keeps one model the same on every chart: the chart whose value moved since it was last
   * seen gives it to the others, and a chart that joins takes the one already shared.
   */
  private tie<T>(
    what: PctChartShared,
    model: (chart: PctChart) => WritableSignal<T>,
  ): void {
    const seen = new WeakMap<PctChart, T>();
    let shared: { value: T } | null = null;
    effect(() => {
      if (!this.pctChartSync().includes(what)) return;
      const charts = this.charts();
      const values = charts.map((chart) => model(chart)());
      const moved = charts.findIndex(
        (chart, i) => seen.has(chart) && !same(seen.get(chart), values[i]),
      );
      if (moved >= 0) shared = { value: values[moved] };
      untracked(() =>
        charts.forEach((chart, i) => {
          if (shared && !same(values[i], shared.value))
            model(chart).set(shared.value);
          seen.set(chart, shared ? shared.value : values[i]);
        }),
      );
    });
  }
}
