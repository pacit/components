import type { PctAnyColumn } from './columns';

/**
 * Which way a column is sorted, in the words `aria-sort` takes, so the value a header holds is
 * the value a reader is told.
 *
 * @since next
 */
export type PctSortDirection = 'ascending' | 'descending';

/**
 * One key of an order: the column and which way.
 *
 * @since next
 */
export interface PctOrderKey<T> {
  readonly column: PctAnyColumn<T>;
  readonly direction: PctSortDirection;
}

/**
 * Whether a value is empty for ordering: `null`, `undefined`, `NaN` or an invalid date. An
 * empty value has nothing to compare, so it stands after every value in either direction.
 *
 * @since next
 */
export function pctIsEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  if (value instanceof Date) return Number.isNaN(value.getTime());
  return false;
}

/** Numbers, big integers and dates are read by their size; everything else as its text. */
function hasSize(value: unknown): value is number | bigint | Date {
  return (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    value instanceof Date
  );
}

/**
 * The default comparison of two values that are not empty.
 *
 * A value with a size — a number, a big integer, a date — comes before one without, and two
 * of them compare by size, across the three types too, so `2n` comes before `10` and two
 * infinities are equal. Everything else compares by `collator` over the text it prints, so
 * text stands in the locale's order, `item 9` comes before `item 10` when the collator is
 * numeric, and `false` before `true`. Sizes first and text after makes the order total, so
 * a column holding both still sorts the same way whatever order its rows came in.
 *
 * @since next
 */
export function pctCompareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number {
  const sizeA = hasSize(a);
  const sizeB = hasSize(b);
  if (sizeA && sizeB) return a < b ? -1 : a > b ? 1 : 0;
  if (sizeA !== sizeB) return sizeA ? -1 : 1;
  return collator.compare(String(a), String(b));
}

/**
 * The rows in the order the keys name, the first key first; the input is not changed.
 *
 * A key whose column says `sort: false` is skipped. The sort is stable, so rows the keys find
 * equal keep the order they came in, and a value that is empty stands after every other in
 * either direction, because "no reading" is not the smallest reading nor the largest. With
 * no key that orders, the same array comes back, so a `computed` over it sees no change.
 *
 * @example
 * pctOrderRows(rules, [{ column: energy, direction: 'descending' }], new Intl.Collator('pl', { numeric: true }));
 *
 * @since next
 */
export function pctOrderRows<T>(
  rows: readonly T[],
  keys: readonly PctOrderKey<T>[],
  collator: Intl.Collator,
): readonly T[] {
  const active = keys.filter((key) => key.column.sort !== false);
  if (active.length === 0) return rows;
  const readers = active.map(({ column, direction }) => {
    const sort = column.sort;
    const compare =
      typeof sort === 'function'
        ? (a: unknown, b: unknown) => sort(a, b)
        : (a: unknown, b: unknown) => pctCompareValues(a, b, collator);
    return {
      value: column.value,
      compare,
      descending: direction === 'descending',
    };
  });
  // Each value read once, and its emptiness with it, not once per comparison: a sort makes
  // n log n of those.
  const entries = rows.map((row) => {
    const values = readers.map((reader) => reader.value(row));
    return { row, values, empty: values.map(pctIsEmptyValue) };
  });
  entries.sort((x, y) => {
    for (let k = 0; k < readers.length; k++) {
      const emptyX = x.empty[k];
      const emptyY = y.empty[k];
      if (emptyX || emptyY) {
        if (emptyX && emptyY) continue;
        return emptyX ? 1 : -1;
      }
      // `NaN` from a comparison is no order, as `Array.prototype.sort` reads it, so the next
      // key is asked rather than the rows left as they came.
      const order = readers[k].compare(x.values[k], y.values[k]);
      if (order) return readers[k].descending ? -order : order;
    }
    // Equal under every key: `Array.prototype.sort` is stable, so the rows keep their order.
    return 0;
  });
  return entries.map((entry) => entry.row);
}
