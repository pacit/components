/**
 * What a series did in a window, in the few numbers a sentence about it needs: the lowest, the
 * highest and the last reading, which way it went, and how often it fell silent — the
 * generated description of `pct-chart` is written from these
 * ([0120](../../../../../docs/decisions/0120-an-export-is-the-picture-drawn-again-and-a-description-is-the-datas-own-words.md)).
 */
import type { PctColumns } from './columns';
import { pctIndexAt } from './value-at';
import type { PctWindow } from './window';

/**
 * Which way a series went across a window: the line that fits its readings best rises, falls,
 * or moves no more than a tenth of the series' own range.
 *
 * @since next
 */
export type PctTrend = 'rising' | 'falling' | 'flat';

/**
 * What a series did in a window.
 *
 * @since next
 */
export interface PctSeriesFacts {
  /** The lowest reading. */
  readonly min: number;
  /** The highest reading. */
  readonly max: number;
  /** The last reading. */
  readonly last: number;
  /** Which way it went; `null` with a single reading. */
  readonly trend: PctTrend | null;
  /** The stretches without a reading between two readings. */
  readonly gaps: number;
  /** How many readings there are. */
  readonly count: number;
}

/**
 * What the readings of `columns` inside `window` — all of them with no window — did, or
 * `null` when the window holds none; a gap is no reading. The trend is the slope of the least-squares line across
 * the readings, taken over the stretch from the first to the last: `flat` while that change
 * stays within a tenth of the range between the lowest and the highest reading.
 *
 * @example
 * pctFactsOf({ xs: Float64Array.of(0, 1, 2), ys: Float64Array.of(1, 3, 2), length: 3 }, null);
 * // { min: 1, max: 3, last: 2, trend: 'rising', gaps: 0, count: 3 }
 *
 * @since next
 */
export function pctFactsOf(
  columns: PctColumns,
  window: PctWindow | null,
): PctSeriesFacts | null {
  let count = 0;
  let min = Infinity;
  let max = -Infinity;
  let last = NaN;
  let gaps = 0;
  let silent = false;
  // The line is fitted on positions taken from the first one: instants since 1970 squared
  // would lose every digit the slope needs.
  let firstX = 0;
  let lastX = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  // The first reading at or after the window's start: the one before, or none.
  let i = window ? pctIndexAt(columns, window.from) : 0;
  if (window && (i < 0 || columns.xs[i] < window.from)) i++;
  for (; i < columns.length; i++) {
    const x = columns.xs[i];
    if (window && x > window.to) break;
    const y = columns.ys[i];
    if (Number.isNaN(y)) {
      silent = count > 0;
      continue;
    }
    if (silent) gaps++;
    silent = false;
    if (count === 0) firstX = x;
    const at = x - firstX;
    count++;
    min = Math.min(min, y);
    max = Math.max(max, y);
    last = y;
    lastX = x;
    sumX += at;
    sumY += y;
    sumXX += at * at;
    sumXY += at * y;
  }
  if (count === 0) return null;
  const spread = count * sumXX - sumX * sumX;
  let trend: PctTrend | null = null;
  if (spread > 0) {
    const change = ((count * sumXY - sumX * sumY) / spread) * (lastX - firstX);
    trend =
      Math.abs(change) <= (max - min) / 10
        ? 'flat'
        : change > 0
          ? 'rising'
          : 'falling';
  }
  return { min, max, last, trend, gaps, count };
}
