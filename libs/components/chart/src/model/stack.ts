/**
 * Where a stacked value stands: from the top of what is under it to its own end. A positive
 * value stacks up from zero on what is positive under it, a negative one down from zero on
 * what is negative, so a stack with both reads as two columns meeting at zero.
 *
 * @since next
 */
export interface PctStacked {
  readonly from: number;
  readonly to: number;
}

/**
 * The values of several series stacked at each position: `values[s][i]` is series `s` at
 * position `i`, `null` where it has none, and the answer has the same shape, `null` where
 * there is no bar. The order of the series is the order of the stack, the first at zero.
 *
 * @example
 * pctStack([[1, 2], [3, null]]); // [[{0→1}, {0→2}], [{1→4}, null]]
 *
 * @since next
 */
export function pctStack(
  values: readonly (readonly (number | null)[])[],
): readonly (readonly (PctStacked | null)[])[] {
  const positions = Math.max(0, ...values.map((v) => v.length));
  const up = new Array<number>(positions).fill(0);
  const down = new Array<number>(positions).fill(0);
  return values.map((series) =>
    Array.from({ length: positions }, (_, i) => {
      const value = series[i];
      // `null`, `undefined`, `NaN` and an infinity are no value alike.
      if (value === null || !Number.isFinite(value)) return null;
      if (value >= 0) {
        const from = up[i];
        up[i] += value;
        return { from, to: up[i] };
      }
      const from = down[i];
      down[i] += value;
      return { from, to: down[i] };
    }),
  );
}

/**
 * The lowest and the highest end of a stack over every position, with zero: what its value
 * axis has to show. `null` when nothing is stacked.
 *
 * @since next
 */
export function pctStackExtent(
  stacked: readonly (readonly (PctStacked | null)[])[],
): readonly [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const series of stacked)
    for (const bar of series) {
      if (!bar) continue;
      min = Math.min(min, bar.from, bar.to);
      max = Math.max(max, bar.from, bar.to);
    }
  return min <= max ? [min, max] : null;
}

/**
 * A series' place in a stack of columns: where it starts and where it ends at each position.
 *
 * @since next
 */
export interface PctStackColumns {
  readonly from: Float64Array;
  readonly to: Float64Array;
}

/**
 * Series of values at the same positions stacked: `values[s][i]` is series `s` at position
 * `i`, `NaN` where it has none — which counts as nothing in the stack, so the series above
 * stand where they would with a zero, and the series itself reads the gap. A positive value
 * stacks up on the positive ones under it, a negative one down. With `normalize`, each value
 * is its share of the position's total in percent, and a position whose total is zero is a
 * gap for every series.
 *
 * @since next
 */
export function pctStackColumns(
  values: readonly Float64Array[],
  normalize = false,
): readonly PctStackColumns[] {
  const positions = Math.max(0, ...values.map((v) => v.length));
  const up = new Float64Array(positions);
  const down = new Float64Array(positions);
  const total = new Float64Array(positions);
  if (normalize)
    for (const series of values)
      for (let i = 0; i < series.length; i++)
        if (Number.isFinite(series[i])) total[i] += Math.abs(series[i]);
  return values.map((series) => {
    const from = new Float64Array(positions);
    const to = new Float64Array(positions);
    for (let i = 0; i < positions; i++) {
      let value = i < series.length ? series[i] : NaN;
      if (normalize) value = total[i] > 0 ? (value / total[i]) * 100 : NaN;
      if (!Number.isFinite(value)) {
        from[i] = NaN;
        to[i] = NaN;
        continue;
      }
      if (value >= 0) {
        from[i] = up[i];
        up[i] += value;
        to[i] = up[i];
      } else {
        from[i] = down[i];
        down[i] += value;
        to[i] = down[i];
      }
    }
    return { from, to };
  });
}
