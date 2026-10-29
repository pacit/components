/**
 * The consumer's rows, read once into two columns of numbers. A mark draws from these and not
 * from the rows, because a frame walks them thousands of times and an object per reading is
 * what that walk cannot afford (0100).
 */

/**
 * The keys of `T` whose value is a `V`: what a mark's `x` and `y` accept as a column name, so
 * a misspelt key or a column of the wrong type fails to compile.
 *
 * @since next
 */
export type PctKey<T, V> = keyof {
  // `as` makes the mapping a filter of keys rather than a homomorphic map: over a tuple or an
  // array the homomorphic form maps the elements and lets the array's methods into the union.
  [K in keyof T as T[K] extends V ? K : never]: unknown;
};

/**
 * A coordinate read from a row: a column of the right type, or a function of the row and its
 * index.
 *
 * @since next
 */
export type PctAccessor<T, V> = PctKey<T, V> | ((row: T, index: number) => V);

/**
 * Readings in two columns, ordered along `xs`. A `NaN` in `ys` is a gap: nothing was read from
 * there until the next reading.
 *
 * @since next
 */
export interface PctColumns {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly length: number;
}

/**
 * The function an accessor stands for.
 *
 * @since next
 */
export function pctRead<T, V>(
  accessor: PctAccessor<T, V>,
): (row: T, index: number) => V {
  return typeof accessor === 'function'
    ? accessor
    : (row) => row[accessor] as V;
}

/**
 * The rows' columns, a value that is not a finite number (`null`, `undefined`, `NaN`, an
 * infinity) read as a gap. `T` is read off the rows alone, and the accessors are held to it, so a
 * function accessor gets its row's type ([0010](../../../../../docs/decisions/0010-generic-noinfer.md)).
 * A row whose position is not a finite number is left out, because it has nowhere to stand.
 *
 * @example
 * pctColumnsOf(readings, 'at', 'value');
 * pctColumnsOf(pairs, (p) => p[0], (p) => p[1]);
 *
 * @since next
 */
export function pctColumnsOf<T>(
  rows: readonly T[],
  x: PctAccessor<NoInfer<T>, number>,
  y: PctAccessor<NoInfer<T>, number | null | undefined>,
): PctColumns {
  const readX = pctRead(x);
  const readY = pctRead(y);
  const xs = new Float64Array(rows.length);
  const ys = new Float64Array(rows.length);
  let length = 0;
  for (let i = 0; i < rows.length; i++) {
    const at = readX(rows[i], i);
    if (!Number.isFinite(at)) continue;
    xs[length] = at;
    const y = readY(rows[i], i);
    ys[length] = typeof y === 'number' && Number.isFinite(y) ? y : NaN;
    length++;
  }
  return {
    xs: xs.subarray(0, length),
    ys: ys.subarray(0, length),
    length,
  };
}

/**
 * The index of the first reading whose position is below the one before it, or `-1` when the
 * columns are in order. A mark reports it in development rather than sorting: the rows must
 * come ordered (0099).
 *
 * @since next
 */
export function pctFirstUnordered(columns: PctColumns): number {
  const { xs, length } = columns;
  for (let i = 1; i < length; i++) if (xs[i] < xs[i - 1]) return i;
  return -1;
}
