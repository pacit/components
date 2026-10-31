import type { PctColumns } from './columns';
import { pctMonotoneTangents } from './monotone';
import type { PctScale } from './scale';
import type { PctCurve } from './value-at';

/**
 * How a path is written.
 *
 * @since next
 */
export interface PctPathOptions {
  /**
   * The grid the coordinates are rounded to, in CSS pixels: 1 by default, `1 / devicePixelRatio`
   * for a screen that draws half pixels. A point that rounds onto the one before it is dropped,
   * which is most of a dense window's points (0100, P2b).
   */
  readonly pixel?: number;
  /** How far the last reading holds on a step; the last reading's own position by default. */
  readonly end?: number;
  /**
   * Writes each point as `y x`: for a horizontal chart, where the x scale maps to the layer's
   * y and the value scale to its x.
   */
  readonly transpose?: boolean;
}

/** On the grid, written to two decimals at most: `1/3` of a pixel is not worth sixteen digits. */
const round = (v: number, pixel: number) =>
  Math.round(Math.round(v / pixel) * pixel * 100) / 100;

/** Two decimals, for a control point that stands between the grid's points. */
const two = (v: number) => Math.round(v * 100) / 100;

/** A run between two gaps: its points in the layer's pixels, `[x0, y0, x1, y1, …]`, and its first and last x. */
interface Run {
  readonly pts: number[];
  readonly first: number;
  last: number;
  lastY: number;
}

/**
 * Builds a path's runs: each run is the readings between two gaps, mapped and rounded, with a
 * step's corners already in it. A gap at a position ends a step there, so the value held until
 * the reading went missing, and ends a line at its last reading.
 */
function runsOf(
  columns: PctColumns,
  x: PctScale,
  y: PctScale,
  curve: PctCurve,
  options: PctPathOptions,
): Run[] {
  const pixel = options.pixel ?? 1;
  const { xs, ys, length } = columns;
  const runs: Run[] = [];
  let run: Run | null = null;
  const point = (px: number, py: number) => {
    if (run === null) {
      run = { pts: [], first: px, last: px, lastY: NaN };
      runs.push(run);
    } else if (run.last === px && run.lastY === py) return;
    run.pts.push(px, py);
    run.last = px;
    run.lastY = py;
  };
  let prevX = NaN;
  let prevY = NaN;
  for (let i = 0; i < length; i++) {
    const px = round(x.map(xs[i]), pixel);
    const py = round(y.map(ys[i]), pixel);
    // A gap, or a value the scale has no position for (zero on a logarithmic axis).
    if (!Number.isFinite(py)) {
      if (run !== null && curve === 'step') point(px, prevY);
      if (run !== null && curve === 'step-middle')
        point(round((prevX + px) / 2, pixel), prevY);
      run = null;
      prevY = NaN;
      continue;
    }
    // A previous reading in this run: a gap resets it to NaN.
    if (!Number.isNaN(prevY)) {
      if (curve === 'step') point(px, prevY);
      else if (curve === 'step-before') point(prevX, py);
      else if (curve === 'step-middle') {
        const mx = round((prevX + px) / 2, pixel);
        point(mx, prevY);
        point(mx, py);
      }
    }
    point(px, py);
    prevX = px;
    prevY = py;
  }
  const end = options.end;
  if (run !== null && end !== undefined && length > 0 && end > xs[length - 1]) {
    if (curve === 'step' || curve === 'step-middle')
      point(round(x.map(end), pixel), prevY);
  }
  return runs;
}

/** A point written for the path: `x y`, or `y x` on a turned chart. */
const write = (px: number, py: number, transpose: boolean) =>
  transpose ? `${py} ${px}` : `${px} ${py}`;

/**
 * The commands from a run's first point through the rest: a line to each, or the monotone
 * cubic through them — `reverse` walks the run from its last point, for the way back along the
 * bottom of a band. The curve is the same read either way: the tangents depend on the
 * neighbours alone.
 */
