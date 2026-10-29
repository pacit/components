import type { PctColumns } from './columns';
import type { PctDomain } from './scale';
import { pctNice } from './ticks';
import { pctIndexAt, pctValueAt, type PctCurve } from './value-at';
import type { PctWindow } from './window';

/**
 * The lowest and the highest value a series shows inside `window`: its readings there, and
 * its value at both edges as it is drawn — the reading that holds into the window on a step,
 * the interpolation at the edge on a line. `null` when the series shows nothing there.
 *
 * Decimated columns give the same answer as the readings they came from, because decimation
 * keeps every column's extremes and one reading beyond each edge (0100).
 *
 * @since next
 */
export function pctExtent(
  columns: PctColumns,
  window: PctWindow,
  curve: PctCurve,
  end?: number,
): PctDomain | null {
  const { xs, ys, length } = columns;
  let min = Infinity;
  let max = -Infinity;
  const take = (y: number | null) => {
    if (y === null || Number.isNaN(y)) return;
    if (y < min) min = y;
    if (y > max) max = y;
  };
  take(pctValueAt(columns, window.from, curve, end));
  take(pctValueAt(columns, window.to, curve, end));
  // The readings strictly inside; those on an edge are the edge's value, already taken.
  for (
    let i = pctIndexAt(columns, window.from) + 1;
    i < length && xs[i] < window.to;
    i++
  ) {
    take(ys[i]);
  }
  return min <= max ? [min, max] : null;
}

/**
 * What a value axis is asked to show, beyond its series.
 *
 * @since next
 */
export interface PctDomainOptions {
  /** About how many ticks the axis has room for. */
  readonly target: number;
  /** Zero stays in the domain: bars and areas grow from it. */
  readonly includeZero?: boolean;
  /** A lower end the consumer fixes, kept whatever the data say. */
  readonly floor?: number;
  /** An upper end the consumer fixes, kept whatever the data say. */
  readonly ceiling?: number;
}

/**
 * The domain of a value axis: the union of its series' extents, zero when asked, widened to
 * nice ticks, and the consumer's `floor` and `ceiling` over all of it. A single value gets five
 * percent of itself on each side (one on each side of zero), so a flat line stands in the
 * middle; no value at all is `[0, 1]`, within the consumer's ends where there are some.
 *
 * @example
 * pctDomainOf([[18.2, 22.4], [19, 23.1]], { target: 5 }); // [18, 24]
 *
 * @since next
 */
export function pctDomainOf(
  extents: readonly (PctDomain | null)[],
  options: PctDomainOptions,
): PctDomain {
  const { target, includeZero, floor, ceiling } = options;
  let lo = Infinity;
  let hi = -Infinity;
  for (const extent of extents) {
    if (extent === null) continue;
    lo = Math.min(lo, extent[0]);
    hi = Math.max(hi, extent[1]);
  }
  if (lo > hi) {
    lo = floor ?? (ceiling === undefined ? 0 : ceiling - 1);
    hi = ceiling ?? lo + 1;
    return lo < hi ? [lo, hi] : [lo, lo + 1];
  }
  if (includeZero) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (lo === hi) {
    const pad = lo === 0 ? 1 : Math.abs(lo) * 0.05;
    lo -= pad;
    hi += pad;
  }
  [lo, hi] = pctNice([lo, hi], target);
  if (floor !== undefined) lo = floor;
  if (ceiling !== undefined) hi = ceiling;
  if (lo < hi) return [lo, hi];
  return floor !== undefined ? [floor, floor + 1] : [hi - 1, hi];
}
