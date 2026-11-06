import type { PctColumns } from './columns';
import { pctSteps } from './steps';
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
 * extremes of a column from runs of readings rather than from the readings. It is opaque: what
 * it holds is the decimation's business, and the one fact it shows is how many readings it was
 * built over, so a pyramid of other columns is told apart and not read.
 *
 * @since 0.3.0
 */
export interface PctPyramid {
  readonly length: number;
}

/**
 * The levels of a pyramid — level `k` (from 1) holds runs of `2^k` readings — and where its
 * runs start: run `b` of level `k` covers the readings `b * 2^k - offset` to
 * `(b + 1) * 2^k - 1 - offset`. A pyramid that grows with its columns counts its runs from the
 * start of their buffer, so the readings dropped from the front move the offset and not the runs.
 */
interface PctLevels {
  readonly levels: readonly PctLevel[];
  readonly offset: number;
}

const LEVELS = new WeakMap<PctPyramid, PctLevels>();
const NO_LEVELS: PctLevels = { levels: [], offset: 0 };

/**
 * Builds the runs of every level over the readings `start` to `end` (exclusive) of `ys`, from
 * the run that holds `from` on: the runs before it stand as they were. A level the readings
 * now reach is added, built from `start`, and sized for `capacity` readings.
 */
function build(
  levels: PctLevel[],
  ys: Float64Array,
  start: number,
  from: number,
  end: number,
  capacity: number,
): void {
  // As many levels as there are runs of two readings or more, and every level already there:
  // counted first, so the loop's end is not something the loop computes.
  const count = Math.max(levels.length, Math.floor(Math.log2(end - start)));
  for (const k of pctSteps(1, count, 1)) {
    let level = levels[k - 1];
    let first = Math.floor(from / 2 ** k);
    if (!level) {
      const size = Math.ceil(capacity / 2 ** k);
      level = {
        lo: new Int32Array(size),
        hi: new Int32Array(size),
        gap: new Uint8Array(size),
      };
      levels.push(level);
      first = Math.floor(start / 2 ** k);
    }
    const { lo, hi, gap } = level;
    const below = levels[k - 2];
    // The runs the level below holds, or the readings at the first level.
    const children = Math.ceil(end / 2 ** (k - 1));
    for (let b = first; b < Math.ceil(end / 2 ** k); b++) {
      lo[b] = hi[b] = -1;
      gap[b] = 0;
      // A run is the two runs of the level below, or two readings at the first level.
      for (let c = 2 * b; c < Math.min(2 * b + 2, children); c++) {
        let l: number, h: number;
        if (below) {
          if (below.gap[c]) gap[b] = 1;
          l = below.lo[c];
          h = below.hi[c];
          if (l < 0) continue;
        } else {
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
  }
}

/**
 * The pyramid of `columns`. It costs about 7 ms a hundred thousand readings and as much memory
 * as two more columns, once per change of data: a series that grows reading by reading pays it
 * on every reading (0100, P2d), unless `pctPyramidGrower` builds it.
 *
 * @since 0.3.0
 */
export function pctPyramid(columns: PctColumns): PctPyramid {
  const { ys, length } = columns;
  const levels: PctLevel[] = [];
  build(levels, ys, 0, 0, length, length);
  const pyramid: PctPyramid = { length };
  LEVELS.set(pyramid, { levels, offset: 0 });
  return pyramid;
}

/**
 * A builder of pyramids that keeps the last it built: when the next columns are those columns
 * with readings dropped from the front and added at the back, in the same buffer — as
 * `pctColumnsReader` hands them out — only the runs over the readings added are built
 * ([0121](../../../../../docs/decisions/0121-live-data-is-read-where-it-changed.md)), so a
 * series that grows reading by reading pays a reading's worth, not the series'. Any other
 * columns are built whole, as `pctPyramid` builds them.
 *
 * It holds the buffer's readings before the end it last built to the promise
 * `pctColumnsReader` makes: never written over. A pyramid it handed out before stays the
 * pyramid of its columns.
 *
 * @example
 * const grow = pctPyramidGrower();
 * const pyramid = computed(() => grow(this.columns()));
 *
 * @since next
 */
export function pctPyramidGrower(): (columns: PctColumns) => PctPyramid {
  // The levels last built, the buffer they read and the readings they hold.
  let built: {
    readonly levels: PctLevel[];
    readonly buffer: ArrayBufferLike;
    start: number;
    end: number;
  } | null = null;
  return (columns) => {
    const { ys, length } = columns;
    // Positions in the buffer, which the reader's columns of one buffer share.
    const all = new Float64Array(ys.buffer);
    const at = ys.byteOffset / Float64Array.BYTES_PER_ELEMENT;
    // Readings cut from the back change no run the columns read whole, and the next readings
    // added build from the new end; another buffer, or readings put before the start, which
    // had no runs built, are built whole.
    if (!built || ys.buffer !== built.buffer || at < built.start)
      built = { levels: [], buffer: ys.buffer, start: at, end: at };
    build(built.levels, all, at, built.end, at + length, all.length);
    built.start = at;
    built.end = at + length;
    const pyramid: PctPyramid = { length };
    LEVELS.set(pyramid, { levels: built.levels, offset: at });
    return pyramid;
  };
}

/**
 * The readings a window holds past which a frame reads them from a pyramid. Below it a scan of
 * the window costs a frame about a millisecond a series, and a pyramid built again on each
 * change of data costs more than the scans it saves (0121, P3).
 */
const PYRAMID_FROM = 16_384;

/**
 * Whether a frame of `window` is worth a pyramid of `columns`: whether the window holds so
 * many readings that a scan of them costs more than reading their runs. A series that changes
 * on every frame and shows a short window draws by a scan, and builds no pyramid at all.
 *
 * @example
 * const pyramid = pctPyramidPays(columns, window) ? pctPyramid(columns) : undefined;
 *
 * @since next
 */
export function pctPyramidPays(
  columns: PctColumns,
  window: PctWindow,
): boolean {
  const { xs, length } = columns;
  return (
    lowerBound(xs, length, window.to) - lowerBound(xs, length, window.from) >
    PYRAMID_FROM
  );
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
 * The lowest and the highest reading strictly between `from` and `to`, or `null` when none is
 * there. With the `pyramid` of `columns` the range is read from whole runs, so the cost follows
 * the logarithm of the readings rather than the readings: an axis that rescales on every frame
 * of a pan does not walk the series (0100). A gap is no reading.
 *
 * @since 0.3.0
 */
export function pctRangeExtent(
  columns: PctColumns,
  from: number,
  to: number,
  pyramid?: PctPyramid,
): readonly [number, number] | null {
  const { xs, ys, length } = columns;
  const { levels, offset } =
    (pyramid?.length === length && LEVELS.get(pyramid)) || NO_LEVELS;
  const end = lowerBound(xs, length, to);
  let i = lowerBound(xs, length, from);
  while (i < end && xs[i] === from) i++;
  let min = Infinity;
  let max = -Infinity;
  const take = (j: number) => {
    // A gap's NaN is neither lower nor higher than anything.
    if (ys[j] < min) min = ys[j];
    if (ys[j] > max) max = ys[j];
  };
  while (i < end) {
    // The longest run that starts at `i` and ends before `end`.
    let k = 0;
    while (
      k < levels.length &&
      (i + offset) % 2 ** (k + 1) === 0 &&
      i + 2 ** (k + 1) <= end
    )
      k++;
    if (k === 0) take(i);
    else {
      const b = (i + offset) / 2 ** k;
      const lo = levels[k - 1].lo[b];
      if (lo >= 0) {
        take(lo - offset);
        take(levels[k - 1].hi[b] - offset);
      }
    }
    i += 2 ** k;
  }
  return min <= max ? [min, max] : null;
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
 * @since 0.3.0
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
  // A pyramid of other columns, or of these before they grew, is not read: the scan answers.
  const { levels, offset } =
    (pyramid?.length === length && LEVELS.get(pyramid)) || NO_LEVELS;
  const run = (k: number, b: number) => {
    const s = Math.max(i0 + 1, b * 2 ** k - offset);
    const e = Math.min(i1 - 1, (b + 1) * 2 ** k - 1 - offset);
    if (s > e) return;
    if (k === 0) return visit(s);
    const level = levels[k - 1];
    const whole =
      s === b * 2 ** k - offset && e === (b + 1) * 2 ** k - 1 - offset;
    if (whole && !level.gap[b] && columnOf(s) === columnOf(e)) {
      const l = level.lo[b] - offset;
      const h = level.hi[b] - offset;
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
    ys.subarray(i0 + 1, i1).forEach((_, j) => visit(i0 + 1 + j));
  } else {
    for (
      let b = Math.floor((i0 + 1 + offset) / 2 ** k);
      b <= Math.floor((i1 - 1 + offset) / 2 ** k);
      b++
    )
      run(k, b);
  }
  if (i1 > i0) visit(i1);
  flush();
  return {
    xs: Float64Array.from(outX),
    ys: Float64Array.from(outY),
    length: outX.length,
  };
}
