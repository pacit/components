import { pctRead, type PctAccessor } from './columns';
import type { PctWindow } from './window';

/**
 * A stretch of the horizontal axis in one state: from where it starts to where it ends, the
 * state's key, and the row's place among the rows read.
 *
 * @since next
 */
export interface PctSegment {
  readonly from: number;
  readonly to: number;
  readonly state: string;
  readonly index: number;
}

/**
 * The segments read off the rows, in the order of their starts. A row whose ends are not both
 * finite numbers, or whose state is `null` or `undefined`, has nowhere to stand and is left
 * out; one whose ends are the same has no length and is left out too; ends in either order
 * are the same segment. The state is read as text, so a number or a boolean is a key as well.
 *
 * @since next
 */
export function pctSegmentsOf<T>(
  rows: readonly T[],
  from: PctAccessor<T, number>,
  to: PctAccessor<T, number>,
  state: PctAccessor<T, string | number | boolean | null | undefined>,
): readonly PctSegment[] {
  const readFrom = pctRead(from);
  const readTo = pctRead(to);
  const readState = pctRead(state);
  const segments: PctSegment[] = [];
  rows.forEach((row, index) => {
    const a = readFrom(row, index);
    const b = readTo(row, index);
    const key = readState(row, index);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return;
    if (key === null || key === undefined) return;
    segments.push({
      from: Math.min(a, b),
      to: Math.max(a, b),
      state: String(key),
      index,
    });
  });
  return segments.sort((p, q) => p.from - q.from || p.index - q.index);
}

/**
 * The segment at `x`: the first that starts at or before it and ends after it, or, past the
 * last segment's end alone, the one that ends there — so the end of the data is still read.
 * `null` where no segment stands.
 *
 * @since next
 */
export function pctSegmentAt(
  segments: readonly PctSegment[],
  x: number,
): PctSegment | null {
  return (
    segments.find((s) => s.from <= x && x < s.to) ??
    segments.find((s) => s.to === x) ??
    null
  );
}

/**
 * The time each state holds inside `window`, by state key, in the order the states are first
 * met: the length of each segment cut to the window, summed. A state no segment of the window
 * holds is absent.
 *
 * @since next
 */
export function pctSegmentTotals(
  segments: readonly PctSegment[],
  window: PctWindow,
): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const s of segments) {
    const from = Math.max(s.from, window.from);
    const to = Math.min(s.to, window.to);
    if (to <= from) continue;
    totals.set(s.state, (totals.get(s.state) ?? 0) + (to - from));
  }
  return totals;
}
