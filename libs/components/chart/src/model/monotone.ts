/**
 * The tangents of a monotone cubic through the points `from` to `to` (exclusive) of a run
 * with no gap, after Fritsch and Carlson: between two readings the curve stays between their
 * values, so it never overshoots — a `smooth` curve that promises nothing would. The slopes
 * of the two neighbouring segments are averaged with their lengths as weights and clipped to
 * the smaller of them; where they disagree in sign the tangent is zero; the ends take the
 * one-sided slope corrected by the neighbour's tangent, which keeps the slope's sign because the
 * neighbour's tangent is at most twice the slope.
 *
 * @since next
 */
export function pctMonotoneTangents(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  from = 0,
  to = xs.length,
): Float64Array {
  const n = to - from;
  const m = new Float64Array(Math.max(0, n));
  if (n < 2) return m;
  const slope = (i: number) =>
    (ys[from + i + 1] - ys[from + i]) / (xs[from + i + 1] - xs[from + i]);
  const width = (i: number) => xs[from + i + 1] - xs[from + i];
  for (let i = 1; i < n - 1; i++) {
    const s0 = slope(i - 1);
    const s1 = slope(i);
    const h0 = width(i - 1);
    const h1 = width(i);
    const p = (s0 * h1 + s1 * h0) / (h0 + h1);
    m[i] =
      s0 * s1 <= 0
        ? 0
        : (Math.sign(s0) + Math.sign(s1)) *
          Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
  }
  m[0] = endTangent(slope(0), n === 2 ? slope(0) : m[1]);
  m[n - 1] = endTangent(slope(n - 2), n === 2 ? slope(n - 2) : m[n - 2]);
  return m;
}

/** The tangent at a run's end: the segment's slope corrected by the next tangent. */
function endTangent(s: number, next: number): number {
  return (3 * s - next) / 2;
}

/**
 * The value of the cubic between (`x0`, `y0`) and (`x1`, `y1`) with the tangents `m0` and `m1`
 * at `x`: the same curve the path draws between two readings.
 *
 * @since next
 */
export function pctHermite(
  x0: number,
  y0: number,
  m0: number,
  x1: number,
  y1: number,
  m1: number,
  x: number,
): number {
  const h = x1 - x0;
  const t = (x - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * m1
  );
}
