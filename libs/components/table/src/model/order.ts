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

/**
 * The default comparison of two values that are not empty.
 *
 * Numbers, big integers and dates by their size; everything else by `collator` over the
 * strings the values print, so text stands in the locale's order, `item 9` comes before
 * `item 10` when the collator is numeric, `false` comes before `true`, and two values of
 * different types still have an order.
 *
 * @since next
 */
export function pctCompareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'bigint' && typeof b === 'bigint')
    return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
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
  // Each value read once, not once per comparison: a sort makes n log n of those.
  const entries = rows.map((row) => ({
    row,
    values: readers.map((reader) => reader.value(row)),
  }));
  entries.sort((x, y) => {
    for (const [k, reader] of readers.entries()) {
      const a = x.values[k];
      const b = y.values[k];
      const emptyA = pctIsEmptyValue(a);
      const emptyB = pctIsEmptyValue(b);
      if (emptyA || emptyB) {
        if (emptyA && emptyB) continue;
        return emptyA ? 1 : -1;
      }
      const order = reader.compare(a, b);
      if (order !== 0) return reader.descending ? -order : order;
    }
    // Equal under every key: `Array.prototype.sort` is stable, so the rows keep their order.
    return 0;
  });
  return entries.map((entry) => entry.row);
}
