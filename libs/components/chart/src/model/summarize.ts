import type { PctColumns } from './columns';
import { pctIndexAt } from './value-at';
import type { PctWindow } from './window';

/**
 * What a legend writes beside a series with no cursor on the chart: the sum or the mean of
 * its readings in the window, or none.
 *
 * @since next
 */
export type PctSummary = 'sum' | 'mean';

/**
 * The sum or the mean of the readings of `columns` inside `window`, both ends included; a gap
 * is no reading, and `null` when there is none.
 *
 * @example
 * pctSummarize(columns, window, 'mean');
 *
 * @since next
 */
export function pctSummarize(
  columns: PctColumns,
  window: PctWindow,
  summary: PctSummary,
): number | null {
  const { xs, ys, length } = columns;
  let sum = 0;
  let count = 0;
  // The first reading at or after the window's start: the one before, or none.
  let i = pctIndexAt(columns, window.from);
  if (i < 0 || xs[i] < window.from) i++;
  for (; i < length && xs[i] <= window.to; i++) {
    if (Number.isNaN(ys[i])) continue;
    sum += ys[i];
    count++;
  }
  if (count === 0) return null;
  return summary === 'sum' ? sum : sum / count;
}
