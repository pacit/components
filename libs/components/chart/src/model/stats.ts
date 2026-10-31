import type { PctScale } from './scale';
import { pctNiceStep } from './ticks';

/**
 * One bin of a histogram: the values from `from` up to `to` — the last bin takes its end too —
 * and how many fell in it.
 *
 * @since next
 */
export interface PctBin {
  readonly from: number;
  readonly to: number;
  readonly count: number;
}

/**
 * How the bins are chosen: a count, a rule for one — Sturges' from the number of values,
 * Freedman–Diaconis' from their spread — or the edges themselves, in order.
 *
 * @since next
 */
export type PctBinning =
  number | 'sturges' | 'freedman-diaconis' | readonly number[];

/**
 * The values counted into bins of one width, the width a round number near the rule's: the
 * recipe of a histogram, drawn as `pct-bars` on a `band` axis whose categories are the bins.
 * A value that is not a finite number is left out; with explicit edges, so is one outside them.
 *
 * @example
 * pctBin([1, 2, 2, 3, 7, 8], 'sturges'); // [{0→2: 1}, {2→4: 3}, {4→6: 0}, {6→8: 2}]
 *
 * @since next
 */
export function pctBin(
  values: readonly number[],
  bins: PctBinning = 'sturges',
): readonly PctBin[] {
  const finite = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const n = finite.length;
  if (n === 0) return [];
  if (typeof bins === 'object') {
    const edges = [...bins]
      .filter((e) => Number.isFinite(e))
      .sort((a, b) => a - b);
    const out = edges
      .slice(1)
      .map((to, i) => ({ from: edges[i], to, count: 0 }));
    for (const v of finite) {
      const at = out.findIndex(
        (b, i) =>
          v >= b.from && (v < b.to || (i === out.length - 1 && v === b.to)),
      );
      if (at >= 0) out[at] = { ...out[at], count: out[at].count + 1 };
    }
    return out;
  }
  const min = finite[0];
  const max = finite[n - 1];
  const sturges = Math.ceil(Math.log2(n)) + 1;
  let count = sturges;
  if (typeof bins === 'number') count = Math.max(1, Math.floor(bins));
  else if (bins === 'freedman-diaconis') {
    const iqr = quantile(finite, 0.75) - quantile(finite, 0.25);
    const width = (2 * iqr) / Math.cbrt(n);
    count = width > 0 ? Math.ceil((max - min) / width) : sturges;
  }
  if (max === min) return [{ from: min, to: min, count: n }];
  const step = pctNiceStep(max - min, count);
  const from = Math.floor(min / step + 1e-9) * step;
  const to = Math.ceil(max / step - 1e-9) * step;
  const k = Math.max(1, Math.round((to - from) / step));
  const counts = new Array<number>(k).fill(0);
  for (const v of finite)
    counts[Math.min(k - 1, Math.floor((v - from) / step + 1e-9))]++;
  return counts.map((c, i) => ({
    from: clean(from + i * step),
    to: clean(from + (i + 1) * step),
    count: c,
  }));
}

/** A value of the bin grid written without the dust of floating-point arithmetic. */
const clean = (v: number) => Number(v.toPrecision(12));

/** The `p`-th quantile of sorted values, interpolated between the two nearest (R's type 7). */
function quantile(sorted: readonly number[], p: number): number {
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/**
 * The five numbers of a box and the values outside them: the quartiles, the median, the
 * whiskers at the farthest values within one and a half interquartile ranges of the box, and
 * the outliers past them.
 *
 * @since next
 */
export interface PctQuantiles {
  readonly low: number;
  readonly q1: number;
  readonly median: number;
  readonly q3: number;
  readonly high: number;
  readonly outliers: readonly number[];
}

/**
 * The quantiles of the finite values among `values`, or `null` for none: a box plot's numbers.
 *
 * @example
 * pctQuantiles([1, 2, 3, 4, 100]); // { low: 1, q1: 2, median: 3, q3: 4, high: 4, outliers: [100] }
 *
 * @since next
 */
export function pctQuantiles(values: readonly number[]): PctQuantiles | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const reach = 1.5 * (q3 - q1);
  const inside = sorted.filter((v) => v >= q1 - reach && v <= q3 + reach);
  return {
    low: inside[0],
    q1,
    median,
    q3,
    high: inside[inside.length - 1],
    outliers: sorted.filter((v) => v < q1 - reach || v > q3 + reach),
  };
}

/**
 * The smallest distance in pixels between two neighbouring positions, which bounds the width
 * a candle or a box may take without touching the next; `Infinity` for fewer than two.
 *
 * @since next
 */
export function pctSpacing(
  positions: ArrayLike<number>,
  scale: PctScale,
): number {
  let least = Infinity;
  for (let i = 1; i < positions.length; i++) {
    const gap = Math.abs(scale.map(positions[i]) - scale.map(positions[i - 1]));
    if (gap > 0) least = Math.min(least, gap);
  }
  return least;
}