function segments(
  run: Run,
  curve: PctCurve,
  transpose: boolean,
  reverse = false,
): string {
  const n = run.pts.length / 2;
  const at = (k: number) => (reverse ? n - 1 - k : k) * 2;
  const px = (k: number) => run.pts[at(k)];
  const py = (k: number) => run.pts[at(k) + 1];
  let d = '';
  if (curve !== 'monotone' || n < 3) {
    for (let k = 1; k < n; k++) d += `L${write(px(k), py(k), transpose)}`;
    return d;
  }
  const xs = Array.from({ length: n }, (_, k) => px(k));
  const ys = Array.from({ length: n }, (_, k) => py(k));
  const m = pctMonotoneTangents(xs, ys);
  for (let k = 1; k < n; k++) {
    const h = (xs[k] - xs[k - 1]) / 3;
    d +=
      `C${write(two(xs[k - 1] + h), two(ys[k - 1] + m[k - 1] * h), transpose)} ` +
      `${write(two(xs[k] - h), two(ys[k] - m[k] * h), transpose)} ` +
      `${write(xs[k], ys[k], transpose)}`;
  }
  return d;
}

/** A run's first point, or its last when walked in reverse. */
const start = (run: Run, transpose: boolean, reverse = false) => {
  const at = reverse ? run.pts.length - 2 : 0;
  return write(run.pts[at], run.pts[at + 1], transpose);
};

/**
 * The `d` of a series' line. Coordinates are whole pixels (or the `pixel` grid), and a run of
 * one reading between two gaps is a dot: a move and a line back to itself, which a round cap
 * draws as a dot.
 *
 * @example
 * path.setAttribute('d', pctLinePath(drawn, xScale, yScale, 'step', { end: now }));
 *
 * @since next
 */
export function pctLinePath(
  columns: PctColumns,
  x: PctScale,
  y: PctScale,
  curve: PctCurve,
  options: PctPathOptions = {},
): string {
  const transpose = options.transpose === true;
  return runsOf(columns, x, y, curve, options)
    .map((run) => {
      const first = start(run, transpose);
      return run.pts.length === 2
        ? `M${first}L${first}`
        : `M${first}${segments(run, curve, transpose)}`;
    })
    .join('');
}

/**
 * The `d` of the area between a series and `baseline` (a value of `y`, usually 0 or the
 * domain's minimum): each run between two gaps closed down to the baseline on its own, so a
 * gap leaves no area under it.
 *
 * @since next
 */
export function pctAreaPath(
  columns: PctColumns,
  x: PctScale,
  y: PctScale,
  curve: PctCurve,
  baseline: number,
  options: PctPathOptions = {},
): string {
  const transpose = options.transpose === true;
  const base = round(y.map(baseline), options.pixel ?? 1);
  // The run closed to the baseline at both ends: below it, or beside it when transposed.
  const edge = (along: number) => write(along, base, transpose);
  return runsOf(columns, x, y, curve, options)
    .map(
      (run) =>
        `M${edge(run.first)}L${start(run, transpose)}${segments(run, curve, transpose)}L${edge(run.last)}Z`,
    )
    .join('');
}

/**
 * The `d` of the band between two series of values at the same positions — `columns` holds
 * the high values, `lows` the low ones — walked along the top and back along the bottom, each
 * run between two gaps closed on its own. A gap in either is a gap in both: a band has no
 * edge to stand on alone.
 *
 * @since next
 */
export function pctBandPath(
  columns: PctColumns,
  lows: Float64Array,
  x: PctScale,
  y: PctScale,
  curve: PctCurve,
  options: PctPathOptions = {},
): string {
  const transpose = options.transpose === true;
  const { xs, length } = columns;
  const highs = new Float64Array(length);
  const lowsMasked = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    const gap = Number.isNaN(columns.ys[i]) || Number.isNaN(lows[i]);
    highs[i] = gap ? NaN : columns.ys[i];
    lowsMasked[i] = gap ? NaN : lows[i];
  }
  const tops = runsOf({ xs, ys: highs, length }, x, y, curve, options);
  const bottoms = runsOf({ xs, ys: lowsMasked, length }, x, y, curve, options);
  return tops
    .map(
      (top, i) =>
        `M${start(top, transpose)}${segments(top, curve, transpose)}` +
        `L${start(bottoms[i], transpose, true)}${segments(bottoms[i], curve, transpose, true)}Z`,
    )
    .join('');
}
