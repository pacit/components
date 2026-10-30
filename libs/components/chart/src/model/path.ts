import type { PctColumns } from './columns';
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
}

/** On the grid, written to two decimals at most: `1/3` of a pixel is not worth sixteen digits. */
const round = (v: number, pixel: number) =>
  Math.round(Math.round(v / pixel) * pixel * 100) / 100;

/** The points of a run between two gaps, written `x y`, and the run's first and last x. */
interface Run {
  readonly points: string[];
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
      run = { points: [], first: px, last: px, lastY: NaN };
      runs.push(run);
    } else if (run.last === px && run.lastY === py) return;
    run.points.push(`${px} ${py}`);
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
  return runsOf(columns, x, y, curve, options)
    .map(({ points }) =>
      points.length === 1
        ? `M${points[0]}L${points[0]}`
        : `M${points.join('L')}`,
    )
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
  const base = round(y.map(baseline), options.pixel ?? 1);
  return runsOf(columns, x, y, curve, options)
    .map(
      ({ points, first, last }) =>
        `M${first} ${base}L${points.join('L')}L${last} ${base}Z`,
    )
    .join('');
}
