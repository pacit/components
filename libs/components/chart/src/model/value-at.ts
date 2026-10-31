import type { PctColumns } from './columns';
import { pctHermite, pctMonotoneTangents } from './monotone';

/**
 * How a series passes from one reading to the next:
 * - `linear` — a straight line, for averages and samples of something that moves smoothly,
 * - `step` — the reading holds until the next one, for data written when it changes,
 * - `step-before` — the next reading already holds since the previous one,
 * - `step-middle` — each reading holds halfway to its neighbours.
 *
 * @since next
 */
export type PctCurve =
  'linear' | 'step' | 'step-before' | 'step-middle' | 'monotone';

/**
 * The index of the last reading at or before `x`, or `-1` before the first. A binary search:
 * the columns are ordered (0099).
 *
 * @since next
 */
export function pctIndexAt(columns: PctColumns, x: number): number {
  const { xs, length } = columns;
  let lo = 0;
  let hi = length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

const valueOf = (y: number): number | null => (Number.isNaN(y) ? null : y);

/**
 * The value of a series at `x`, computed the way the series is drawn: the reading that holds
 * for a step, the interpolation between two readings for a line, `null` in a gap and where the
 * series has no reading to say anything.
 *
 * `end` is how far the last reading holds on a step, `step` and `step-middle`: the last
 * reading's own position by default, and `now` for data written when they change, whose last
 * value is still the value.
 *
 * @example
 * pctValueAt(columns, at, 'step', Date.now());
 *
 * @since next
 */
export function pctValueAt(
  columns: PctColumns,
  x: number,
  curve: PctCurve,
  end?: number,
): number | null {
  const { xs, ys, length } = columns;
  const last = length - 1;
  if (curve === 'step-before') {
    const j = pctIndexAt(columns, x);
    if (j >= 0 && xs[j] === x) return valueOf(ys[j]);
    // The next reading holds back to this one, and not back over a gap: after a gap the path
    // starts at the next reading.
    return j >= 0 && j < last && !Number.isNaN(ys[j])
      ? valueOf(ys[j + 1])
      : null;
  }
  const i = pctIndexAt(columns, x);
  if (i < 0) return null;
  if (xs[i] === x) return valueOf(ys[i]);
  if (i === last) {
    return curve !== 'linear' && x <= (end ?? xs[last]) ? valueOf(ys[i]) : null;
  }
  if (curve === 'step') return valueOf(ys[i]);
  if (curve === 'step-middle') {
    // After a gap the path starts at the next reading, not halfway to it.
    if (Number.isNaN(ys[i])) return null;
    return valueOf(x < (xs[i] + xs[i + 1]) / 2 ? ys[i] : ys[i + 1]);
  }
  const a = ys[i];
  const b = ys[i + 1];
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (curve === 'monotone') return monotoneAt(columns, i, x);
  return a + ((b - a) * (x - xs[i])) / (xs[i + 1] - xs[i]);
}

/**
 * The monotone curve between readings `i` and `i + 1` at `x`: the tangents at the two depend
 * on their neighbours in the run alone, so the four readings around the segment — fewer at a
 * gap or an end, where the run ends — give the curve the path draws.
 */
function monotoneAt(columns: PctColumns, i: number, x: number): number {
  const { xs, ys } = columns;
  const from = i > 0 && !Number.isNaN(ys[i - 1]) ? i - 1 : i;
  const to = i + 2 < columns.length && !Number.isNaN(ys[i + 2]) ? i + 3 : i + 2;
  const m = pctMonotoneTangents(xs, ys, from, to);
  const k = i - from;
  return pctHermite(xs[i], ys[i], m[k], xs[i + 1], ys[i + 1], m[k + 1], x);
}
