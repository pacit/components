import type { PctColumns } from './columns';

/**
 * A change of data a chart can ease between
 * ([0121](../../../../../docs/decisions/0121-live-data-is-read-where-it-changed.md)): the same
 * positions, in the same number, with values that moved. Readings added or dropped move the
 * positions, so live data is drawn at once rather than sliding under the eye.
 *
 * @example
 * pctTweenable(before, after); // true when only the values changed
 *
 * @since next
 */
export function pctTweenable(from: PctColumns, to: PctColumns): boolean {
  if (from.length !== to.length) return false;
  for (let i = 0; i < to.length; i++) if (from.xs[i] !== to.xs[i]) return false;
  return true;
}

/**
 * The readings `progress` of the way from `from` to `to`, which stand at the same positions: a
 * value that is a gap on either side is the one it goes to, at once.
 *
 * @example
 * pctTween(before, after, 0.5); // each value halfway
 *
 * @since next
 */
export function pctTween(
  from: PctColumns,
  to: PctColumns,
  progress: number,
): PctColumns {
  const ys = new Float64Array(to.length);
  for (let i = 0; i < to.length; i++) {
    const a = from.ys[i];
    const b = to.ys[i];
    ys[i] = Number.isNaN(a) || Number.isNaN(b) ? b : a + (b - a) * progress;
  }
  return { xs: to.xs, ys, length: to.length };
}
