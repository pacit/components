import type { PctColumns } from './columns';
import type { PctWindow } from './window';

/**
 * Decimation to the pixel
 * ([0100](../../../../../docs/decisions/0100-a-chart-draws-in-layers-and-its-data-are-decimated-to-the-pixel.md)):
 * a window of sixty thousand readings drawn in a thousand pixels keeps, per column of pixels,
 * the first reading, the lowest, the highest and the last, in the order they were taken — so
 * every peak a reader could see survives, and a path has at most four points a pixel.
 */

/**
 * One level of the pyramid: for each run of `2^level` readings, the index of the lowest and of
 * the highest (`-1` when the run is all gap), and whether the run holds a gap.
 */
interface PctLevel {
  readonly lo: Int32Array;
  readonly hi: Int32Array;
  readonly gap: Uint8Array;
}

/**
 * A min/max pyramid over a series' values, built once per change of data, so a frame reads the
 * extremes of a column from runs of readings rather than from the readings. Level `k` (counting
 * from 1) holds runs of `2^k`.
 *
 * @since next
 */
export interface PctPyramid {
  readonly levels: readonly PctLevel[];
}

/**
 * The pyramid of `columns`. It costs a few milliseconds for sixty thousand readings and as much
 * memory as two more columns (0100, P2c).
 *
 * @since next
 */
export function pctPyramid(columns: PctColumns): PctPyramid {
  const { ys, length } = columns;
  const levels: PctLevel[] = [];
  for (let k = 1; 2 ** k <= length; k++) {
    const size = Math.ceil(length / 2 ** k);
    const lo = new Int32Array(size).fill(-1);
    const hi = new Int32Array(size).fill(-1);
    const gap = new Uint8Array(size);
    const below = levels[k - 2];
    for (let b = 0; b < size; b++) {
      // A run is the two runs of the level below, or two readings at the first level.
      for (let c = 2 * b; c < 2 * b + 2; c++) {
        let l: number, h: number;
        if (below) {
          if (c >= below.lo.length) break;
          if (below.gap[c]) gap[b] = 1;
          l = below.lo[c];
          h = below.hi[c];
          if (l < 0) continue;
        } else {
          if (c >= length) break;
          if (Number.isNaN(ys[c])) {
            gap[b] = 1;
            continue;
          }
          l = h = c;
        }
        if (lo[b] < 0 || ys[l] < ys[lo[b]]) lo[b] = l;
        if (hi[b] < 0 || ys[h] > ys[hi[b]]) hi[b] = h;
      }
    }
    levels.push({ lo, hi, gap });
  }
  return { levels };
}

/** The first index whose position is at or after `x`. */
function lowerBound(xs: Float64Array, length: number, x: number): number {
  let lo = 0;
  let hi = length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The readings of `columns` worth drawing in `window` across `width` pixels: per column of
 * pixels the first, the lowest, the highest and the last, in the order taken; a gap kept as a
 * gap (a `NaN` at the position the gap starts); and the reading just outside each edge, so a
 * line enters the plot from its edge and a step carries the value that held before the window.
 *
 * With a `pyramid`, a column is read from runs of readings under half a column wide, and a run
 * cut by a column's edge or holding a gap is split down the pyramid until it is not; the result
 * is the same as without one, and the cost follows the pixels rather than the readings.
 *
 * @example
 * const drawn = pctDecimate(columns, window, plotWidth, pyramid);
 *
 * @since next
 */
export function pctDecimate(
  columns: PctColumns,
  window: PctWindow,
  width: number,
  pyramid?: PctPyramid,
): PctColumns {
  const { xs, ys, length } = columns;
  const outX: number[] = [];
  const outY: number[] = [];
  if (length === 0 || !(width > 0) || !(window.to > window.from)) {
    return { xs: new Float64Array(0), ys: new Float64Array(0), length: 0 };
  }
  const i0 = Math.max(0, lowerBound(xs, length, window.from) - 1);
  const i1 = Math.min(length - 1, lowerBound(xs, length, window.to));
  const scale = width / (window.to - window.from);

  let column = NaN;
  let first = -1;
  let lo = -1;
  let hi = -1;
  let last = -1;
  let emitted = -1;
  const emit = (i: number) => {
    if (i === emitted) return;
    emitted = i;
    outX.push(xs[i]);
    outY.push(ys[i]);
  };
  // The first reading of a column comes before its extremes and the last after them, so only
  // the two extremes need ordering.
  const flush = () => {
    if (first < 0) return;
    emit(first);
    emit(Math.min(lo, hi));
    emit(Math.max(lo, hi));
    emit(last);
    first = -1;
  };
  const columnOf = (i: number) => Math.floor((xs[i] - window.from) * scale);
  const visit = (i: number) => {
    const y = ys[i];
    if (Number.isNaN(y)) {
      flush();
      if (outY.length > 0 && !Number.isNaN(outY[outY.length - 1])) {
        outX.push(xs[i]);
        outY.push(NaN);
      }
      column = NaN;
      return;
    }
    const c = columnOf(i);
    if (c !== column || first < 0) {
      flush();
      column = c;
      first = lo = hi = last = i;
      return;
    }
    if (y < ys[lo]) lo = i;
    if (y > ys[hi]) hi = i;
    last = i;
  };

  // A run of the pyramid at level `k` (level 0 is a single reading), clipped to the inside of
  // the window. A run that lies in one column and holds no gap gives its first reading, its
  // extremes and its last; any other is split into its two halves, down to single readings
  // where it must — so a column's first, lowest, highest and last reading are exactly the
  // readings', and a gap stands where it was.
  const levels = pyramid?.levels ?? [];
  const run = (k: number, b: number) => {
    const s = Math.max(i0 + 1, b * 2 ** k);
    const e = Math.min(i1 - 1, (b + 1) * 2 ** k - 1);
    if (s > e) return;
    if (k === 0) return visit(s);
    const level = levels[k - 1];
    const whole = s === b * 2 ** k && e === (b + 1) * 2 ** k - 1;
    if (whole && !level.gap[b] && columnOf(s) === columnOf(e)) {
      const l = level.lo[b];
      const h = level.hi[b];
      visit(s);
      visit(Math.min(l, h));
      visit(Math.max(l, h));
      visit(e);
      return;
    }
    run(k - 1, 2 * b);
    run(k - 1, 2 * b + 1);
  };
  // The level whose runs are under half a column, so a column holds a few whole runs. Below
  // 64 readings a column the runs are too short to pay for themselves and the readings are
  // read one by one; above, the pyramid's cost stops following the readings — measured on one
  // series in Node 24, 3.2 ms against 5.8 at 171 a column and 6.3 against 40 at 1,429 (0100).
  const perColumn = (i1 - i0 + 1) / width;
  const k = Math.min(levels.length, Math.floor(Math.log2(perColumn / 2)));
  visit(i0);
  if (perColumn < 64 || k < 1) {
    for (let i = i0 + 1; i < i1; i++) visit(i);
  } else {
    for (let b = Math.floor((i0 + 1) / 2 ** k); b <= Math.floor((i1 - 1) / 2 ** k); b++) run(k, b);
  }
  if (i1 > i0) visit(i1);
  flush();
  return {
    xs: Float64Array.from(outX),
    ys: Float64Array.from(outY),
    length: outX.length,
  };
}
