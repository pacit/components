import { pctRead, type PctAccessor, type PctColumns } from './columns';
import type { PctWindow } from './window';

/**
 * The points of a series, ordered by `x` — the rows a scatter plots, which come in no order of
 * their own — each with the row it was read from and the size it carries.
 *
 * @since next
 */
export interface PctPointSet extends PctColumns {
  /** The size read off each row, `NaN` where the row gave none or no accessor was given. */
  readonly sizes: Float64Array;
  /** The index in the consumer's rows of the row each point was read from. */
  readonly rows: Uint32Array;
}

/**
 * The points of `data`: `x` and `y` read off each row, a row with a value that is not a finite
 * number on either dropped — a gap at a point is no point — and the rest ordered by `x`, rows
 * at one `x` in their own order. A scatter's rows come in no order, so a point set sorts where
 * a line's columns refuse to ([0105](../../../../../docs/decisions/0105-a-point-is-picked-by-distance-and-the-y-window-is-the-first-axiss.md)).
 *
 * @since next
 */
export function pctPointsOf<T>(
  data: readonly T[],
  x: PctAccessor<T, number>,
  y: PctAccessor<T, number | null | undefined>,
  size?: PctAccessor<T, number | null | undefined>,
): PctPointSet {
  const readX = pctRead(x);
  const readY = pctRead(y);
  const readSize = size === undefined ? null : pctRead(size);
  const order: number[] = [];
  const atX: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const px = readX(data[i], i);
    const py = readY(data[i], i);
    if (!Number.isFinite(px) || typeof py !== 'number' || !Number.isFinite(py))
      continue;
    order.push(i);
    atX.push(px);
  }
  const index = order.map((_, k) => k);
  index.sort((a, b) => atX[a] - atX[b] || a - b);
  const length = index.length;
  const xs = new Float64Array(length);
  const ys = new Float64Array(length);
  const sizes = new Float64Array(length);
  const rows = new Uint32Array(length);
  for (let k = 0; k < length; k++) {
    const i = order[index[k]];
    xs[k] = atX[index[k]];
    ys[k] = readY(data[i], i) as number;
    const s = readSize?.(data[i], i);
    sizes[k] = typeof s === 'number' && Number.isFinite(s) ? s : NaN;
    rows[k] = i;
  }
  return { xs, ys, sizes, rows, length };
}

/**
 * The largest size of a point set, or `0` when no point carries one — the size every bubble's
 * area is measured against.
 *
 * @since next
 */
export function pctLargestSize(points: PctPointSet): number {
  let largest = 0;
  for (let i = 0; i < points.length; i++) {
    const s = points.sizes[i];
    if (s > largest) largest = s;
  }
  return largest;
}

/**
 * The radius of a bubble in pixels: its AREA in proportion to its size, so a bubble of twice the
 * size covers twice the ground, `max` for the largest size and never under `min` — a size of
 * none, of zero or below draws the smallest bubble, not nothing ([0105](../../../../../docs/decisions/0105-a-point-is-picked-by-distance-and-the-y-window-is-the-first-axiss.md)).
 *
 * @since next
 */
export function pctPointRadius(
  size: number,
  largest: number,
  max: number,
  min: number,
): number {
  if (!(size > 0) || !(largest > 0)) return min;
  return Math.max(min, max * Math.sqrt(Math.min(size, largest) / largest));
}

/**
 * The points worth drawing of those at `xs`/`ys` (in pixels): the first point of every cell
 * of `cell` pixels a side, and every point whose radius is over `over` — a bubble is never
 * thinned by a neighbour it would cover anyway. Two points in one cell draw one mark, so fifty
 * thousand rows in a plot of 600 by 300 draw at most 45 000 marks, and a cloud of them far
 * fewer.
 *
 * @since next
 */
export function pctThinPoints(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  radii: ArrayLike<number>,
  cell: number,
  over = Infinity,
): Uint32Array {
  const kept: number[] = [];
  const taken = new Set<number>();
  const side = cell > 0 ? cell : 1;
  for (let i = 0; i < xs.length; i++) {
    if (radii[i] > over) {
      kept.push(i);
      continue;
    }
    const key = Math.floor(xs[i] / side) * CELLS + Math.floor(ys[i] / side);
    if (taken.has(key)) continue;
    taken.add(key);
    kept.push(i);
  }
  return Uint32Array.from(kept);
}

/** Cells along one side a key can tell apart: more than any plot holds. */
const CELLS = 1_048_576;

/**
 * The point nearest to (`px`, `py`), by the distance between their centres in pixels, and that
 * distance — `null` with no point. The cursor of a scatter stands on the nearest point, not on
 * the pointer's `x` ([0105](../../../../../docs/decisions/0105-a-point-is-picked-by-distance-and-the-y-window-is-the-first-axiss.md)).
 *
 * @since next
 */
export function pctNearestPoint(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  px: number,
  py: number,
): { readonly index: number; readonly distance: number } | null {
  let index = -1;
  let best = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.hypot(xs[i] - px, ys[i] - py);
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return index < 0 ? null : { index, distance: best };
}

/**
 * The run of a point set inside `window`, as the index of its first point and the one past its
 * last: `[start, end)`, empty when none falls in it. Two binary searches over the ordered `xs`.
 *
 * @since next
 */
export function pctPointsIn(
  points: PctColumns,
  window: PctWindow,
): readonly [start: number, end: number] {
  return [
    lowerBound(points.xs, points.length, window.from),
    lowerBound(points.xs, points.length, window.to, true),
  ];
}

/**
 * The first index whose `x` is at least `value` — past it, with `after`.
 *
 * @since next
 */
export function pctPointAt(points: PctColumns, x: number): number {
  const at = lowerBound(points.xs, points.length, x);
  return at < points.length && points.xs[at] === x ? at : -1;
}

function lowerBound(
  xs: Float64Array,
  length: number,
  value: number,
  after = false,
): number {
  let lo = 0;
  let hi = length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (after ? xs[mid] <= value : xs[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
