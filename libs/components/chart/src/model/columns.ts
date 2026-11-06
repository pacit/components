/**
 * The consumer's rows, read once into two columns of numbers. A mark draws from these and not
 * from the rows, because a frame walks them thousands of times and an object per reading is
 * what that walk cannot afford (0100).
 */

/**
 * The keys of `T` whose value is a `V`: what a mark's `x` and `y` accept as a column name, so
 * a misspelt key or a column of the wrong type fails to compile.
 *
 * @since 0.3.0
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
 * @since 0.3.0
 */
export type PctAccessor<T, V> = PctKey<T, V> | ((row: T, index: number) => V);

/**
 * Readings in two columns, ordered along `xs`. A `NaN` in `ys` is a gap: nothing was read from
 * there until the next reading.
 *
 * @since 0.3.0
 */
export interface PctColumns {
  readonly xs: Float64Array;
  readonly ys: Float64Array;
  readonly length: number;
}

/**
 * The function an accessor stands for.
 *
 * @since 0.3.0
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
 * @since 0.3.0
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

/** A finite reading, or the gap a value that is not one stands for. */
const valueOf = (y: unknown): number =>
  typeof y === 'number' && Number.isFinite(y) ? y : NaN;

/**
 * A reader of a series' rows into columns that keeps the rows it read last: when the next rows
 * are those with some dropped from the front and some added at the back — the same objects, in
 * the same order — only the rows added are read
 * ([0121](../../../../../docs/decisions/0121-live-data-is-read-where-it-changed.md)). Any other
 * rows are read whole, as `pctColumnsOf` reads them, and give the same columns.
 *
 * A row kept is not read again, so a row whose values change is a new object; and an accessor
 * that takes the row's index, whose answer moves with the rows dropped, reads every row every
 * time. The columns it hands out are never written over: the rows added go past the end of
 * every one handed out before.
 *
 * @example
 * const read = pctColumnsReader<Reading>();
 * const columns = computed(() => read(this.data(), 'at', 'value'));
 *
 * @since 0.3.1
 */
export function pctColumnsReader<T>(): (
  rows: readonly T[],
  x: PctAccessor<NoInfer<T>, number>,
  y: PctAccessor<NoInfer<T>, number | null | undefined>,
) => PctColumns {
  let last: readonly T[] = [];
  let lastX: unknown;
  let lastY: unknown;
  let xs = new Float64Array(0);
  let ys = new Float64Array(0);
  let start = 0;
  // Whether the last columns hold one reading for each row: a row left out breaks the count.
  let whole = false;
  let columns: PctColumns = { xs, ys, length: 0 };
  // An accessor by name, or a function of the row alone.
  const rowOnly = (accessor: unknown) =>
    typeof accessor !== 'function' || accessor.length < 2;
  return (rows, x, y) => {
    const readX = pctRead(x);
    const readY = pctRead(y);
    const drop =
      whole && x === lastX && y === lastY && rowOnly(x) && rowOnly(y)
        ? last.indexOf(rows[0])
        : -1;
    const kept = last.length - drop;
    let same = drop >= 0 && rows.length >= kept;
    for (let k = 0; same && k < kept; k++) same = rows[k] === last[drop + k];
    if (same) {
      const added = rows.length - kept;
      if (drop === 0 && added === 0) {
        last = rows;
        return columns;
      }
      let from = start + drop;
      if (from + rows.length > xs.length) {
        // Out of room: the readings kept move to new columns twice their size.
        const room = Math.max(64, 2 * rows.length);
        const nextXs = new Float64Array(room);
        const nextYs = new Float64Array(room);
        nextXs.set(xs.subarray(from, from + kept));
        nextYs.set(ys.subarray(from, from + kept));
        xs = nextXs;
        ys = nextYs;
        from = 0;
      }
      let at = from + kept;
      for (let i = kept; i < rows.length; i++) {
        const position = readX(rows[i], i);
        if (!Number.isFinite(position)) {
          same = false;
          break;
        }
        xs[at] = position;
        ys[at] = valueOf(readY(rows[i], i));
        at++;
      }
      if (same) {
        start = from;
        last = rows;
        columns = {
          xs: xs.subarray(start, at),
          ys: ys.subarray(start, at),
          length: at - start,
        };
        return columns;
      }
    }
    // Read whole: the first rows added after move the readings to columns with room.
    xs = new Float64Array(rows.length);
    ys = new Float64Array(rows.length);
    let length = 0;
    for (let i = 0; i < rows.length; i++) {
      const position = readX(rows[i], i);
      if (!Number.isFinite(position)) continue;
      xs[length] = position;
      ys[length] = valueOf(readY(rows[i], i));
      length++;
    }
    start = 0;
    whole = length === rows.length;
    last = rows;
    lastX = x;
    lastY = y;
    columns = {
      xs: xs.subarray(0, length),
      ys: ys.subarray(0, length),
      length,
    };
    return columns;
  };
}

/**
 * The index of the first reading whose position is below the one before it, or `-1` when the
 * columns are in order. A mark reports it in development rather than sorting: the rows must
 * come ordered (0099).
 *
 * @since 0.3.0
 */
export function pctFirstUnordered(columns: PctColumns): number {
  const { xs, length } = columns;
  for (let i = 1; i < length; i++) if (xs[i] < xs[i - 1]) return i;
  return -1;
}
